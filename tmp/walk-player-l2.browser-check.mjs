// Run from the repository root: node src/game/dev/WalkLayoutEditor.browser-check.mjs
// Uses the installed Edge and the actual Vite app. No replacement renderer or dependencies.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';

const baseURL = 'http://localhost:8080';
const edgePath = process.env.WALK_EDGE_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
await fs.access(edgePath);
await fs.mkdir(path.resolve('tmp'), { recursive: true });
const baselineMode = process.argv.includes('--baseline');
const protectedFiles = [
    'src/game/objects/Player.js', 'src/game/main.js', 'src/game/scenes/Preloader.js',
    'src/game/systems/WalkVisualBuilder.js', 'src/game/dev/WalkLayoutEditor.js', 'src/game/dev/WalkLayoutDraft.js',
    'src/game/data/walkStage18Map.json', 'public/assets/walk/walk-prototype-layout.json',
    'src/game/data/walkVisualConfig.js', 'src/game/data/walkAssetCatalog.js',
    ...(await fs.readdir('public/assets/walk', { recursive: true })).filter(f => f.endsWith('.png')).map(f => path.join('public/assets/walk', f))
];
const hashes = async () => Object.fromEntries(await Promise.all(protectedFiles.map(async file => [file,
    createHash('sha256').update(await fs.readFile(file)).digest('hex')])));
const originalFiles = await hashes();
const output = path.resolve('tmp/walk-player-l2-validation');
await fs.mkdir(output, { recursive: true });
// Browser lock files must stay outside Vite's watched workspace (Windows EBUSY).
const profile = await fs.mkdtemp(path.join(tmpdir(), 'walk-layout-editor-edge-'));
const downloads = path.join(output, 'downloads');
await fs.mkdir(downloads, { recursive: true });
const edge = spawn(edgePath, [
    '--headless=new', '--remote-debugging-port=0', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--enable-unsafe-swiftshader',
    '--window-size=1600,1000', `--user-data-dir=${profile}`, 'about:blank'
], { windowsHide: true, stdio: 'ignore' });
const pause = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function until(action, message) {
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
        try { const value = await action(); if (value) return value; } catch { /* startup/navigation */ }
        await pause(200);
    }
    throw new Error(message);
}
const sockets = [];
async function connect(url) {
    const ws = new WebSocket(url);
    sockets.push(ws);
    await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
    let counter = 0;
    const pending = new Map();
    const events = [];
    ws.addEventListener('message', ({ data }) => {
        const message = JSON.parse(data);
        if (message.id) {
            const callback = pending.get(message.id);
            pending.delete(message.id);
            if (callback) message.error ? callback.reject(new Error(JSON.stringify(message.error))) : callback.resolve(message.result);
        } else events.push(message);
    });
    return {
        events,
        send(method, params = {}) {
            return new Promise((resolve, reject) => {
                const id = ++counter;
                pending.set(id, { resolve, reject });
                ws.send(JSON.stringify({ id, method, params }));
            });
        }
    };
}

