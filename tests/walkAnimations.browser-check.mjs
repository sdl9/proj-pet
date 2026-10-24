import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';

// Teste local com Edge headless, seguindo os checks de navegador já usados no projeto.
const baseURL = process.env.WALK_UI_URL || 'http://localhost:8080';
const output = path.resolve('tmp/walk-animations-validation');
await fs.mkdir(output, { recursive: true });
const profile = await fs.mkdtemp(path.join(tmpdir(), 'walk-animations-check-'));
const edgePath = process.env.WALK_EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const edge = spawn(edgePath, ['--headless=new', '--remote-debugging-port=0', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--enable-unsafe-swiftshader',
    '--window-size=1280,720', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
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
    ws.addEventListener('close', () => { for (const call of pending.values()) call.reject(new Error('Conexão do Edge encerrada')); pending.clear(); });
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
                const timer = setTimeout(() => { pending.delete(id); reject(new Error('Sem resposta do Edge: ' + method)); }, 10000);
                pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
                ws.send(JSON.stringify({ id, method, params }));
            });
        }
    };
}

let browser, page;
const passed = [];
try {
    const portFile = await until(() => fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8'), 'Edge não iniciou');
    const [port, endpoint] = portFile.trim().split(/\r?\n/);
    browser = await connect('ws://127.0.0.1:' + port + endpoint);
    const pages = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
    page = await connect(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
    await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Network.enable');
    async function evaluate(expression) {
        const result = await page.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || JSON.stringify(result.exceptionDetails));
        return result.result.value;
    }
    async function attach(key) {
        const result = await page.send('Runtime.evaluate', { expression: "import('/src/game/scenes/Intro.js').then(m => m.Intro.prototype)", awaitPromise: true });
        if (!result.result.objectId) return false;
        const instances = await page.send('Runtime.queryObjects', { prototypeObjectId: result.result.objectId });
        const attached = await page.send('Runtime.callFunctionOn', {
            objectId: instances.objects.objectId,
            functionDeclaration: 'function(key){ window.__checkedScene = this.map(s => s.sys?.game?.scene?.keys?.[key]).find(s => s?.sys?.isActive()); return Boolean(window.__checkedScene); }',
            arguments: [{ value: key }], returnByValue: true
        });
        return attached.result.value;
    }
    const frames = (count = 3) => evaluate('new Promise(resolve => { let n=' + count + '; const tick=()=>--n<=0?resolve():requestAnimationFrame(tick);requestAnimationFrame(tick); })');
    const get = expression => evaluate('__checkedScene.' + expression);
    async function shot(name) {
        const result = await page.send('Page.captureScreenshot', { format: 'png' });
        await fs.writeFile(path.join(output, name + '.png'), Buffer.from(result.data, 'base64'));
    }
    async function viewport(width, height, mobile = false) {
        await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
        await page.send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: 3 });
    }
    async function navigate(query, scene) {
        await page.send('Page.navigate', { url: baseURL + '/' + query });
        await until(() => attach(scene), 'Cena não abriu: ' + scene);
        await frames(4);
    }
    async function point(x, y) {
        return evaluate('(()=>{const r=document.querySelector("canvas").getBoundingClientRect();return {x:r.left+' + x + '*r.width/1280,y:r.top+' + y + '*r.height/720};})()');
    }
    async function touch(x, y, cancel = false) {
        const p = await point(x, y);
        await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p, id: 1, radiusX: 3, radiusY: 3, force: 1 }] });
        await frames();
        await page.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
        await frames();
    }
    async function approach(id) {
        await evaluate('(()=>{const s=__checkedScene; const p=s.interactionSystem.interactions.find(i=>i.id===' + JSON.stringify(id) + ');s.player.body.reset(p.x,p.y+48);s.cameras.main.centerOn(p.x,p.y+48);})()');
        await frames(5);
        assert.equal(await get('interactionSystem.current?.id'), id);
    }
    function pass(name) { passed.push(name); console.log('PASS ' + name); }

    await viewport(1280, 720);
    await navigate('?walkLearning', 'WalkGameLearning');
    const tutorState = () => evaluate('(()=>{const {tutorPatrol,interactions}=__checkedScene;return ({x:tutorPatrol.sprite.x,y:tutorPatrol.sprite.y,flip:tutorPatrol.sprite.flipX,direction:tutorPatrol.direction,pause:tutorPatrol.pauseRemaining,paused:tutorPatrol.sprite.anims.isPaused,frame:tutorPatrol.sprite.frame.name,interaction:interactions.find(i=>i.id==="guia").x});})()');
    const freeze = () => evaluate('(()=>{const p=__checkedScene.tutorPatrol;p.realUpdate=p.update;p.update=()=>{};})()');
    const thaw = () => evaluate('__checkedScene.tutorPatrol.update=__checkedScene.tutorPatrol.realUpdate');
    const tick = delta => evaluate('__checkedScene.tutorPatrol.realUpdate(' + delta + ',false)');
    const reset = (x=544, direction=1, pauseMs=0) => evaluate('(()=>{const p=__checkedScene.tutorPatrol;p.sprite.setPosition(' + x + ',368);p.direction=' + direction + ';p.pauseRemaining=' + pauseMs + ';p.realUpdate(0,false);})()');
    const closeTo = (actual, expected) => assert.ok(Math.abs(actual-expected) < 0.01, `${actual} != ${expected}`);
    const animations = await get('children.list.filter(o=>["plaza-fountain-water","plaza-spring-rider","npc-tutor-cachorro-guia"].includes(o.texture?.key)).map(o=>({key:o.texture.key,w:o.width,h:o.height,origin:[o.originX,o.originY],scale:o.scaleX,frames:o.anims.currentAnim.frames.length,rate:o.anims.currentAnim.frameRate,repeat:o.anims.currentAnim.repeat,x:o.x,y:o.y}))');
    assert.equal(animations.length, 3);
    for (const [key,w,h,count,rate,scale] of [
        ['plaza-fountain-water',160,128,6,6,1.25],
        ['plaza-spring-rider',96,96,12,10,1],
        ['npc-tutor-cachorro-guia',128,64,4,6,1.8]
    ]) {
        const a=animations.find(a=>a.key===key);
        assert.deepEqual([a.w,a.h,a.frames,a.rate,a.repeat,a.scale], [w,h,count,rate,-1,scale]);
        assert.deepEqual(a.origin,[0.5,1]);
    }
    assert.deepEqual(await get('children.list.filter(o=>o.texture?.key==="plaza-fountain").length'),0);
    assert.deepEqual(await get('children.list.filter(o=>["plaza-fountain-base","plaza-fountain-water"].includes(o.texture?.key)).map(o=>[o.x,o.y,o.scaleX,o.depth])'),[[800,470,1.25,470],[800,470,1.25,470.01]]);
    const samples=[];
    for(let i=0;i<5;i++) { samples.push(await get('children.list.filter(o=>o.anims?.currentAnim).map(o=>[o.texture.key,o.frame.name])')); await pause(190); }
    for(const a of animations) assert.ok(new Set(samples.flat().filter(([key])=>key===a.key).map(([,frame])=>frame)).size>1,a.key+' não animou');
    pass('Três spritesheets, dimensões por frame, ciclos ativos e fonte em duas camadas alinhadas');

    await freeze(); await reset();
    await tick(1000); closeTo((await tutorState()).x,592);
    await tick(1000); closeTo((await tutorState()).x,640);
    assert.equal((await tutorState()).pause,320); assert.equal((await tutorState()).paused,true);
    const endFrame=(await tutorState()).frame; await pause(400);
    assert.equal((await tutorState()).frame,endFrame);
    await tick(319); assert.equal((await tutorState()).x,640); assert.equal((await tutorState()).pause,1);
    await tick(1); assert.equal((await tutorState()).flip,true); assert.equal((await tutorState()).paused,false);
    await tick(4000); closeTo((await tutorState()).x,448);
    assert.equal((await tutorState()).pause,320);
    await tick(1320); closeTo((await tutorState()).x,496); assert.equal((await tutorState()).flip,false);
    await reset(); await tick(7320); const longStep=await tutorState();
    await reset(); for(let i=0;i<732;i++) await tick(10);
    const shortSteps=await tutorState(); closeTo(shortSteps.x,longStep.x); assert.equal(shortSteps.direction,longStep.direction);
    assert.equal(shortSteps.interaction,shortSteps.x); assert.equal(shortSteps.y,368);
    pass('48 px/s, extremos 448/640, pausa de 320 ms, espelhamento e independência do delta');

    for(const x of [544,640,448]) {
        await reset(x,x===448?1:-1);
        const collision = await evaluate('(()=>{const s=__checkedScene,p=s.tutorPatrol.sprite,z=s.walkCollisions.staticBodies.getChildren().filter(z=>z.name==="npc-tutor-cachorro-guia:group-base");const zone=z[0];s.player.body.reset(p.x,p.y-16);s.player.body.updateFromGameObject();const overlap=s.physics.overlap(s.player,zone);return {count:z.length,x:zone.body.center.x,y:zone.body.center.y,w:zone.body.width,h:zone.body.height,zoneX:zone.x,overlap,inTree:s.physics.world.staticTree.search({minX:p.x-1,maxX:p.x+1,minY:p.y-20,maxY:p.y-10}).includes(zone.body)};})()');
        for (const [field, expected] of Object.entries({x,y:344.6,w:172.8,h:39.6,zoneX:x})) {
            closeTo(collision[field], expected);
        }
        assert.deepEqual([collision.count,collision.overlap,collision.inTree],[1,true,true]);
        await evaluate('(()=>{const s=__checkedScene;s.player.body.reset(s.tutorPatrol.sprite.x,428);s.player.body.updateFromGameObject();s.player.savedMover=s.player.mover;s.player.mover=()=>s.player.setVelocity(0,-200);})()');
        await pause(500);
        const blocked=await evaluate('(()=>{const s=__checkedScene,z=s.walkCollisions.staticBodies.getChildren().find(z=>z.name.startsWith("npc-tutor"));const result={blocked:s.player.body.blocked.up,gap:s.player.body.top-z.body.bottom};s.player.mover=s.player.savedMover;s.player.setVelocity(0,0);return result;})()');
        assert.equal(blocked.blocked,true); assert.ok(Math.abs(blocked.gap)<1);
        if(x===448) assert.equal(await evaluate('(()=>{const s=__checkedScene;s.player.body.reset(560,352);s.player.body.updateFromGameObject();return s.physics.overlap(s.player,s.walkCollisions.staticBodies.getChildren().filter(z=>z.name.startsWith("npc-tutor")));})()'),false);
    }
    assert.equal(await get('walkCollisions.staticBodies.getChildren().filter(z=>z.name.startsWith("plaza-fountain-water")).length'),0);
    assert.equal(await get('walkCollisions.staticBodies.getChildren().filter(z=>z.name.startsWith("plaza-spring-rider")).length'),1);
    pass('Colisão única e móvel, separação física e índice espacial sincronizados; sem barreira na origem');

    async function key(code,key,number) {
        await page.send('Input.dispatchKeyEvent',{type:'rawKeyDown',code,key,windowsVirtualKeyCode:number});
        await frames(2);
        await page.send('Input.dispatchKeyEvent',{type:'keyUp',code,key,windowsVirtualKeyCode:number});
        await frames(2);
    }
    for(const [x,mode,pauseMs] of [[640,'E',320],[448,'SPACE',320],[640,'TOUCH',320],[544,'E',0]]) {
        await reset(x,x===640?-1:1,pauseMs);
        await approach('guia');
        if(mode==='TOUCH') { await viewport(844,390,true); await frames(6); await approach('guia'); await touch(1050,650); }
        else await key(mode==='E'?'KeyE':'Space',mode==='E'?'e':' ',mode==='E'?69:32);
        assert.equal(await get('dialogueSystem.isOpen()'),true,mode);
        await thaw();
        const stopped=await tutorState(); await pause(450);
        const after=await tutorState();
        assert.deepEqual([after.x,after.pause,after.frame,after.direction],[stopped.x,stopped.pause,stopped.frame,stopped.direction]);
        assert.equal(after.paused,true);
        await shot('dialogue-'+mode.toLowerCase());
        if(mode==='TOUCH') await touch(1112,652); else await key('Space',' ',32);
        assert.equal(await get('dialogueSystem.isOpen()'),false);
        await pause(650);
        assert.ok(Math.abs((await tutorState()).x-stopped.x)<35);
        assert.equal((await tutorState()).paused,false);
        await freeze();
    }
    pass('E, espaço e toque; diálogo congela passos no trajeto e pausas nas extremidades, retomada sem salto');
    await viewport(1280,720);
    await reset(448,-1); await tick(4000);
    await get('scene.start("MainMenu");void 0'); await until(()=>attach('MainMenu'),'Menu não abriu');
    await get('scene.start("WalkGameLearning");void 0'); await until(()=>attach('WalkGameLearning'),'Passeio não reabriu');
    const restarted=await tutorState();
    assert.ok(restarted.x>=544&&restarted.x<555); assert.equal(restarted.y,368); assert.equal(restarted.direction,1); assert.equal(restarted.flip,false);
    assert.equal(await get('walkCollisions.staticBodies.getChildren().filter(z=>z.name.startsWith("npc-tutor")).length'),1);
    assert.equal(await get('children.list.filter(o=>o.texture?.key==="npc-tutor-cachorro-guia").length'),1);
    assert.equal(await evaluate('import("/src/game/data/walkStage18Map.json").then(m=>m.default.interactions.find(i=>i.id==="guia").x)'),544);
    await get('cameras.main.stopFollow().centerOn(800,448).setZoom(0.8);void 0'); await frames(4); await shot('plaza-animated');
    pass('Saída e reentrada restauram o início; JSON compartilhado intacto; sem sprites ou colisores duplicados');

    await navigate('?walkLayoutEditor','WalkLayoutEditor');
    assert.equal(await get('tutorPatrol'),undefined);
    const edited=await evaluate('(()=>{const s=__checkedScene,r=s.draft.records.find(r=>r.id==="education:guide");s.draft.move(r,600,400,false);return [r.members[0].object.x,r.members[0].object.y,r.members[0].object.width,r.members[0].object.height];})()');
    assert.deepEqual(edited,[600,400,128,64]);
    await pause(350);
    assert.equal(await get('draft.records.find(r=>r.id==="education:guide").members[0].object.x'),600);
    await shot('layout-editor');
    pass('Editor mantém registro, dimensões por frame e arraste sem interferência do percurso');

    const failures=page.events.filter(e=>e.method==='Runtime.exceptionThrown'||
        (e.method==='Runtime.consoleAPICalled'&&e.params.type==='error')||
        (e.method==='Network.responseReceived'&&e.params.response.status>=400&&e.params.response.url.includes('/assets/')));
    assert.deepEqual(failures,[]);
    await fs.writeFile(path.join(output,'report.json'),JSON.stringify({passed:true,checks:passed,errors:failures},null,2));
} catch (error) {
    console.error(error);
    if (page) {
        console.error(JSON.stringify(page.events.filter(e=>e.method === 'Runtime.exceptionThrown').slice(-5),null,2));
        const shot = await page.send('Page.captureScreenshot', { format: 'png' }).catch(()=>null);
        if (shot) await fs.writeFile(path.join(output, 'failure.png'), Buffer.from(shot.data,'base64'));
    }
    process.exitCode = 1;
} finally {
    if (browser) await browser.send('Browser.close').catch(()=>{});
    sockets.forEach(ws=>ws.close()); edge.kill();
}

