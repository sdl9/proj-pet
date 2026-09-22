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
const output = path.resolve('tmp/walk-player-l1-validation');
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
    await page.send('Page.navigate',{url:baseURL+'/'});
    await until(()=>attach('Intro'),'Normal route must start Intro');
    console.log('PASS normal route -> Intro');
    await page.send('Page.navigate',{url:baseURL+'/?walkLearning'});
    await until(()=>attach('WalkGameLearning'),'Learning did not start');
    await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const learning=await snapshot();
    const learningCamera=await camera();
    const baselineFile=path.join(output,'baseline.json');
    let baseline;
    let playerReport;
    if(baselineMode) {
        assert.equal(learning.filter(o=>o.key==='walk-player').length,0);
        baseline={learning,camera:learningCamera,hashes:originalFiles};
        await capture('before-l1.png');
    } else {
        baseline=JSON.parse(await fs.readFile(baselineFile,'utf8'));
        assert.deepEqual(originalFiles,baseline.hashes,'Protected sources and PNGs unchanged');
        assert.deepEqual(learning.filter(o=>o.key!=='walk-player'),baseline.learning,'Frozen layout unchanged');
        assert.deepEqual(learningCamera,baseline.camera,'Camera unchanged');
        assert.deepEqual(learningCamera.bounds,{x:0,y:0,width:1600,height:896});
        const players=learning.filter(o=>o.key==='walk-player');
        assert.equal(players.length,1,'Exactly one player');
        assert.deepEqual(players[0],{key:'walk-player',frame:0,x:800,y:832,scaleX:1.5,scaleY:1.5,originX:0.5,originY:61/64,depth:832});
        playerReport=await evaluate(`(() => {
            const s=__checkedScene,p=s.player,t=s.textures.get('walk-player'),b=p.getBounds();
            const rows={baixo:[0,1,2,3],esquerda:[4,5,6,7],direita:[8,9,10,11],cima:[12,13,14,15]};
            return {hasBody:Boolean(p.body),hasInput:Boolean(p.input),playing:p.anims.isPlaying,frame:p.frame.name,
                size:[t.source[0].width,t.source[0].height],frames:t.getFrameNames().length,
                frameSize:[p.frame.width,p.frame.height],bounds:{x:b.x,y:b.y,width:b.width,height:b.height},
                pixelArt:s.game.config.pixelArt,roundPixels:s.game.config.roundPixels,antialias:s.game.config.antialias,
                definitions:Object.fromEntries(Object.keys(rows).map(dir=>{const a=s.anims.get('walk-player-'+dir);return [dir,a?.frames.map(f=>f.textureFrame)]})),
                physicsBodyCount:s.physics.world.bodies.size};
        })()`);
        assert.equal(playerReport.hasBody,false); assert.equal(playerReport.hasInput,false);
        assert.equal(playerReport.playing,false); assert.equal(playerReport.frame,0);
        assert.deepEqual(playerReport.size,[256,256]); assert.deepEqual(playerReport.frameSize,[64,64]);
        assert.equal(playerReport.frames,16); assert.equal(playerReport.pixelArt,true);
        assert.equal(playerReport.roundPixels,true); assert.equal(playerReport.antialias,false);
        assert.equal(playerReport.physicsBodyCount,0);
        assert.deepEqual(playerReport.definitions,{baixo:[0,1,2,3],esquerda:[4,5,6,7],direita:[8,9,10,11],cima:[12,13,14,15]});
        assert.ok(playerReport.bounds.x>=0 && playerReport.bounds.y>=0);
        assert.ok(playerReport.bounds.x+playerReport.bounds.width<=1600 && playerReport.bounds.y+playerReport.bounds.height<=896);
        await evaluate('new Promise(resolve=>{let n=0;const tick=()=>++n===60?resolve():requestAnimationFrame(tick);requestAnimationFrame(tick)})');
        assert.deepEqual(await snapshot(),learning,'No animation or movement after 60 actual render frames');
        await capture('walk-player-l1.png');
        console.log('PASS one idle player, exact frames, feet origin, scale, depth, no physics/input, frozen layout and camera');
    }
    await page.send('Page.navigate',{url:baseURL+'/?walkLayoutEditor'});
    await until(()=>attach('WalkLayoutEditor'),'Editor did not start');
    await until(()=>evaluate('Boolean(__checkedScene.draft && document.querySelector("aside"))'),'Editor not ready');
    await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const editor=await snapshot();
    assert.deepEqual(editor,baseline.learning,'Editor visuals unchanged and no player in editor');
    const editorDraft=await evaluate('__checkedScene.draft.exportDraft()');
    assert.equal(editorDraft.ambientAssets.length,24);assert.equal(editorDraft.compositions.length,3);
    assert.deepEqual(editorDraft.world,{tileSize:32,columns:50,rows:28,width:1600,height:896});
    if(baselineMode) {
        baseline.editor=editor;baseline.editorCamera=await camera();
        await fs.writeFile(baselineFile,JSON.stringify(baseline,null,2));
    } else {
        assert.deepEqual(await camera(),baseline.editorCamera,'Editor camera unchanged');
        await capture('editor-preserved.png');
        // Re-enter the learning scene to ensure animation registration is idempotent.
        await evaluate("void __checkedScene.scene.start('WalkGameLearning')");
        await until(()=>attach('WalkGameLearning'),'Learning re-entry failed');
        assert.deepEqual(await snapshot(),learning,'No duplication on re-entry');
        assert.equal(await evaluate('__checkedScene.player.anims.isPlaying'),false);
    }
    const errors=page.events.filter(e=>e.method==='Runtime.exceptionThrown' ||
        (e.method==='Runtime.consoleAPICalled' && e.params.type==='error') ||
        (e.method==='Log.entryAdded' && e.params.entry.level==='error'));
    const warnings=page.events.filter(e=>(e.method==='Runtime.consoleAPICalled' && e.params.type==='warning') ||
        (e.method==='Log.entryAdded' && e.params.entry.level==='warning'));
    assert.deepEqual(errors,[],'Console or browser errors');
    assert.deepEqual(await hashes(),originalFiles,'No protected file mutation during tests');
    const report={passed:true,baselineMode,url:baseURL+'/?walkLearning',player:playerReport,
        routes:{normal:'Intro',walkLearning:'WalkGameLearning',walkLayoutEditor:'WalkLayoutEditor'},
        layoutUnchanged:true,cameraUnchanged:true,protectedFilesUnchanged:true,consoleErrors:errors,warnings,
        screenshot:baselineMode?'before-l1.png':'walk-player-l1.png'};
    await fs.writeFile(path.join(output,baselineMode?'baseline-report.json':'validation-report.json'),JSON.stringify(report,null,2));
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