let browser;
let page;
try {
    const portFile = await until(() => fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8'), 'Edge did not expose its debug endpoint');
    const [port, endpoint] = portFile.trim().split(/\r?\n/);
    browser = await connect(`ws://127.0.0.1:${port}${endpoint}`);
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    page = await connect(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
    console.log(`Edge connected. Testing ${baseURL}`);
    await page.send('Page.enable');
    await page.send('Runtime.enable');
    await page.send('Log.enable');
    await browser.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true });
    async function evaluate(expression) {
        const result = await page.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? JSON.stringify(result.exceptionDetails));
        return result.result.value;
    }
    // Obtain the real scene instance without adding a test global to application source.
    async function attach(className, modulePath) {
        const result = await page.send('Runtime.evaluate', { expression: `import('/src/game/scenes/Intro.js').then(module => module.Intro.prototype)`, awaitPromise: true });
        if (!result.result.objectId) return false;
        const instances = await page.send('Runtime.queryObjects', { prototypeObjectId: result.result.objectId });
        const attached = await page.send('Runtime.callFunctionOn', {
            objectId: instances.objects.objectId,
            functionDeclaration: 'function(key){ window.__checkedScene = this.map(s => s.sys?.game?.scene?.keys?.[key]).find(s => s?.sys?.isActive()); return Boolean(window.__checkedScene); }',
            arguments: [{ value: className }],
            returnByValue: true
        });
        return attached.result.value;
    }
    const snapshot = () => evaluate(`__checkedScene.children.list.filter(o => o.texture).map(o => ({ key:o.texture.key,frame:o.frame.name,x:o.x,y:o.y,scaleX:o.scaleX,scaleY:o.scaleY,originX:o.originX,originY:o.originY,depth:o.depth }))`);

    const camera = () => evaluate(`(() => {const c=__checkedScene.cameras.main;return {x:c.x,y:c.y,width:c.width,height:c.height,scrollX:c.scrollX,scrollY:c.scrollY,zoom:c.zoom,bounds:{x:c._bounds.x,y:c._bounds.y,width:c._bounds.width,height:c._bounds.height}}})()`);
    const capture = async (name) => {
        await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
        const shot=await page.send('Page.captureScreenshot',{format:'png'});
        await fs.writeFile(path.join(output,name),Buffer.from(shot.data,'base64'));
    };

    const waitFrames = (count) => evaluate(`new Promise(resolve => { let n = 0; const tick = () => ++n >= ${count} ? resolve() : requestAnimationFrame(tick); requestAnimationFrame(tick); })`);
    const state = () => evaluate(`(() => { const p=__checkedScene.player,b=p.body; return {
        x:p.x,y:p.y,depth:p.depth,vx:b.velocity.x,vy:b.velocity.y,speed:Math.hypot(b.velocity.x,b.velocity.y),
        animation:p.anims.currentAnim?.key??null,playing:p.anims.isPlaying,frame:Number(p.frame.name),
        ultimaDirecao:p.ultimaDirecao,body:{x:b.x,y:b.y,right:b.right,bottom:b.bottom},
        collideWorldBounds:b.collideWorldBounds
    }; })()`);
    const resetPlayer = async (x=800,y=600) => {
        await evaluate(`(() => { const p=__checkedScene.player; p.body.reset(${x},${y}); p.anims.stop(); p.ultimaDirecao='baixo'; p.setFrame(0); p.setDepth(p.y); })()`);
        await waitFrames(2);
    };
    const keys = {
        W:{key:'w',code:'KeyW',vk:87}, A:{key:'a',code:'KeyA',vk:65},
        S:{key:'s',code:'KeyS',vk:83}, D:{key:'d',code:'KeyD',vk:68},
        ArrowUp:{key:'ArrowUp',code:'ArrowUp',vk:38}, ArrowLeft:{key:'ArrowLeft',code:'ArrowLeft',vk:37},
        ArrowDown:{key:'ArrowDown',code:'ArrowDown',vk:40}, ArrowRight:{key:'ArrowRight',code:'ArrowRight',vk:39}
    };
    const keyEvent = (name,type) => page.send('Input.dispatchKeyEvent',{
        type,key:keys[name].key,code:keys[name].code,
        windowsVirtualKeyCode:keys[name].vk,nativeVirtualKeyCode:keys[name].vk
    });
    const close = (actual,expected,label,tolerance=0.75) => assert.ok(Math.abs(actual-expected)<=tolerance,`${label}: ${actual} != ${expected}`);
    const directionCases = [
        ['W',0,-1,'walk-player-cima',12,'cima'], ['A',-1,0,'walk-player-esquerda',4,'esquerda'],
        ['S',0,1,'walk-player-baixo',0,'baixo'], ['D',1,0,'walk-player-direita',8,'direita'],
        ['ArrowUp',0,-1,'walk-player-cima',12,'cima'], ['ArrowLeft',-1,0,'walk-player-esquerda',4,'esquerda'],
        ['ArrowDown',0,1,'walk-player-baixo',0,'baixo'], ['ArrowRight',1,0,'walk-player-direita',8,'direita']
    ];

    await page.send('Page.navigate',{url:baseURL+'/'});
    await until(()=>attach('Intro'),'Normal route did not start Intro');
    console.log('PASS normal route -> Intro');
    await page.send('Page.navigate',{url:baseURL+'/?walkLearning'});
    await until(()=>attach('WalkGameLearning'),'WalkGameLearning did not start');
    await page.send('Page.bringToFront'); await waitFrames(3);
    const baseline=JSON.parse(await fs.readFile('tmp/walk-player-l1-validation/baseline.json','utf8'));
    const initial=await snapshot();
    assert.deepEqual(initial.filter(o=>o.key!=='walk-player'),baseline.learning,'Frozen layout changed');
    assert.equal(initial.filter(o=>o.key==='walk-player').length,1,'Player count');
    assert.deepEqual(await evaluate('({width:__checkedScene.physics.world.bounds.width,height:__checkedScene.physics.world.bounds.height})'),{width:1600,height:896});
    assert.equal(await evaluate('__checkedScene.physics.world.bodies.size'),1,'Only player has a physics body');

    const directionalResults={};
    for(const [name,dx,dy,animation,idleFrame,last] of directionCases){
        await resetPlayer(); const before=await state();
        await keyEvent(name,'rawKeyDown'); await waitFrames(8); const moving=await state();
        await keyEvent(name,'keyUp'); await waitFrames(3); const idle=await state();
        close(moving.vx,dx*200,name+' vx'); close(moving.vy,dy*200,name+' vy'); close(moving.speed,200,name+' speed');
        assert.equal(moving.animation,animation,name+' animation'); assert.equal(moving.playing,true,name+' animation playing');
        assert.ok(dx===0 || Math.sign(moving.x-before.x)===dx,name+' x direction');
        assert.ok(dy===0 || Math.sign(moving.y-before.y)===dy,name+' y direction');
        close(idle.speed,0,name+' released speed',0.01); assert.equal(idle.playing,false,name+' animation stopped');
        assert.equal(idle.frame,idleFrame,name+' idle frame'); assert.equal(idle.ultimaDirecao,last,name+' last direction');
        close(idle.depth,idle.y,name+' depth follows feet',0.01);
        directionalResults[name]={moving,idle}; console.log('PASS '+name);
    }

    const diagonalCases = [
        [['W','A'],-1,-1,'walk-player-cima',12], [['W','D'],1,-1,'walk-player-cima',12],
        [['S','A'],-1,1,'walk-player-baixo',0], [['S','D'],1,1,'walk-player-baixo',0]
    ];
    const diagonalResults={};
    for(const [names,dx,dy,animation,idleFrame] of diagonalCases){
        await resetPlayer(); for(const name of names) await keyEvent(name,'rawKeyDown');
        await waitFrames(8); const moving=await state();
        for(const name of names) await keyEvent(name,'keyUp');
        await waitFrames(3); const idle=await state();
        close(moving.speed,200,names.join('+')+' normalized speed');
        close(Math.abs(moving.vx),200/Math.sqrt(2),names.join('+')+' |vx|');
        close(Math.abs(moving.vy),200/Math.sqrt(2),names.join('+')+' |vy|');
        assert.equal(Math.sign(moving.vx),dx); assert.equal(Math.sign(moving.vy),dy);
        assert.equal(moving.animation,animation,names.join('+')+' vertical animation priority');
        close(idle.speed,0,names.join('+')+' released speed',0.01); assert.equal(idle.frame,idleFrame);
        diagonalResults[names.join('+')]={moving,idle}; console.log('PASS diagonal '+names.join('+'));
    }

    await resetPlayer();
    await keyEvent('W','rawKeyDown'); await waitFrames(3); assert.equal((await state()).animation,'walk-player-cima');
    await keyEvent('W','keyUp'); await keyEvent('D','rawKeyDown'); await waitFrames(3); assert.equal((await state()).animation,'walk-player-direita');
    await keyEvent('D','keyUp'); await keyEvent('S','rawKeyDown'); await waitFrames(3); assert.equal((await state()).animation,'walk-player-baixo');
    await keyEvent('S','keyUp'); await keyEvent('A','rawKeyDown'); await waitFrames(3); assert.equal((await state()).animation,'walk-player-esquerda');
    await keyEvent('A','keyUp'); await waitFrames(3);
    const rapidIdle=await state(); assert.equal(rapidIdle.frame,4); close(rapidIdle.speed,0,'rapid release',0.01);
    console.log('PASS rapid direction changes and release');

    await resetPlayer(800,832);
    await keyEvent('S','rawKeyDown'); await waitFrames(90); await keyEvent('S','keyUp'); await waitFrames(3);
    const bounded=await state(); assert.equal(bounded.collideWorldBounds,true);
    assert.ok(bounded.body.bottom<=896.01,`body bottom escaped: ${bounded.body.bottom}`);
    assert.ok(bounded.body.x>=-0.01 && bounded.body.right<=1600.01 && bounded.body.y>=-0.01);
    console.log('PASS physical world bounds 1600x896');

    await resetPlayer(800,832);
    const shot=await page.send('Page.captureScreenshot',{format:'png'});
    await fs.writeFile(path.join(output,'walk-player-l2.png'),Buffer.from(shot.data,'base64'));

    await page.send('Page.navigate',{url:baseURL+'/?walkLayoutEditor'});
    await until(()=>attach('WalkLayoutEditor'),'WalkLayoutEditor did not start');
    await until(()=>evaluate('Boolean(__checkedScene.draft && document.querySelector("aside"))'),'Editor did not initialize');
    await waitFrames(3); assert.deepEqual(await snapshot(),baseline.learning,'Editor or frozen layout changed');
    assert.equal(await evaluate('__checkedScene.draft.records.length'),28);
    console.log('PASS ?walkLayoutEditor and frozen layout');

    const errors=page.events.filter(e=>e.method==='Runtime.exceptionThrown' ||
        (e.method==='Runtime.consoleAPICalled'&&e.params.type==='error') ||
        (e.method==='Log.entryAdded'&&e.params.entry.level==='error'));
    assert.deepEqual(errors,[],'Console/browser errors');
    assert.deepEqual(await hashes(),originalFiles,'Browser validation mutated protected files');
    const report={passed:true,url:baseURL+'/?walkLearning',
        routes:{normal:'Intro',walkLearning:'WalkGameLearning',walkLayoutEditor:'WalkLayoutEditor'},
        tests:{directions:Object.keys(directionalResults),diagonals:Object.keys(diagonalResults),
            stopOnRelease:true,rapidDirectionChanges:true,animations:true,lastDirection:true,
            depthByFeetY:true,worldBounds:{width:1600,height:896},layoutUnchanged:true},
        consoleErrors:[],screenshot:path.join(output,'walk-player-l2.png')};
    await fs.writeFile(path.join(output,'validation-report.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));
} catch (error) {
    console.error(error);
    if (page) {
        console.error(JSON.stringify(page.events.filter(e=>['Runtime.exceptionThrown','Log.entryAdded'].includes(e.method)).slice(-10),null,2));
        const shot = await page.send('Page.captureScreenshot', { format: 'png' }).catch(()=>null);
        if (shot) await fs.writeFile(path.join(output,'failure.png'),Buffer.from(shot.data,'base64'));
        console.error(`Failure screenshot: ${path.join(output,'failure.png')}`);
    }
    process.exitCode = 1;
} finally {
    if (browser) await browser.send('Browser.close').catch(()=>{});
    sockets.forEach(ws=>ws.close());
    edge.kill();
}
