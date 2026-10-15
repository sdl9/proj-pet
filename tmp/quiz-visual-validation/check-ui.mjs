import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

const root = new URL('../../', import.meta.url);
const read = relative => fs.readFile(new URL(relative, root), 'utf8');
const manifest = JSON.parse(await read('public/assets/quiz-saci/quiz-saci-assets-manifest.json'));
const assets = Object.fromEntries(manifest.images.map(asset => [asset.key, asset]));
const configSource = (await read('src/game/data/quizSaciVisualConfig.js'))
    .replace(/^import .*;$/gm, '').replace(/export const /g, 'const ');
const { layout, content } = new Function('QUIZ_SACI_MANIFEST', configSource + '\nreturn { layout: QUIZ_SACI_LAYOUT, content: QUIZ_SACI_DEMO_TEXT };')(manifest);
const source = (await read('src/game/ui/quizSaciUI.js')).replace(/^import .*;$/gm, '').replace('export function ', 'function ');
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
const dom = new DomEvents();
const build = new Function('CANVAS','Textures','QUIZ_SACI_ASSETS','QUIZ_SACI_MANIFEST','layout','PET_EDUCA_UI','window',
    source + '\nreturn buildQuizSaciUI;')(1,{FilterMode:{NEAREST:0}},assets,manifest,layout,{fonts:{body:'Nunito Sans'}},dom);
for (const renderer of [2,1]) {
    const {scene,textures}=sceneDouble(renderer);
    const ui=build(scene,content);
    assert.equal(ui.portrait.type,'Image');
    assert.equal(ui.portrait.key,'quiz-saci-portrait');
    assert.deepEqual([ui.portrait.x,ui.portrait.y,ui.portrait.scaleX],[48,40,2]);
    assert.deepEqual([ui.questionPanel.x,ui.questionPanel.y],[272,40]);
    assert.equal(scene.created.filter(item=>item.enabled).length,3);
    ui.answers.forEach((answer,index)=>{
        assert.deepEqual([answer.hit.x,answer.hit.y,answer.hit.width,answer.hit.height],[64,[300,436,572][index],1168,112]);
        assert.deepEqual([answer.letter.x,answer.letter.y,answer.letter.originX,answer.letter.originY],[112,[356,492,628][index],0.5,0.5]);
        assert.equal(answer.label.scaleX,undefined);
        assert.equal(answer.label.style.wordWrap.width,888);
        for (const state of manifest.states) {
            answer.setState(state);
            assert.equal(answer.state,state);
            assert.ok(answer.badge.key.endsWith('-'+state));
            assert.ok(answer.panel.key.includes('-'+state));
            assert.equal(answer.hit.enabled,state!=='disabled');
            assert.equal(answer.feedback.visible,['correct','wrong'].includes(state));
            if(answer.feedback.visible) assert.equal(answer.feedback.key,manifest.feedback[state+'Icon']);
            assert.deepEqual([answer.panel.originX,answer.panel.originY,answer.panel.scaleX,answer.panel.scaleY],[0,0,2,2]);
            if(renderer===2) assert.deepEqual([answer.panel.width,answer.panel.height,answer.panel.left,answer.panel.right,answer.panel.top,answer.panel.bottom],[516,56,8,8,8,8]);
        }
        answer.setState('normal');
    });
    const answer=ui.answers[0];
    answer.hit.emit('pointerover',{id:0,wasTouch:false});assert.equal(answer.state,'hover');
    answer.hit.emit('pointerdown',{id:0});assert.equal(answer.state,'selected');
    scene.input.emit('pointerup',{id:0});assert.equal(answer.state,'hover');
    answer.hit.emit('pointerout',{id:0});assert.equal(answer.state,'normal');
    answer.hit.emit('pointerover',{id:1,wasTouch:true});
    answer.hit.emit('pointerdown',{id:1});assert.equal(answer.state,'selected');
    scene.input.emit('pointerupoutside',{id:1});assert.equal(answer.state,'normal');
    answer.hit.emit('pointerdown',{id:1});scene.game.canvas.emit('touchcancel');assert.equal(answer.state,'normal');
    answer.hit.emit('pointerdown',{id:1});dom.emit('blur');assert.equal(answer.state,'normal');
    scene.input.keyboard.emit('keydown',{code:'ArrowUp',target:{},preventDefault(){}});assert.equal(ui.answers[2].state,'hover');
    scene.input.keyboard.emit('keydown',{code:'Space',target:{},preventDefault(){}});assert.equal(ui.answers[2].state,'selected');
    scene.input.keyboard.emit('keyup',{code:'Space'});assert.equal(ui.answers[2].state,'hover');
    if(renderer===1) {
        const texture=textures.get('quiz-saci-answer-panel-normal-slice-516x56');
        assert.equal(texture.draws.length,9);
        assert.equal(texture.context.imageSmoothingEnabled,false);
        assert.deepEqual(texture.draws[0].slice(1),[0,0,8,8,0,0,8,8]);
        assert.deepEqual(texture.draws[8].slice(1),[56,56,8,8,508,48,8,8]);
        const separator=textures.get('quiz-saci-separator-slice-592x4');
        assert.equal(separator.draws.length,3);
        assert.deepEqual(separator.draws[2].slice(1),[60,0,4,4,588,0,4,4]);
    }
    scene.events.emit('shutdown');
    assert.equal(scene.input.listenerCount('pointerup'),0);
    assert.equal(dom.listenerCount('blur'),0);
    console.log((renderer===2?'WebGL API':'Canvas slices') + ': geometry, six states, pointer/keyboard release, cancellation and cleanup passed (scene double; no browser rendering).');
}
