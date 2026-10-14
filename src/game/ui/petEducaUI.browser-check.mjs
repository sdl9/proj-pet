// Start npm run dev-nolog, then: node src/game/ui/petEducaUI.browser-check.mjs
// Uses the installed Edge and the actual Vite app. No replacement renderer or dependencies.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';

const baseURL = process.env.PET_EDUCA_URL ?? 'http://127.0.0.1:8080';
const edgePath = process.env.PET_EDUCA_EDGE_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
await fs.access(edgePath);
await fs.mkdir(path.resolve('tmp'), { recursive: true });
const protectedFiles = [
    'src/game/data/walkStage18Map.json', 'public/assets/walk/walk-prototype-layout.json',
    'src/game/data/walkVisualConfig.js', 'src/game/scenes/WalkGameLearning.js',
    'src/game/scenes/FoodGame.js', 'src/game/main.js', 'src/game/dev/WalkLayoutEditor.js',
    ...(await fs.readdir('public/assets/walk', { recursive: true })).filter(f => f.endsWith('.png')).map(f => path.join('public/assets/walk', f))
];
const hashes = async () => Object.fromEntries(await Promise.all(protectedFiles.map(async file => [file,
    createHash('sha256').update(await fs.readFile(file)).digest('hex')])));
const originalFiles = await hashes();
const output = await fs.mkdtemp(path.resolve('tmp/pet-educa-check-'));
// Browser lock files must stay outside Vite's watched workspace (Windows EBUSY).
const profile = await fs.mkdtemp(path.join(tmpdir(), 'pet-educa-edge-'));
const downloads = path.join(output, 'downloads');
await fs.mkdir(downloads);
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
    await page.send('Network.enable');
    await page.send('Emulation.setDeviceMetricsOverride', {width:1280,height:720,deviceScaleFactor:1,mobile:false});
    await browser.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true });
    async function evaluate(expression) {
        const result = await page.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? JSON.stringify(result.exceptionDetails));
        return result.result.value;
    }
    // Obtain the real scene instance without adding a test global to application source.
    async function attach(className, modulePath) {
        const result = await page.send('Runtime.evaluate', { expression: `import('${modulePath}').then(module => module.${className}.prototype)`, awaitPromise: true });
        if (!result.result.objectId) return false;
        const instances = await page.send('Runtime.queryObjects', { prototypeObjectId: result.result.objectId });
        const attached = await page.send('Runtime.callFunctionOn', {
            objectId: instances.objects.objectId,
            functionDeclaration: 'function(){ window.__checkedScene = this.find(s => s.game?.isBooted); return Boolean(window.__checkedScene); }',
            returnByValue: true
        });
        return attached.result.value;
    }
    const ensureGame = async () => {
        if (!await evaluate('Boolean(window.__petEducaGame)')) {
            // Boot não muda com o HMR das telas. Obter as cenas pelo manager real
            // evita consultar o protótipo de outra versão do módulo.
            await until(()=>attach('Boot','/src/game/scenes/Boot.js'),'Game did not boot');
            await evaluate('void(window.__petEducaGame=__checkedScene.game)');
        }
    };
    const waitScene = async (key) => {
        await ensureGame();
        await until(()=>evaluate('(()=>{const s=__petEducaGame.scene.keys['+JSON.stringify(key)+'];if(!s?.sys.isActive())return false;window.__checkedScene=s;return true})()'),key+' did not start');
        if (['Intro','MainMenu'].includes(key)) {
            await until(() => evaluate('__checkedScene.children.list.some(o => o.text === "Pet Educa")'), 'UI not ready');
        }
        await evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
    };
    const active = () => evaluate('__checkedScene.scene.manager.getScenes(true).map(s=>s.sys.settings.key)');
    const screenshot = async (name) => {
        const shot = await page.send('Page.captureScreenshot', {format:'png'});
        await fs.writeFile(path.join(output, name), Buffer.from(shot.data,'base64'));
    };
    const geometry = () => evaluate('({images:__checkedScene.children.list.filter(o=>o.type==="Image").map(o=>({key:o.texture.key,x:o.x,y:o.y,width:o.width,height:o.height,originX:o.originX,originY:o.originY,interactive:!!o.input?.enabled})),texts:__checkedScene.children.list.filter(o=>o.type==="Text").map(o=>({text:o.text,font:o.style.fontFamily,weight:o.style.fontStyle,size:o.style.fontSize,bounds:o.getBounds(),interactive:!!o.input?.enabled})),count:__checkedScene.children.length,keydown:__checkedScene.input.keyboard.listenerCount("keydown")})');
    const point = (x,y) => evaluate('(()=>{const r=__checkedScene.game.canvas.getBoundingClientRect();return {x:r.left+'+x+'*r.width/1280,y:r.top+'+y+'*r.height/720}})()');
    const click = async (x,y,touch=false) => {
        const p = await point(x,y);
        if (touch) {
            await page.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1,radiusX:1,radiusY:1}]});
            await page.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        } else {
            await page.send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',buttons:1,clickCount:1});
            await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',buttons:0,clickCount:1});
        }
        await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
    };
    const key = async (code, key, virtual) => {
        await page.send('Input.dispatchKeyEvent',{type:'keyDown',code,key,windowsVirtualKeyCode:virtual});
        await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
        await page.send('Input.dispatchKeyEvent',{type:'keyUp',code,key,windowsVirtualKeyCode:virtual});
    };
    const returnMenu = async () => {
        await evaluate('void __checkedScene.scene.start("MainMenu")');
        await waitScene('MainMenu');
    };
    const assertFrame = async () => {
        const frame = await evaluate('(()=>{const c=__checkedScene.game.canvas,r=c.getBoundingClientRect();return {w:c.width,h:c.height,x:r.x,y:r.y,displayW:r.width,displayH:r.height,viewportW:innerWidth,viewportH:innerHeight}})()');
        assert.equal(frame.w,1280); assert.equal(frame.h,720);
        assert.ok(Math.abs(frame.displayW/frame.displayH-1280/720)<0.002);
        assert.ok(frame.x>=-1 && frame.y>=-1 && frame.x+frame.displayW<=frame.viewportW+1 && frame.y+frame.displayH<=frame.viewportH+1);
        return frame;
    };
    await page.send('Page.navigate',{url:baseURL+'/'});
    await waitScene('Intro');
    const intro = await geometry();
    assert.deepEqual(await active(),['Intro']);
    assert.deepEqual(await evaluate('Array.from(document.fonts).map(f=>({family:f.family,status:f.status,weight:f.weight}))'),[
        {family:'Lilita One',status:'loaded',weight:'400'}, {family:'Nunito Sans',status:'loaded',weight:'200 900'}
    ]);
    const expectedImages = [
        ['park',0,0,1280,720],['dog',940,364,272,288],['panel',128,192,752,432],['button',364,516,280,96]
    ];
    assert.deepEqual(intro.images.map(o=>[o.key.replace('pet-educa-ui-',''),o.x,o.y,o.width,o.height]),expectedImages);
    assert.ok(intro.images.every(o=>o.originX===0&&o.originY===0));
    const exactIntro = ['Pet Educa','Pet Educa é um jogo educativo\ndesenvolvido em colaboração entre o projeto\nFeevalePet, da Universidade Feevale,\ne a aluna Laíssa Dornelles Salles.','Criado sem fins lucrativos, convida todos\na aprender sobre os animais brincando.','Boa diversão!','Menu'];
    assert.deepEqual(intro.texts.map(o=>o.text),exactIntro);
    for (const text of intro.texts.slice(1,4)) {
        assert.equal(text.font,'Nunito Sans'); assert.equal(text.weight,'700');
        assert.ok(text.bounds.x>=164 && (text.bounds.x+text.bounds.width)<=844 && (text.bounds.y+text.bounds.height)<516);
    }
    assert.ok((intro.texts[1].bounds.y+intro.texts[1].bounds.height)<intro.texts[2].bounds.y);
    assert.ok((intro.texts[2].bounds.y+intro.texts[2].bounds.height)<intro.texts[3].bounds.y);
    assert.ok(intro.texts.every(o=>!o.interactive));
    await assertFrame(); await screenshot('apresentacao-pc-1280x720.png');
    await click(504,564); await waitScene('MainMenu');
    const menu = await geometry();
    assert.deepEqual(menu.texts.map(o=>o.text),['Pet Educa','Jogo da Alimentação','Passeio Consciente','Quiz do Saci','Indisponível']);
    const cards=menu.images.filter(o=>o.key==='pet-educa-ui-card');
    assert.equal(cards.length,3);
    assert.deepEqual(cards.map(o=>[o.x,o.y,o.width,o.height,o.interactive]),[[156,194,704,128,true],[156,344,704,128,true],[156,494,704,128,false]]);
    assert.deepEqual(menu.images.filter(o=>['pet-educa-ui-food','pet-educa-ui-walk','pet-educa-ui-saci'].includes(o.key)).map(o=>[o.key,o.x,o.y,o.width,o.height]),[
        ['pet-educa-ui-food',176,210,96,96],['pet-educa-ui-walk',176,360,96,96],['pet-educa-ui-saci',176,510,96,96]
    ]);
    assert.ok(menu.texts.every(o=>!o.interactive));
    assert.ok(menu.texts.slice(1).every(o=>(o.bounds.x+o.bounds.width)<860 && (o.bounds.y+o.bounds.height)<622));
    assert.ok(await evaluate('__checkedScene.children.list.filter(o=>o.type==="Image").every(o=>o.texture.source.every(s=>s.scaleMode===1))'));
    await screenshot('menu-pc-1280x720.png');
    console.log('PASS opening, exact text/accents, local fonts/variable weight, approved geometry, three cards and nearest filtering');

    for (const [x,y] of [[157,195],[859,321],[220,255],[440,255]]) {
        await click(x,y); await waitScene('FoodGame');
        assert.equal(await evaluate('__checkedScene.jogoComecou'),false);
        // O retorno existente do FoodGame segue funcionando.
        await key('Escape','Escape',27); await waitScene('MainMenu');
        assert.equal((await geometry()).count,menu.count);
        assert.equal((await geometry()).keydown,menu.keydown);
    }
    for (const [x,y] of [[157,345],[859,471],[220,405],[440,405]]) {
        await click(x,y); await waitScene('WalkGameLearning');
        assert.ok(await evaluate('Boolean(__checkedScene.player.body && __checkedScene.walkCollisions && __checkedScene.dialogueSystem)'));
        await returnMenu();
        assert.equal((await geometry()).count,menu.count);
        assert.equal((await geometry()).keydown,menu.keydown);
    }
    await click(220,558); assert.deepEqual(await active(),['MainMenu']);
    await click(400,558); assert.deepEqual(await active(),['MainMenu']);
    await key('ArrowDown','ArrowDown',40); await key('Enter','Enter',13); await waitScene('WalkGameLearning');
    await returnMenu(); await key('Space',' ',32); await waitScene('FoodGame');
    await key('Escape','Escape',27); await waitScene('MainMenu');
    for (let i=0;i<3;i++) {
        await evaluate('void __checkedScene.scene.start("Intro")'); await waitScene('Intro');
        assert.equal((await geometry()).count,intro.count); assert.equal((await geometry()).keydown,intro.keydown);
        await key('Enter','Enter',13); await waitScene('MainMenu');
    }
    console.log('PASS mouse at borders/icons/labels, correct minigames, disabled quiz, keyboard and repeated scene cleanup');

    await page.send('Emulation.setDeviceMetricsOverride',{width:740,height:360,deviceScaleFactor:2,mobile:true});
    await page.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:3});
    await evaluate('void __checkedScene.scene.start("Intro")'); await waitScene('Intro');
    const mobileFrame = await assertFrame(); await screenshot('apresentacao-mobile-740x360.png');
    // Vários contatos simultâneos não podem iniciar o menu duas vezes.
    await evaluate('window.__menuStarts=0; void __checkedScene.scene.manager.keys.MainMenu.events.on("start",()=>window.__menuStarts++)');
    const a=await point(365,517), b=await point(504,564);
    await page.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:1},{...b,id:2}]});
    await page.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await waitScene('MainMenu'); assert.equal(await evaluate('__menuStarts'),1);
    await screenshot('menu-mobile-740x360.png');
    for (const [y,target] of [[194,'FoodGame'],[344,'WalkGameLearning']]) {
        for (const [x,dy] of [[157,1],[859,127],[220,61],[440,61]]) {
            await click(x,y+dy,true); await waitScene(target); await returnMenu();
        }
    }
    await click(220,558,true); assert.deepEqual(await active(),['MainMenu']);
    console.log('PASS 740x360 landscape fit, emulated touch at borders/icons/labels and one transition for simultaneous contacts');

    await page.send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
    await page.send('Emulation.setTouchEmulationEnabled',{enabled:false});
    await page.send('Page.navigate',{url:baseURL+'/?walkLearning'}); await waitScene('WalkGameLearning');
    await page.send('Page.navigate',{url:baseURL+'/?walkLayoutEditor'});
    await waitScene('WalkLayoutEditor');
    assert.ok(await evaluate('Boolean(__checkedScene.draft && document.querySelector("aside"))'));
    await evaluate('void __checkedScene.scene.start("MainMenu")'); await waitScene('MainMenu');
    assert.equal(await evaluate('Boolean(document.querySelector("aside"))'),false);
    assert.deepEqual(await hashes(),originalFiles);
    const errors=page.events.filter(e=>e.method==='Runtime.exceptionThrown'||(e.method==='Runtime.consoleAPICalled'&&e.params.type==='error')||(e.method==='Log.entryAdded'&&e.params.entry.level==='error'));
    assert.deepEqual(errors,[],'Normal flow must have no browser/console errors');
    console.log('PASS development routes, editor cleanup, protected minigame files unchanged and clean console');

    // Falha e espera infinita de fontes são verificadas em páginas novas.
    for (const mode of ['reject','timeout']) {
        const script=await page.send('Page.addScriptToEvaluateOnNewDocument',{source:mode==='reject'?'document.fonts.load=()=>Promise.reject(new Error("Falha de fonte simulada"))':'document.fonts.load=()=>new Promise(()=>{})'});
        await page.send('Page.navigate',{url:baseURL+'/'});
        await waitScene('Preloader');
        await until(()=>evaluate('__checkedScene.children.list.some(o=>o.text?.includes("Não foi possível carregar"))'),'Missing explicit font error');
        assert.deepEqual(await active(),['Preloader']);
        assert.equal(await evaluate('__checkedScene.children.list.some(o=>o.text==="Pet Educa")'),false);
        await screenshot('font-'+mode+'.png');
        await page.send('Page.removeScriptToEvaluateOnNewDocument',{identifier:script.identifier});
        console.log('PASS explicit font '+mode+' without rendering approved UI with fallback fonts');
    }
    await page.send('Page.navigate',{url:baseURL+'/'}); await waitScene('Intro');
    assert.deepEqual(await hashes(),originalFiles);
    console.log(JSON.stringify({passed:true,screenshots:output,mobileViewport:mobileFrame,realDeviceTest:false},null,2));
} catch (error) {
    console.error(error);
    if (page) {
        console.error(JSON.stringify(page.events.filter(e=>['Runtime.exceptionThrown','Log.entryAdded'].includes(e.method)).slice(-10),null,2));
        const shot=await page.send('Page.captureScreenshot',{format:'png'}).catch(()=>null);
        if (shot) await fs.writeFile(path.join(output,'failure.png'),Buffer.from(shot.data,'base64'));
        console.error('Failure screenshot: '+path.join(output,'failure.png'));
    }
    process.exitCode=1;
} finally {
    if(browser) await browser.send('Browser.close').catch(()=>{});
    sockets.forEach(ws=>ws.close());
    edge.kill();
}
