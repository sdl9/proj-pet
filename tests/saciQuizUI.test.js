import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import { SACI_QUIZ_QUESTIONS as questions } from '../src/game/data/saciQuizQuestions.js';
import { SaciQuizRound } from '../src/game/systems/SaciQuizRound.js';

// Simula eventos e objetos Phaser. Não verifica renderização ou métricas da fonte.
const root = new URL('../', import.meta.url);
const read = file => fs.readFile(new URL(file, root), 'utf8');
const manifest = JSON.parse(await read('public/assets/quiz-saci/quiz-saci-assets-manifest.json'));
const assets = Object.fromEntries(manifest.images.map(asset => [asset.key, asset]));
const config = (await read('src/game/data/quizSaciVisualConfig.js')).replace(/^import .*;$/gm, '').replace(/export const /g, 'const ');
const layouts = new Function('QUIZ_SACI_MANIFEST', config + '\nreturn { base: QUIZ_SACI_LAYOUT, play: QUIZ_SACI_PLAY_LAYOUT };')(manifest);
const panelSource = (await read('src/game/ui/pixelPanel.js')).replace(/^import .*;$/gm, '').replace('export function ', 'function ');
const source = panelSource + (await read('src/game/ui/quizSaciUI.js')).replace(/^import .*;$/gm, '').replace('export function ', 'function ');

class DomEvents extends EventEmitter {
    addEventListener(event, listener) { this.on(event, listener); }
    removeEventListener(event, listener) { this.off(event, listener); }
}
function sceneDouble(rendererType) {
    const created = [];
    const textures = new Map(manifest.images.map(({key,size}) => [key, {
        getSourceImage: () => ({ width: size[0], height: size[1] })
    }]));
    const object = (type, x, y, key, width, height) => {
        const item = Object.assign(new EventEmitter(), { type, x, y, key, width, height, visible: true,
            setOrigin(x,y=x) { this.originX=x;this.originY=y;return this; },
            setScale(scale) { this.scaleX=scale;this.scaleY=scale;return this; },
            setTexture(key) { this.key=key;return this; },
            setVisible(visible) { this.visible=visible;return this; },
            setText(text) { this.text=text;return this; },
            setFontSize(size) { this.style.fontSize=size;return this; },
            setSlices(width,height,left,right,top,bottom) { Object.assign(this,{width,height,left,right,top,bottom});return this; },
            setInteractive() { this.enabled=true;return this; },
            disableInteractive() { this.enabled=false;return this; }
        });created.push(item);return item;
    };
    const scene = {
        created,
        add: {
            image: (x,y,key) => object('Image',x,y,key,...(assets[key]?.size || [0,0])),
            nineslice: (x,y,key,frame,...slices) => object('NineSlice',x,y,key).setSlices(...slices),
            text: (x,y,text,style) => Object.assign(object('Text',x,y),{text,style}),
            zone: (x,y,width,height) => object('Zone',x,y,null,width,height)
        },
        textures: {
            exists: key => textures.has(key), get: key => textures.get(key),
            createCanvas(key,width,height) {
                const texture = { width,height,draws:[],context:{imageSmoothingEnabled:true},
                    refresh() {return this;},setFilter() {return this;} };
                texture.context.drawImage = (...args) => texture.draws.push(args);
                textures.set(key,texture);return texture;
            }
        },
        input: Object.assign(new EventEmitter(), { keyboard: new EventEmitter() }),
        events: new EventEmitter(), game: { renderer:{type:rendererType}, events:new EventEmitter(),canvas:new DomEvents() },
        scene: { start(key) {this.started=key;} }
    };
    return {scene,textures};
}

function harness(renderer = 2) {
    const dom = new DomEvents();
    const build = new Function('CANVAS', 'Textures', 'QUIZ_SACI_ASSETS', 'QUIZ_SACI_MANIFEST', 'layout', 'QUIZ_SACI_PLAY_LAYOUT', 'PET_EDUCA_UI', 'window',
        source + '\nreturn buildQuizSaciUI;')(1, { FilterMode: { NEAREST: 0 } }, assets, manifest, layouts.base, layouts.play, { fonts: { body: 'Nunito Sans' } }, dom);
    const { scene } = sceneDouble(renderer);
    const round = new SaciQuizRound(questions);
    let ui;
    const present = () => {
        const question = round.currentQuestion;
        ui.showQuestion(question.pergunta, question.alternativas, round.index + 1, round.total);
    };
    ui = build(scene, { question: '', answers: ['', '', ''] }, {
        play: true,
        onAnswer: letter => {
            const result = round.answer(letter);
            if (result) ui.showFeedback(result, round.isLastQuestion);
        },
        onNext: () => {
            if (!round.advance()) return;
            if (round.phase === 'complete') ui.showCompletion(round.hits, round.total);
            else present();
        },
        onRestart: () => { round.reset(); present(); }
    });
    present();
    const click = (control, id = 0, wasTouch = false) => {
        control.hit.emit('pointerdown', { id, wasTouch });
        control.hit.emit('pointerup', { id, wasTouch });
        scene.input.emit('pointerup', { id, wasTouch });
    };
    return { scene, round, ui, dom, click };
}

