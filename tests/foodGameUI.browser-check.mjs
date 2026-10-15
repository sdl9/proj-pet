import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';

// Teste local com Edge headless, seguindo os checks de navegador já usados no projeto.
const baseURL = process.env.FOOD_UI_URL || 'http://localhost:8080';
const output = path.resolve('tmp/food-ui-validation');
await fs.mkdir(output, { recursive: true });
const profile = await fs.mkdtemp(path.join(tmpdir(), 'food-ui-check-'));
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
    async function mouse(type, x, y) {
        const p = await point(x, y);
        await page.send('Input.dispatchMouseEvent', { type, ...p, button: type === 'mouseMoved' ? 'none' : 'left', clickCount: type === 'mouseMoved' ? 0 : 1 });
        await frames();
    }
    async function click(x, y) { await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); }
    async function touch(x, y, cancel = false) {
        const p = await point(x, y);
        await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p, id: 1, radiusX: 3, radiusY: 3, force: 1 }] });
        await frames();
        await page.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
        await frames();
    }
    function pass(name) { passed.push(name); console.log('PASS ' + name); }
    async function readyFood() {
        await until(() => attach('FoodGame'), 'Alimentação não abriu');
        await until(() => get('uiReady'), 'Instruções não ficaram prontas');
        await frames();
    }
    async function openFood(mobile = false) {
        if (mobile) await touch(500,258); else await click(500,258);
        await readyFood();
    }
    async function key(key, code, number) {
        await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code, windowsVirtualKeyCode: number });
        await frames();
        await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: number });
        await frames();
    }
    function edges(rect) { return { ...rect, right: rect.x + rect.width, bottom: rect.y + rect.height }; }
    async function checkDropSpacing() {
        await until(() => get('children.list.filter(o=>o.tipo).length >= 4'), 'Alimentos não foram gerados');
        const drops = await get('children.list.filter(o=>o.tipo).map(o=>({tipo:o.tipo,x:o.x,width:o.displayWidth}))');
        for (let i = 1; i < drops.length; i++) {
            const previous = drops[i - 1], current = drops[i];
            assert.notEqual(current.tipo, previous.tipo, 'Tipos devem alternar');
            assert.ok(current.x - previous.x >= 200, 'Alimentos muito próximos horizontalmente');
            assert.ok(current.x - current.width / 2 > previous.x + previous.width / 2, 'Alimentos sobrepostos');
        }
        pass('Alimentos alternados, com espaçamento horizontal e sem sobreposição');
    }
    async function finishFood(mobile = false) {
        // Acelera somente o TimerEvent no teste: percorre os 60 ticks reais do contador.
        const expected = await evaluate(`(async()=>{
            const s=__checkedScene;
            const {default:FoodObjects}=await import('/src/game/objects/FoodObjects.js');
            for(let i=0;i<${mobile ? 1 : 5};i++) s.capturarItem(s.player,FoodObjects.criar(s,'bom'));
            for(let i=0;i<${mobile ? 2 : 1};i++) s.capturarItem(s.player,FoodObjects.criar(s,'ruim'));
            s.timerJogo.timeScale=60;
            return s.score;
        })()`);
        assert.equal(expected, mobile ? -1 : 4);
        await until(() => get('jogoFinalizado'), 'Tempo não encerrou a partida');
        assert.equal(await get('timer'), 0);
        assert.equal(await get('physics.world.isPaused'), true);
        assert.equal(await get('touchControls.enabled'), false);
        assert.equal(await get('textoScore.visible || __checkedScene.textoTimer.visible'), false);
        const result = await get('resultadoUI.list.filter(o=>o.type==="Text").map(o=>o.text)');
        assert.deepEqual(result, ['Passeio finalizado!', 'Seu Score: ' + expected, 'Menu']);
        const bounds = await get('resultadoUI.list.find(o=>o.texture?.key === "pet-educa-ui-panel").getBounds()');
        assert.deepEqual(bounds, layout.panel, 'Resultado deve reaproveitar o balão centralizado');
        assert.equal(await evaluate(`(()=>{
            const s=__checkedScene,ui=s.resultadoUI;
            s.finalizarJogo();
            s.capturarItem(s.player,{tipo:'bom',destroy(){throw new Error('Coleta após o fim');}});
            return s.resultadoUI===ui && s.score===${expected};
        })()`), true);
        const positions = await get('children.list.filter(o=>o.tipo).map(o=>({x:o.x,y:o.y}))');
        await frames(20);
        assert.equal(await get('timer'), 0);
        assert.equal(await get('score'), expected);
        assert.deepEqual(await get('children.list.filter(o=>o.tipo).map(o=>({x:o.x,y:o.y}))'), positions, 'Alimentos continuam em movimento');
        await shot('food-result-' + (mobile ? 'mobile' : 'pc'));
        if(mobile) await touch(640,516); else await click(640,516);
        await until(() => attach('MainMenu'), 'Botão Menu do resultado não voltou ao menu');
    }

    await viewport(1280,720);
    await navigate('', 'Intro');
    await until(() => get('children.list.some(o=>o.texture?.key === "pet-educa-ui-button")'), 'Intro não construiu a interface');
    const reference = await get('children.list.filter(o=>["pet-educa-ui-panel","pet-educa-ui-button"].includes(o.texture?.key)).map(o=>({key:o.texture.key,x:o.x,y:o.y,scaleX:o.scaleX,scaleY:o.scaleY}))');
    await shot('intro-reference');
    await click(504,564);
    await until(() => attach('MainMenu'), 'Menu principal não abriu');
    await openFood();
    assert.equal(await get('jogoComecou'), false);
    assert.equal(await get('player'), null);
    assert.equal(await get('timerJogo'), null);
    assert.equal(await get('timerSpawn'), null);
    assert.equal(await get('botaoMenu.visible'), true);
    assert.deepEqual(await get('instrucoesUI.list.filter(o=>o.type === "Image").map(o=>({key:o.texture.key,x:o.x,y:o.y,scaleX:o.scaleX,scaleY:o.scaleY}))'), reference);
    assert.equal(await get('children.list.some(o=>o.texture?.key === "foodgame-street-background" && o.visible)'), true);
    assert.equal(await get('instrucoesUI.list.some(o=>["pet-educa-ui-park","pet-educa-ui-dog"].includes(o.texture?.key) || o.text === "Pet Educa")'), false);
    const layout = await evaluate('(()=>{const s=__checkedScene;return {panel:s.painelInstrucoes.getBounds(),button:s.botaoContinuar.getBounds(),texts:s.instrucoesUI.list.filter(o=>o.type==="Text"&&o.text!=="Pet Educa").map(o=>({text:o.text,bounds:o.getBounds(),font:o.style.fontFamily}))};})()');
    const panel = edges(layout.panel), button = edges(layout.button);
    assert.equal(panel.x + panel.width / 2, 640, 'Painel não centralizado horizontalmente');
    assert.equal(panel.y + panel.height / 2, 360, 'Painel não centralizado verticalmente');
    for (const item of layout.texts) {
        const b = edges(item.bounds);
        assert.ok(b.x >= panel.x + 16 && b.right <= panel.right - 16 && b.y >= panel.y + 16 && b.bottom <= panel.bottom - 12, 'Texto fora do painel: ' + item.text);
        if (item.text === 'Continuar') {
            assert.equal(item.font, 'Lilita One');
            assert.ok(b.x >= button.x && b.right <= button.right && b.y >= button.y && b.bottom <= button.bottom);
        } else {
            assert.equal(item.font, 'Nunito Sans');
            assert.ok(b.bottom <= button.y - 16, 'Texto sobrepõe Continuar');
        }
    }
    await shot('food-instructions-pc');
    await click(1172,44);
    await until(() => attach('MainMenu'), 'Menu não abriu nas instruções');
    pass('Painel das instruções sobre o cenário do jogo, sem parque/título/retrato; Menu disponível');

    await openFood();
    await click(640,516);
    assert.equal(await get('jogoComecou'), true);
    assert.equal(await get('instrucoesUI'), null);
    assert.equal(await get('botaoContinuar.scene === undefined'), true);
    assert.equal(await get('botaoMenu.enabled'), true);
    assert.equal(await get('score'), 0);
    assert.equal(await get('timer'), 60);
    assert.equal(await evaluate('(()=>{const s=__checkedScene,p=s.player,t=s.timerJogo,spawn=s.timerSpawn;s.iniciarJogo();return s.player===p&&s.timerJogo===t&&s.timerSpawn===spawn;})()'), true);
    const hud = await evaluate('({timer:__checkedScene.textoTimer.getBounds(),menu:__checkedScene.botaoMenu.background.getBounds()})');
    assert.ok(edges(hud.timer).right <= hud.menu.x - 16, 'Cronômetro sobrepõe Menu');
    await shot('food-gameplay-pc');
    const oldX = await get('player.x');
    await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
    await frames(10);
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
    await frames();
    assert.ok((await get('player.x')) > oldX);
    await frames(65);
    assert.ok((await get('timer')) < 60);
    assert.ok((await get('children.list.filter(o=>o.tipo === "bom" || o.tipo === "ruim").length')) > 0);
    await checkDropSpacing();
    await shot('food-drop-spacing-pc');
    await click(1172,44);
    await until(() => attach('MainMenu'), 'Menu não abriu durante a partida');
    pass('Início único, remoção das instruções, movimento, timer/spawn e Menu durante a partida');

    await openFood();
    await key('Enter','Enter',13);
    assert.equal(await get('jogoComecou'), true);
    await key('Escape','Escape',27);
    await until(() => attach('MainMenu'), 'Escape não voltou ao menu');
    pass('Reentrada, início por Enter e saída por Escape');

    await openFood();
    await click(640,516);
    await finishFood();
    pass('Fim em zero, Score final, balão único, partida parada e botão Menu no resultado');

    await viewport(844,390,true);
    await navigate('', 'Intro');
    await until(() => get('children.list.some(o=>o.texture?.key === "pet-educa-ui-button")'), 'Intro móvel não ficou pronta');
    await touch(504,564);
    await until(() => attach('MainMenu'), 'Menu móvel não abriu');
    await openFood(true);
    const mobilePanel = await get('painelInstrucoes.getBounds()');
    assert.equal(mobilePanel.x + mobilePanel.width / 2, 640);
    assert.equal(mobilePanel.y + mobilePanel.height / 2, 360);
    await shot('food-instructions-mobile');
    await touch(1172,44,true);
    assert.equal(await get('uiNavigating'), false);
    await touch(640,516);
    assert.equal(await get('jogoComecou'), true);
    assert.equal(await get('touchControls.enabled'), true);
    await shot('food-gameplay-mobile');
    const touchX = await get('player.x');
    const p = await point(250,532);
    await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p, id: 1, radiusX: 3, radiusY: 3, force: 1 }] });
    await frames(10);
    assert.ok((await get('player.x')) > touchX);
    await page.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await frames();
    assert.deepEqual(await get('touchControls.getDirection()'), { x: 0, y: 0 });
    await checkDropSpacing();
    await shot('food-drop-spacing-mobile');
    await touch(1172,44);
    await until(() => attach('MainMenu'), 'Menu por toque não abriu na partida');
    await openFood(true);
    assert.equal(await get('jogoComecou'), false);
    assert.equal(await get('player'), null);
    await touch(1172,44);
    await until(() => attach('MainMenu'), 'Menu por toque não abriu nas instruções');
    pass('Celular horizontal: instruções, Menu por toque, cancelamento e reentrada limpa');

    await openFood(true);
    await touch(640,516);
    await finishFood(true);
    await openFood(true);
    assert.equal(await get('resultadoUI'), null);
    await touch(640,516);
    assert.equal(await get('score'), 0);
    assert.equal(await get('timer'), 60);
    assert.equal(await get('physics.world.isPaused'), false);
    await touch(1172,44);
    await until(() => attach('MainMenu'), 'Menu não abriu após nova partida');
    pass('Resultado por toque, Score negativo preservado e nova partida com tempo/pontuação reiniciados');

    const failures = page.events.filter(e => e.method === 'Runtime.exceptionThrown' ||
        (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') ||
        (e.method === 'Network.responseReceived' && e.params.response.status >= 400 && e.params.response.url.includes('/assets/')));
    assert.deepEqual(failures, [], 'Erros de execução ou assets');
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ passed: true, checks: passed, viewports: ['1280x720','844x390'], renderer: 'Edge WebGL (SwiftShader)', errors: failures },null,2));
} catch(error) {
    console.error(error);
    if(page) {
        console.error(JSON.stringify(page.events.filter(e=>e.method==='Runtime.exceptionThrown').slice(-4),null,2));
        const shot = await page.send('Page.captureScreenshot', { format:'png' }).catch(()=>null);
        if(shot) await fs.writeFile(path.join(output,'failure.png'),Buffer.from(shot.data,'base64'));
    }
    process.exitCode = 1;
} finally {
    if(browser) await browser.send('Browser.close').catch(()=>{});
    sockets.forEach(ws=>ws.close()); edge.kill();
}
