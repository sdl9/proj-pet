import { Textures } from 'phaser';
import { addSlicedPanel } from './pixelPanel';
import { PET_EDUCA_UI } from './petEducaUI';

// Mesma fonte e cor efetivamente utilizadas pelo Quiz do Saci.
export const walkTextStyle = (fontSize, extra = {}) => ({
    fontFamily: PET_EDUCA_UI.fonts.body, fontStyle: '700', fontSize,
    color: PET_EDUCA_UI.colors.brown, padding: { top: 2, bottom: 2 }, ...extra
});

export function createWalkPanel(scene, x, y, width, height) {
    const key = 'quiz-saci-question-panel';
    scene.textures.get(key).setFilter(Textures.FilterMode.NEAREST);
    return addSlicedPanel(scene, key, x, y, width, height);
}

export function createWalkActionFrame(scene, x, y, width, height) {
    ['normal', 'hover', 'selected', 'disabled'].forEach(state =>
        scene.textures.get('quiz-saci-answer-panel-' + state).setFilter(Textures.FilterMode.NEAREST));
    return addSlicedPanel(scene, 'quiz-saci-answer-panel-normal', x, y, width, height);
}

// Coordenadas do canto superior esquerdo; container pai deve permanecer em escala 1.
export function createWalkButton(scene, x, y, width, height, label, onActivate, fontSize = 26) {
    const frame = createWalkActionFrame(scene, x, y, width, height);
    const text = scene.add.text(x + width / 2, y + height / 2, label,
        walkTextStyle(fontSize, { align: 'center', wordWrap: { width: width - 32 } })).setOrigin(0.5);
    // A zona não é renderizada pelo container; fixa seu fator também para o hit test.
    const hit = scene.add.zone(x, y, width, height).setOrigin(0).setScrollFactor(0);
    const pressed = new Set();
    const button = {
        background: frame.object, text, hit, visible: true, enabled: true, hovered: false, focused: false,
        state: 'normal',
        refresh() {
            this.state = !this.enabled ? 'disabled' : pressed.size ? 'selected'
                : this.hovered || this.focused ? 'hover' : 'normal';
            frame.setStateTexture('quiz-saci-answer-panel-' + this.state);
        },
        reset() { pressed.clear(); this.hovered = false; this.focused = false; this.refresh(); },
        updateInput() {
            if (this.visible && this.enabled) hit.setInteractive({ useHandCursor: true });
            else { hit.disableInteractive(true); this.reset(); }
        },
        setVisible(visible) {
            this.visible = visible;
            [frame.object, text, hit].forEach(object => object.setVisible(visible));
            this.updateInput();
        },
        setEnabled(enabled) { this.enabled = enabled; this.reset(); this.updateInput(); },
        setFocused(focused) { this.focused = focused && this.visible && this.enabled; this.refresh(); },
        activate() {
            if (!this.visible || !this.enabled) return;
            pressed.clear(); this.refresh(); onActivate();
        }
    };
    hit.on('pointerover', pointer => {
        if (button.visible && button.enabled) { button.hovered = !pointer.wasTouch; button.refresh(); }
    });
    hit.on('pointerdown', pointer => {
        if (button.visible && button.enabled) { pressed.add(pointer.id); button.refresh(); }
    });
    hit.on('pointerout', pointer => {
        pressed.delete(pointer.id); button.hovered = false; button.refresh();
    });
    hit.on('pointerup', pointer => {
        if (pressed.has(pointer.id)) button.activate();
    });
    const release = pointer => { pressed.delete(pointer.id); button.refresh(); };
    const cancel = () => button.reset();
    scene.input.on('pointerup', release);
    scene.input.on('pointerupoutside', release);
    scene.input.on('gameout', cancel);
    scene.events.on('pause', cancel);
    window.addEventListener('blur', cancel);
    scene.game.canvas.addEventListener('pointercancel', cancel);
    scene.game.canvas.addEventListener('touchcancel', cancel);
    scene.events.once('shutdown', () => {
        scene.input.off('pointerup', release);
        scene.input.off('pointerupoutside', release);
        scene.input.off('gameout', cancel);
        scene.events.off('pause', cancel);
        window.removeEventListener('blur', cancel);
        scene.game.canvas.removeEventListener('pointercancel', cancel);
        scene.game.canvas.removeEventListener('touchcancel', cancel);
    });
    button.updateInput();
    return button;
}