for (const renderer of [2, 1]) {
    const label = renderer === 2 ? 'WebGL API' : 'Canvas slices';
    test(label + ': erro, destaque correto, input bloqueado e avanço duplo', () => {
        const { scene, round, ui, click } = harness(renderer);
        assert.equal(ui.indicator.text, 'Pergunta 1 de 15');
        assert.equal(ui.next.panel.visible, false);
        assert.equal(ui.feedbackText.visible, false);
        assert.ok(ui.answers.every(answer => answer.enabled && answer.state === 'normal'));
        // A primeira soltura bloqueia imediatamente o segundo toque já ativo.
        ui.answers[0].hit.emit('pointerdown', { id: 1, wasTouch: true });
        ui.answers[1].hit.emit('pointerdown', { id: 2, wasTouch: true });
        ui.answers[0].hit.emit('pointerup', { id: 1, wasTouch: true });
        ui.answers[1].hit.emit('pointerup', { id: 2, wasTouch: true });
        assert.equal(round.feedback.chosen, 'A');
        assert.equal(round.hits, 0);
        assert.deepEqual(ui.answers.map(answer => answer.state), ['wrong', 'correct', 'disabled']);
        assert.ok(ui.answers.every(answer => !answer.enabled && !answer.hit.enabled && !answer.hovered));
        assert.equal(ui.answers[0].feedback.visible, true);
        assert.equal(ui.answers[1].feedback.visible, true);
        assert.equal(ui.answers[2].feedback.visible, false);
        assert.equal(ui.feedbackText.text, 'Vamos aprender! A resposta correta é B: ' + questions[0].alternativas[1]);
        assert.equal(ui.next.label.text, 'Próxima');
        click(ui.answers[1]);
        assert.equal(round.hits, 0);
        click(ui.next); click(ui.next);
        assert.equal(round.index, 1);
        assert.equal(ui.indicator.text, 'Pergunta 2 de 15');
        assert.equal(ui.question.text, questions[1].pergunta);
        assert.deepEqual(ui.answers.map(answer => answer.label.text), questions[1].alternativas);
        assert.ok(ui.answers.every(answer => answer.enabled && answer.state === 'normal' && !answer.feedback.visible));
        assert.equal(ui.feedbackText.visible, false);
        assert.equal(ui.next.panel.visible, false);
        scene.events.emit('shutdown');
    });

    test(label + ': Menu permite sair antes de responder, no feedback e na próxima pergunta', () => {
        for (const phase of ['question', 'feedback', 'next']) {
            for (const wasTouch of [false, true]) {
                const { scene, round, ui, click } = harness(renderer);
                if (phase !== 'question') click(ui.answers[1]);
                if (phase === 'next') click(ui.next);
                assert.equal(ui.exitMenu.panel.visible, true);
                assert.equal(ui.exitMenu.enabled, true);
                assert.equal(ui.exitMenu.label.text, 'Menu');
                const before = [round.index, round.hits, round.phase];
                click(ui.exitMenu, 0, wasTouch);
                assert.equal(scene.scene.started, 'MainMenu');
                assert.deepEqual([round.index, round.hits, round.phase], before);
                scene.events.emit('shutdown');
                assert.equal(scene.input.listenerCount('pointerup'), 0);
            }
        }
    });

    test(label + ': mouse/toque cancelados não respondem; foco e teclado funcionam', () => {
        const { scene, round, ui, dom } = harness(renderer);
        const first = ui.answers[0];
        for (const cancel of [() => scene.game.canvas.emit('touchcancel'), () => dom.emit('blur'), () => scene.input.emit('gameout')]) {
            first.hit.emit('pointerdown', { id: 0 }); cancel(); first.hit.emit('pointerup', { id: 0 });
            assert.equal(round.phase, 'question');
        }
        first.hit.emit('pointerdown', { id: 0 }); first.hit.emit('pointerout', { id: 0 }); first.hit.emit('pointerup', { id: 0 });
        assert.equal(round.phase, 'question');
        const key = code => ({ code, target: {}, preventDefault() {} });
        scene.input.keyboard.emit('keydown', key('ArrowDown'));
        scene.input.keyboard.emit('keydown', key('ArrowDown'));
        scene.input.keyboard.emit('keydown', key('Space'));
        assert.equal(ui.answers[1].state, 'selected');
        scene.input.keyboard.emit('keyup', key('Space'));
        assert.equal(round.hits, 1);
        assert.equal(ui.answers[1].state, 'correct');
        scene.events.emit('shutdown');
        assert.equal(scene.input.listenerCount('pointerup'), 0);
        assert.equal(scene.input.keyboard.listenerCount('keydown'), 0);
        assert.equal(dom.listenerCount('blur'), 0);
    });

    test(label + ': 15 respostas, Finalizar, resultado, reinício e menu', () => {
        const { scene, round, ui, click } = harness(renderer);
        const listenerCount = scene.input.listenerCount('pointerup');
        for (let game = 0; game < 2; game++) {
            questions.forEach((question, index) => {
                const answer = ui.answers['ABC'.indexOf(question.correta)];
                click(answer, 0, game === 1);
                assert.equal(round.hits, index + 1);
                assert.equal(ui.feedbackText.text, 'Muito bem!');
                assert.equal(ui.next.label.text, index === 14 ? 'Finalizar' : 'Próxima');
                click(ui.next);
            });
            assert.equal(round.phase, 'complete');
            assert.equal(ui.question.text, 'Você terminou o Quiz do Saci!');
            assert.ok(scene.created.some(item => item.text === 'Você acertou 15 de 15 perguntas' && item.visible));
            assert.ok(ui.answers.every(answer => !answer.panel.visible && !answer.enabled));
            assert.equal(ui.restart.panel.visible, true);
            assert.equal(ui.menu.panel.visible, true);
            assert.equal(ui.exitMenu.panel.visible, false);
            assert.equal(scene.input.listenerCount('pointerup'), listenerCount);
            if (game === 0) {
                click(ui.restart);
                assert.equal(round.hits, 0);
                assert.equal(round.index, 0);
                assert.ok(ui.answers.every(answer => answer.enabled && answer.state === 'normal'));
                assert.equal(ui.feedbackText.visible, false);
                assert.equal(ui.restart.panel.visible, false);
                assert.equal(ui.exitMenu.panel.visible, true);
            }
        }
        click(ui.menu);
        assert.equal(scene.scene.started, 'MainMenu');
        scene.events.emit('shutdown');
    });
}


