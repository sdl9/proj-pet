import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { WALK_DIALOGUES } from '../src/game/data/walkDialogues.js';

// Teste local com Edge headless, seguindo os checks de navegador já usados no projeto.
const baseURL = process.env.WALK_UI_URL || 'http://localhost:8080';
const output = path.resolve('tmp/walk-ui-validation');
await fs.mkdir(output, { recursive: true });
const profile = await fs.mkdtemp(path.join(tmpdir(), 'walk-ui-check-'));
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
    async function approach(id) {
        await evaluate('(()=>{const s=__checkedScene; const p=s.interactionSystem.interactions.find(i=>i.id===' + JSON.stringify(id) + ');s.player.body.reset(p.x,p.y+48);s.cameras.main.centerOn(p.x,p.y+48);})()');
        await frames(5);
        assert.equal(await get('interactionSystem.current?.id'), id);
    }
    async function geometry() {
        const data = await get('dialogueSystem.buttons.filter(b=>b.visible).map(b=>({label:b.text.text,text:b.text.getBounds(),box:b.background.getBounds(),scaleX:b.background.scaleX,scaleY:b.background.scaleY,left:b.background.leftWidth,right:b.background.rightWidth}))');
        for (const b of data) {
            for (const rect of [b.text, b.box]) { rect.right = rect.x + rect.width; rect.bottom = rect.y + rect.height; }
            assert.equal(b.scaleX, 2); assert.equal(b.scaleY, 2);
            assert.equal(b.left, 8); assert.equal(b.right, 8);
            assert.ok(b.box.x >= 0 && b.box.y >= 0 && b.box.right <= 1280 && b.box.bottom <= 720, b.label);
            assert.ok(b.text.x >= b.box.x + 8 && b.text.right <= b.box.right - 8 && b.text.y >= b.box.y + 4 && b.text.bottom <= b.box.bottom - 4, 'Texto fora do botão: ' + b.label);
        }
        const body = await evaluate('({bounds:__checkedScene.dialogueSystem.bodyText.getBounds(),mode:__checkedScene.dialogueSystem.mode,firstTopic:__checkedScene.dialogueSystem.topicButtons[0].background.y})');
        body.bounds.bottom = body.bounds.y + body.bounds.height;
        assert.ok(body.bounds.bottom <= (body.mode === 'topics' ? body.firstTopic - 8 : 604), 'Fala sobrepõe controles');
    }
    function pass(name) { passed.push(name); console.log('PASS ' + name); }

    await viewport(1280, 720);
    await navigate('?walkLearning', 'WalkGameLearning');
    assert.equal(await get('dialogueSystem.bodyText.style.fontFamily'), 'Nunito Sans');
    assert.equal(await get('dialogueSystem.bodyText.style.color'), '#342B24');
    assert.equal(await get('dialogueSystem.panel.scrollFactorX'), 0);
    assert.equal(await get('dialogueSystem.panel.scaleX'), 1);
    assert.equal(await get('dialogueSystem.buttons.some(b=>b.hit.input?.enabled)'), false);
    await approach('guia');
    await shot('walk-prompt-pc');
    await mouse('mouseMoved', 1050, 650);
    assert.equal(await get('interactionSystem.promptButton.state'), 'hover');
    await mouse('mousePressed', 1050, 650);
    assert.equal(await get('interactionSystem.promptButton.state'), 'selected');
    await mouse('mouseReleased', 1050, 650);
    assert.equal(await get('dialogueSystem.speakerText.text'), 'Tutor com cachorro');
    await geometry(); await shot('walk-dialogue-pc');
    assert.equal(await get('player.body.velocity.length()'), 0);
    await click(904, 652);
    assert.equal(await get('dialogueSystem.isOpen()'), false);
    assert.equal(await get('dialogueSystem.buttons.some(b=>b.hit.input?.enabled)'), false);
    pass('Prompt normal/hover/pressionado, diálogo, fechamento e input oculto');

    for (const [id, name] of [['feevalepet','Voluntária FeevalePet'],['descanso','Pessoa no banco'],['agua','Bebedouro']]) {
        await approach(id); await click(1050, 650);
        assert.equal(await get('dialogueSystem.speakerText.text'), name);
        await geometry(); await click(904, 652);
    }
    pass('NPCs e câmera em posições diferentes');

    await approach('veterinaria'); await click(1050, 650);
    assert.equal(await get('dialogueSystem.mode'), 'topics');
    await geometry(); await shot('walk-topics-pc');
    await mouse('mouseMoved', 440, 520);
    assert.equal(await get('dialogueSystem.topicButtons[0].state'), 'hover');
    await mouse('mousePressed', 440, 520);
    assert.equal(await get('dialogueSystem.topicButtons[0].state'), 'selected');
    await shot('walk-action-pressed');
    await mouse('mouseReleased', 440, 520);
    assert.equal(await get('dialogueSystem.pageIndex'), 0);
    await geometry(); await click(1112, 652);
    assert.equal(await get('dialogueSystem.pageIndex'), 1);
    await geometry(); await click(1112, 652);
    assert.equal(await get('dialogueSystem.mode'), 'topics');
    assert.equal(await get('dialogueSystem.completedLessons.has("guarda")'), true);
    assert.ok((await get('dialogueSystem.topicButtons[0].text.text')).startsWith('✓ '));
    await get('dialogueSystem.closeButton.setEnabled(false)');
    assert.equal(await get('dialogueSystem.closeButton.state'), 'disabled');
    await shot('walk-action-disabled'); await click(904, 652);
    assert.equal(await get('dialogueSystem.isOpen()'), true);
    await get('dialogueSystem.closeButton.setEnabled(true)'); await click(904, 652);
    pass('Tópicos, paginação, recompensa e estado desabilitado');

    await evaluate("import('/src/game/data/walkDialogues.js').then(({WALK_DIALOGUES})=>{__checkedScene.dialogueSystem.showPages(WALK_DIALOGUES.intro,()=>__checkedScene.dialogueSystem.close());})");
    await frames(); await geometry(); await shot('walk-long-dialogue-pc');
    await click(904, 652);
    const allPages = [...Object.values(WALK_DIALOGUES).filter(Array.isArray).flat(),
        ...WALK_DIALOGUES.veterinaria.topics.flatMap(topic => topic.pages)];
    for (const speech of allPages) {
        await evaluate('__checkedScene.dialogueSystem.showPages(' + JSON.stringify([speech]) + ',()=>__checkedScene.dialogueSystem.close())');
        await frames(); await geometry();
        assert.equal(await get('dialogueSystem.bodyText.text'), speech.text);
    }
    for (const [key, code, number] of [['Tab','Tab',9],['Tab','Tab',9]]) {
        await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code, windowsVirtualKeyCode: number });
        await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: number });
        await frames();
    }
    assert.equal(await get('dialogueSystem.nextButton.state'), 'hover');
    await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await frames();
    assert.equal(await get('dialogueSystem.isOpen()'), false);
    pass('Foco por Tab e ativação por Enter');
    pass('Todas as falas com a fonte real, sem corte ou sobreposição (' + allPages.length + ' páginas)');

    await viewport(844, 390, true);
    await navigate('?walkLearning', 'WalkGameLearning');
    assert.equal(await get('touchControls.enabled'), true);
    await shot('walk-mobile-controls');
    const before = await get('player.y');
    const up = await point(154, 436);
    await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...up, id: 1, radiusX: 3, radiusY: 3, force: 1 }] });
    await frames(10);
    assert.equal(await get('touchControls.frames.get("up").object.texture.key'), 'quiz-saci-answer-panel-selected');
    assert.ok((await get('player.y')) < before);
    await page.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await frames();
    assert.deepEqual(await get('touchControls.getDirection()'), { x: 0, y: 0 });
    await approach('veterinaria'); await touch(1050, 650);
    assert.equal(await get('dialogueSystem.mode'), 'topics');
    assert.equal(await get('touchControls.enabled'), false);
    await geometry(); await shot('walk-topics-mobile');
    await touch(440, 592, true);
    assert.equal(await get('dialogueSystem.mode'), 'topics');
    assert.notEqual(await get('dialogueSystem.topicButtons[1].state'), 'selected');
    await touch(440, 592);
    assert.equal(await get('dialogueSystem.mode'), 'pages');
    await geometry(); await shot('walk-dialogue-mobile');
    await touch(904, 652);
    assert.equal(await get('dialogueSystem.isOpen()'), false);
    assert.equal(await get('touchControls.enabled'), true);
    assert.equal(await get('dialogueSystem.buttons.some(b=>b.hit.input?.enabled)'), false);
    pass('Celular horizontal: escala, direcional, toque, cancelamento, bloqueio e reabertura');

    await viewport(1280, 720);
    await navigate('?walkLearning', 'WalkGameLearning');
    for (const id of ['guia', 'feevalepet', 'descanso', 'agua']) {
        await approach(id); await click(1050, 650); await click(1112, 652);
        assert.equal(await get('dialogueSystem.isOpen()'), false);
    }
    assert.equal(await get('dialogueSystem.completedLessons.size'), 4);
    await approach('veterinaria'); await click(1050, 650);
    for (const [index, y] of [520,592,664].entries()) {
        await click(440, y); await click(1112,652); await click(1112,652);
        assert.equal(await get('dialogueSystem.completedLessons.size'), 5 + index);
    }
    assert.equal(await get('dialogueSystem.speakerText.text'), 'Passeio concluído!');
    assert.equal(await get('dialogueSystem.progressText.text'), 'Cuidados: 7/7');
    await geometry(); await shot('walk-completion-pc'); await click(1112,652);
    assert.equal(await get('dialogueSystem.isOpen()'), false);
    pass('Cinco pontos, sete cuidados, três tópicos e conclusão preservados');

    assert.equal(await get('menuUI.visible'), true);
    assert.equal(await get('menuButton.hit.scrollFactorX'), 0);
    await shot('walk-menu-pc');
    await click(1172, 44);
    await until(() => attach('MainMenu'), 'Menu não abriu ao sair do passeio');
    await click(500, 408); // Cartão existente do Passeio Consciente.
    await until(() => attach('WalkGameLearning'), 'Passeio não reabriu pelo menu');
    assert.equal(await get('dialogueSystem.completedLessons.size'), 0);
    await approach('guia'); await click(1050,650);
    assert.equal(await get('menuButton.visible'), true);
    await click(1172,44);
    await until(() => attach('MainMenu'), 'Menu não abriu durante o diálogo');
    pass('Menu no PC durante exploração/diálogo e reentrada pelo cartão');

    await viewport(844,390,true);
    await navigate('?walkLearning', 'WalkGameLearning');
    await touch(1172,44,true);
    assert.equal(await get('sys.isActive()'), true);
    await approach('veterinaria'); await touch(1050,650);
    assert.equal(await get('menuButton.visible'), true);
    await shot('walk-menu-mobile');
    await touch(1172,44);
    await until(() => attach('MainMenu'), 'Menu por toque não abriu durante diálogo');
    await touch(500,408);
    await until(() => attach('WalkGameLearning'), 'Passeio não reabriu por toque');
    assert.equal(await get('menuButton.enabled'), true);
    assert.equal(await get('dialogueSystem.isOpen()'), false);
    await touch(1172,44);
    await until(() => attach('MainMenu'), 'Menu por toque não abriu durante exploração');
    pass('Menu por toque, cancelamento e reabertura no celular horizontal');
    await viewport(1280,720);

    await navigate('?saciQuiz', 'SaciGame');
    await until(() => evaluate('Boolean(__checkedScene.quizUI?.indicator)'), 'Quiz não inicializou');
    assert.equal(await get('quizUI.questionPanel.width'), 480);
    assert.equal(await get('quizUI.questionPanel.scaleX'), 2);
    assert.equal(await get('quizUI.indicator.text'), 'Pergunta 1 de 15');
    await shot('quiz-reference-pc');
    await click(600, 424);
    assert.equal(await get('round.hits'), 1);
    assert.equal(await get('quizUI.answers[1].state'), 'correct');
    await click(1120, 660);
    assert.equal(await get('round.index'), 1);
    pass('Quiz do Saci preservado: moldura, resposta e avanço');

    const failures = page.events.filter(e => e.method === 'Runtime.exceptionThrown' ||
        (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') ||
        (e.method === 'Network.responseReceived' && e.params.response.status >= 400 && e.params.response.url.includes('/assets/')));
    assert.deepEqual(failures, [], 'Erros de execução ou carregamento');
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ passed: true, checks: passed, renderer: 'Edge WebGL (SwiftShader)', viewports: ['1280x720','844x390'], errors: failures }, null, 2));
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
