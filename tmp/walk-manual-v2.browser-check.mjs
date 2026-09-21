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
const protectedFiles = [
    'src/game/data/walkStage18Map.json', 'public/assets/walk/walk-prototype-layout.json',
    'src/game/data/walkVisualConfig.js', 'src/game/scenes/WalkGameLearning.js',
    ...(await fs.readdir('public/assets/walk', { recursive: true })).filter(f => f.endsWith('.png')).map(f => path.join('public/assets/walk', f))
];
const hashes = async () => Object.fromEntries(await Promise.all(protectedFiles.map(async file => [file,
    createHash('sha256').update(await fs.readFile(file)).digest('hex')])));
const originalFiles = await hashes();
const output = path.resolve('tmp/walk-manual-v2-validation');
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
    await page.send('Page.navigate', { url: `${baseURL}/` });
    await until(() => attach('Intro', '/src/game/scenes/Intro.js'), 'Normal route did not start Intro');
    console.log('PASS normal route -> Intro');
    await page.send('Page.navigate', { url: `${baseURL}/?walkLearning` });
    await until(() => attach('WalkGameLearning', '/src/game/scenes/WalkGameLearning.js'), 'WalkGameLearning did not start');
    const learning = await snapshot();
    console.log('PASS ?walkLearning -> WalkGameLearning');
    await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    const learningShot = await page.send('Page.captureScreenshot', { format: 'png' });
    await fs.writeFile(path.join(output, 'walk-learning-manual-v2.png'), Buffer.from(learningShot.data, 'base64'));
    const approved = JSON.parse(await fs.readFile('docs/layout/walk-layout-draft-manual-v2.json', 'utf8'));
    const officialStage = JSON.parse(await fs.readFile('src/game/data/walkStage18Map.json', 'utf8'));
    const officialPrototype = JSON.parse(await fs.readFile('public/assets/walk/walk-prototype-layout.json', 'utf8'));
    const records = [...approved.ambientAssets, ...approved.compositions, ...approved.standalone];
    const position = ({x,y}) => ({x,y});
    const close = (actual, expected, label) => assert.ok(Math.abs(actual-expected)<1e-9, label+': '+actual+' != '+expected);
    assert.equal(records.length,28);
    assert.equal(new Set(records.map(r=>r.id)).size,28);
    for(const record of approved.ambientAssets) {
        assert.equal(record.id,'ambient:'+record.sourceIndex);
        const actual = officialStage.ambientAssets[record.sourceIndex];
        assert.equal(actual.key,record.key,record.id);
        assert.deepEqual(position(actual),record.currentPosition,record.id);
    }
    const interactions = Object.fromEntries(officialStage.interactions.map(i=>[i.id,i]));
    const anchors = {
        'composition:rest': position(interactions.descanso),
        'composition:booth': officialPrototype.placements.booth,
        'composition:water': {x:officialPrototype.placements.drinkingFountain.x,y:interactions.agua.y},
        'education:guide': position(interactions.guia)
    };
    for(const record of [...approved.compositions,...approved.standalone]) assert.deepEqual(anchors[record.id],record.currentPosition,record.id);
    assert.deepEqual(officialPrototype.placements.tutor,anchors['education:guide']);
    assert.deepEqual(officialPrototype.placements.restArea,anchors['composition:rest']);
    assert.deepEqual(officialPrototype.placements.drinkingFountain,position(interactions.agua));
    assert.deepEqual(officialPrototype.placements.waterBowl,approved.compositions.find(r=>r.id==='composition:water').members[1].currentPosition);
    assert.deepEqual(position(officialStage.ambientAssets[16]),{x:800,y:470});
    assert.deepEqual(approved.ambientAssets[16].currentPosition,{x:800,y:470});
    assert.deepEqual(anchors['composition:booth'],{x:1136,y:352});
    assert.deepEqual(officialPrototype.world,approved.world);
    const rendered = learning.filter(o=>o.key!=='walk-tileset');
    const expectedMembers = records.flatMap(r=>r.members.map(m=>({record:r,member:m})));
    assert.equal(rendered.length,expectedMembers.length,'No duplicate or missing visual parts');
    const unmatched = [...rendered];
    for(const {record,member} of expectedMembers) {
        const index=unmatched.findIndex(o=>o.key===member.key && o.x===member.currentPosition.x && o.y===member.currentPosition.y);
        assert.notEqual(index,-1,member.id+' exact rendered coordinates');
        const actual=unmatched.splice(index,1)[0];
        assert.equal(actual.scaleX,member.scale.x,member.id+' scaleX');
        assert.equal(actual.scaleY,member.scale.y,member.id+' scaleY');
        assert.equal(actual.originX,member.origin.x,member.id+' originX');
        assert.equal(actual.originY,member.origin.y,member.id+' originY');
        close(actual.x-record.anchor.x,member.offset.x,member.id+' offsetX');
        close(actual.y-record.anchor.y,member.offset.y,member.id+' offsetY');
        close(actual.depth-record.anchor.y,member.depthOffset,member.id+' depthOffset');
    }
    assert.equal(unmatched.length,0);
    assert.ok(!learning.some(o=>o.key==='walk-map'),'No map image renderer');
    const report={approvedDraft:'docs/layout/walk-layout-draft-manual-v2.json',url:baseURL+'/?walkLearning',anchorsCompared:28,ambientAssets:24,compositions:3,standalone:1,visualParts:expectedMembers.length,divergences:[],fountain:{x:800,y:470},booth:{x:1136,y:352},world:officialPrototype.world,screenshot:path.join(output,'walk-learning-manual-v2.png')};
    console.log('PASS official and real runtime coordinates match corrected v2; scales, origins, offsets and internal depths preserved');

    await page.send('Page.navigate', { url: `${baseURL}/?walkLayoutEditor` });
    await until(() => attach('WalkLayoutEditor', '/src/game/dev/WalkLayoutEditor.js'), 'WalkLayoutEditor did not start');
    await until(() => evaluate(`Boolean(__checkedScene.draft && document.querySelector('aside'))`), 'Editor did not finish creating');
    await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    assert.deepEqual(await snapshot(), learning, 'Editor must create the identical runtime visuals');
    console.log('PASS ?walkLayoutEditor -> same runtime visuals, editor active');
    const original = await evaluate('__checkedScene.draft.exportDraft()');
    for(const record of [...original.ambientAssets,...original.compositions,...original.standalone]) {
        const expected=records.find(r=>r.id===record.id);
        assert.ok(expected,record.id);
        assert.deepEqual(record.currentPosition,expected.currentPosition,record.id+' editor anchor');
        assert.equal(record.members.length,expected.members.length);
        record.members.forEach((m,i)=>{
            assert.equal(m.id,expected.members[i].id);
            assert.equal(m.key,expected.members[i].key);
            assert.deepEqual(m.currentPosition,expected.members[i].currentPosition,m.id+' editor position');
        });
    }
    assert.equal(original.ambientAssets.length, 24);
    assert.equal(original.compositions.length, 3);
    assert.equal(new Set(original.ambientAssets.map(a => a.id)).size, 24);
    assert.equal(original.world.width, 1600);
    assert.equal(original.world.height, 896);
    assert.equal(original.tileSize, 32);
    assert.equal(original.version, 1);
    assert.ok(Number.isFinite(Date.parse(original.date)));
    assert.equal(original.ambientAssets.filter(a=>a.key==='plaza-tree-large').length,3);
    const takeScreenshot = async (filename) => {
        const shot = await page.send('Page.captureScreenshot', { format: 'png' });
        await fs.writeFile(path.join(output, filename), Buffer.from(shot.data, 'base64'));
    };
    await takeScreenshot('editor-initial.png');
    async function target(id, key) {
        return evaluate(`(() => {
            const e=__checkedScene, r=e.draft.records.find(r=>r.id===${JSON.stringify(id)});
            const part=r.members.find(m=>m.key===${JSON.stringify(key)})??r.members[0];
            const b=part.object.getBounds();
            for(let y=b.top+2;y<b.bottom;y+=2) for(let x=b.left+2;x<b.right;x+=2) {
                const hit=e.pick({x,y});
                const inside = [[-2,0],[2,0],[0,-2],[0,2]].every(([dx,dy]) => {
                    const neighbor=e.pick({x:x+dx,y:y+dy});
                    return neighbor?.record===r && neighbor.member===part;
                });
                if(hit?.record===r && hit.member===part && inside) {
                    const p=e.cameras.main.matrixCombined.transformPoint(x,y);
                    const rect=e.game.canvas.getBoundingClientRect();
                    return {x:rect.left+p.x*rect.width/e.scale.width,y:rect.top+p.y*rect.height/e.scale.height,
                        ratioX:rect.width/e.scale.width*e.cameras.main.zoom,ratioY:rect.height/e.scale.height*e.cameras.main.zoom};
                }
            }
            throw new Error('No visible hit target: '+r.id);
        })()`);
    }
    const mouse = (type, x, y, extra = {}) => page.send('Input.dispatchMouseEvent', { type, x, y, ...extra });
    async function select(id, key) {
        const p = await target(id, key);
        await mouse('mousePressed', p.x, p.y, { button: 'left', buttons: 1, clickCount: 1 });
        await mouse('mouseReleased', p.x, p.y, { button: 'left', buttons: 0, clickCount: 1 });
        assert.equal(await evaluate('__checkedScene.selected?.record.id'), id);
        assert.match(await evaluate("document.querySelector('aside pre').textContent"), /SELECIONADO/);
        return p;
    }
    async function drag(id, key, dx, dy, shift = false) {
        const before = await evaluate(`__checkedScene.draft.records.find(r=>r.id===${JSON.stringify(id)}).currentPosition`);
        const p = await select(id, key);
        assert.deepEqual(await evaluate(`__checkedScene.draft.records.find(r=>r.id===${JSON.stringify(id)}).currentPosition`), before, 'Selection must not snap or move');
        await mouse('mousePressed', p.x, p.y, { button: 'left', buttons: 1, clickCount: 1 });
        if (shift) await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Shift', code: 'ShiftLeft', modifiers: 8 });
        for (let step = 1; step <= 8; step++) {
            await mouse('mouseMoved', p.x + dx*p.ratioX*step/8, p.y + dy*p.ratioY*step/8,
                { button: 'left', buttons: 1, modifiers: shift ? 8 : 0 });
        }
        await mouse('mouseReleased', p.x+dx*p.ratioX, p.y+dy*p.ratioY, { button: 'left', buttons: 0, modifiers: shift ? 8 : 0 });
        if (shift) await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Shift', code: 'ShiftLeft' });
        const actual = await evaluate(`(() => {const r=__checkedScene.draft.records.find(r=>r.id===${JSON.stringify(id)});return {anchor:r.currentPosition,members:r.members.map(m=>({x:m.object.x,y:m.object.y,offset:m.offset,depth:m.object.depth,depthOffset:m.depthOffset,scaleX:m.object.scaleX,scaleY:m.object.scaleY,scale:m.scale}))};})()`);
        const quantize = n => shift ? n : Math.round(n/16)*16;
        assert.ok(Math.abs(actual.anchor.x-quantize(before.x+dx))<0.1, `Drag x ${id}: ${actual.anchor.x}`);
        assert.ok(Math.abs(actual.anchor.y-quantize(before.y+dy))<0.1, `Drag y ${id}: ${actual.anchor.y}`);
        for (const m of actual.members) {
            assert.ok(Math.abs(m.x-actual.anchor.x-m.offset.x)<1e-6);
            assert.ok(Math.abs(m.y-actual.anchor.y-m.offset.y)<1e-6);
            assert.ok(Math.abs(m.depth-actual.anchor.y-m.depthOffset)<1e-6);
            assert.equal(m.scaleX,m.scale.x); assert.equal(m.scaleY,m.scale.y);
        }
        console.log(`PASS drag ${id} via ${key} (${shift ? 'Shift' : '16px snap'})`);
    }
    await drag('ambient:21','plaza-fire-hydrant',64,-32);
    await drag('ambient:21','plaza-fire-hydrant',17,11,true);
    await drag('composition:rest','npc-pessoa-sentada',64,-32);
    await drag('composition:booth','walk-booth-front',-32,32);
    await drag('composition:water','walk-water-bowl',32,32);
    await drag('ambient:4','plaza-tree-young-canopy',32,16);
    const beforeTerrain = await evaluate('JSON.stringify(__checkedScene.draft.exportDraft())');
    const ground = await evaluate(`(() => {const e=__checkedScene,p=e.cameras.main.matrixCombined.transformPoint(800,780),r=e.game.canvas.getBoundingClientRect();return{x:r.left+p.x*r.width/e.scale.width,y:r.top+p.y*r.height/e.scale.height}})()`);
    await mouse('mousePressed',ground.x,ground.y,{button:'left',buttons:1,clickCount:1});
    await mouse('mouseMoved',ground.x+40,ground.y-20,{button:'left',buttons:1});
    await mouse('mouseReleased',ground.x+40,ground.y-20,{button:'left',buttons:0});
    assert.equal(await evaluate('__checkedScene.selected'),null,'Paths must not be selectable');
    const changed = await evaluate('__checkedScene.draft.exportDraft()');
    const preGround=JSON.parse(beforeTerrain);preGround.date=changed.date;
    assert.deepEqual(preGround,changed,'Dragging terrain must not change the draft');
    await select('composition:rest','walk-bench');
    await takeScreenshot('editor-selected.png');
    const button = await evaluate(`(() => {const r=document.querySelector('aside button').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await mouse('mousePressed',button.x,button.y,{button:'left',buttons:1,clickCount:1});
    await mouse('mouseReleased',button.x,button.y,{button:'left',buttons:0,clickCount:1});
    const downloaded = await until(async () => JSON.parse(await fs.readFile(path.join(downloads,'walk-layout-draft.json'),'utf8')), 'Draft was not downloaded');
    changed.date=downloaded.date;
    assert.deepEqual(downloaded,changed);
    assert.deepEqual(await hashes(),originalFiles,'Download must not mutate official files');
    console.log('PASS real JSON download: content, IDs, offsets, groups, metadata and protected files');
    await page.send('Page.navigate',{url:`${baseURL}/?walkLayoutEditor`});
    await until(()=>attach('WalkLayoutEditor','/src/game/dev/WalkLayoutEditor.js'),'Editor reload failed');
    await until(()=>evaluate('Boolean(__checkedScene.draft)'), 'Editor reload not ready');
    const reset=await evaluate('__checkedScene.draft.exportDraft()');original.date=reset.date;
    assert.deepEqual(reset,original,'Reload must discard the provisional changes');
    await evaluate("void __checkedScene.scene.start('WalkGameLearning')");
    await until(()=>attach('WalkGameLearning','/src/game/scenes/WalkGameLearning.js'),'Returning to learning failed');
    assert.equal(await evaluate("Boolean(document.querySelector('aside'))"),false);
    assert.deepEqual(await snapshot(),learning);
    const errors=page.events.filter(e=>e.method==='Runtime.exceptionThrown');
    assert.deepEqual(errors,[], 'Runtime exceptions');
    const consoleErrors=page.events.filter(e=>e.method==='Runtime.consoleAPICalled'&&e.params.type==='error');
    const logErrors=page.events.filter(e=>e.method==='Log.entryAdded'&&e.params.entry.level==='error');
    assert.deepEqual(consoleErrors,[], 'Console errors');
    assert.deepEqual(logErrors,[], 'Browser log errors');
    report.routes={normal:'Intro',walkLearning:'WalkGameLearning',walkLayoutEditor:'WalkLayoutEditor'};
    report.consoleErrors=[]; report.browserErrors=[]; report.editorSelectionDragExportPassed=true;
    await fs.writeFile(path.join(output,'validation-report.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify({passed:true,runtimeImages:learning.length,ambientAssets:24,compositions:3,download:path.join(downloads,'walk-layout-draft.json'),screenshots:output,learningUnchanged:true},null,2));
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