test('SaciGame separa demo de partida mesmo quando Phaser reutiliza os dados da cena', async () => {
    const sceneSource = (await read('src/game/scenes/SaciGame.js'))
        .replace(/^import .*;$/gm, '').replace('export class ', 'class ')
        .replaceAll('import.meta.env.DEV', 'true');
    let inspectors = 0;
    const screens = [];
    const SceneClass = new Function('Scene', 'prepareQuizSaciTextures', 'QUIZ_SACI_DEMO_TEXT', 'SACI_QUIZ_QUESTIONS', 'SaciQuizRound',
        'createPetEducaScreen', 'buildQuizSaciUI', 'addQuizVisualInspector', sceneSource + '\nreturn SaciGame;')(
        class {}, () => {}, { question: 'Demo', answers: ['A', 'B', 'C'] }, questions, SaciQuizRound,
        (scene, build) => build(),
        (scene, content, options) => {
            const screen = { content, options, showQuestion(...args) { this.question = args; } };
            screens.push(screen); return screen;
        }, () => inspectors++
    );
    const scene = new SceneClass();
    const persistentData = { visualDemo: true };
    scene.create(persistentData);
    assert.equal(scene.round, null);
    assert.equal(inspectors, 1);
    assert.equal(persistentData.visualDemo, false);
    scene.create(persistentData);
    assert.equal(scene.round.currentQuestion.id, 1);
    assert.equal(scene.round.hits, 0);
    assert.equal(screens[1].options.play, true);
    assert.equal(screens[1].question[0], questions[0].pergunta);
    assert.equal(inspectors, 1);
});
