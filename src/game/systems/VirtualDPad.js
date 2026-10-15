import { createWalkActionFrame, walkTextStyle } from '../ui/walkUI';

const BUTTON_SIZE = 90;
const STEP = 96;

const DIRECTIONS = [
    { name: 'up', label: '▲', x: 0, y: -STEP },
    { name: 'down', label: '▼', x: 0, y: STEP },
    { name: 'left', label: '◀', x: -STEP, y: 0 },
    { name: 'right', label: '▶', x: STEP, y: 0 }
];

export class VirtualDPad {
    constructor(scene, visible) {
        this.scene = scene;
        this.pressed = new Map();
        this.buttons = new Map();
        this.frames = new Map();
        this.hovered = new Set();
        this.visuals = [];
        this.enabled = null;

        const centerX = 154;
        const centerY = scene.scale.height - 188;
        DIRECTIONS.forEach(({ name, label, x, y }) => {
            const frame = createWalkActionFrame(scene, centerX + x - BUTTON_SIZE / 2,
                centerY + y - BUTTON_SIZE / 2, BUTTON_SIZE, BUTTON_SIZE);
            const background = frame.object.setScrollFactor(0).setDepth(20001).setInteractive();
            const text = scene.add.text(centerX + x, centerY + y, label, walkTextStyle(38))
                .setOrigin(0.5).setScrollFactor(0).setDepth(20002);
            this.frames.set(name, frame);
            background.on('pointerover', pointer => {
                if (this.enabled && !pointer.wasTouch) { this.hovered.add(name); this.refreshButtons(); }
            });
            background.on('pointerout', () => { this.hovered.delete(name); this.refreshButtons(); });

            background.on('pointerdown', (pointer) => this.press(pointer, name));
            background.on('pointerout', (pointer) => this.release(pointer, name));
            this.buttons.set(name, background);
            this.visuals.push(background, text);
        });

        scene.input.on('pointerup', this.release, this);
        scene.input.on('pointerupoutside', this.release, this);
        scene.input.on('gameout', this.clear, this);
        scene.events.on('pause', this.clear, this);
        scene.events.once('shutdown', this.destroy, this);

        this.onWindowBlur = () => this.clear();
        this.onPointerCancel = () => this.clear();
        this.onVisibilityChange = () => {
            if (document.hidden) this.clear();
        };
        window.addEventListener('blur', this.onWindowBlur);
        scene.game.canvas.addEventListener('pointercancel', this.onPointerCancel);
        scene.game.canvas.addEventListener('touchcancel', this.onPointerCancel);
        document.addEventListener('visibilitychange', this.onVisibilityChange);

        this.setEnabled(visible);
    }

    press(pointer, direction) {
        if (!this.enabled) return;
        this.pressed.set(pointer.id, direction);
        this.refreshButtons();
    }

    release(pointer, direction) {
        if (typeof direction === 'string'
            && this.pressed.get(pointer.id) !== direction) return;
        this.pressed.delete(pointer.id);
        this.refreshButtons();
    }

    getDirection() {
        if (!this.enabled) return { x: 0, y: 0 };

        const active = new Set(this.pressed.values());
        return {
            x: Number(active.has('right')) - Number(active.has('left')),
            y: Number(active.has('down')) - Number(active.has('up'))
        };
    }

    clear() {
        this.pressed.clear();
        this.hovered.clear();
        this.refreshButtons();
    }

    refreshButtons() {
        const active = new Set(this.pressed.values());
        this.frames.forEach((frame, name) => {
            const state = !this.enabled ? 'disabled' : active.has(name) ? 'selected'
                : this.hovered.has(name) ? 'hover' : 'normal';
            frame.setStateTexture('quiz-saci-answer-panel-' + state);
        });
    }

    setEnabled(enabled) {
        if (this.enabled === enabled) return;
        this.enabled = enabled;
        if (!enabled) this.clear();
        this.refreshButtons();
        this.visuals.forEach((visual) => visual.setVisible(enabled));
        this.buttons.forEach((button) => {
            button.input.enabled = enabled;
        });
    }

    destroy() {
        // O DisplayList pode já ter destruído as molduras antes deste listener.
        // Limpa o input sem tentar trocar texturas durante o shutdown.
        this.pressed.clear();
        this.hovered.clear();
        this.scene.input.off('pointerup', this.release, this);
        this.scene.input.off('pointerupoutside', this.release, this);
        this.scene.input.off('gameout', this.clear, this);
        this.scene.events.off('pause', this.clear, this);
        window.removeEventListener('blur', this.onWindowBlur);
        this.scene.game.canvas.removeEventListener('pointercancel', this.onPointerCancel);
        this.scene.game.canvas.removeEventListener('touchcancel', this.onPointerCancel);
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
        this.visuals.forEach((visual) => { if (visual.scene) visual.destroy(); });
        this.visuals.length = 0;
        this.buttons.clear();
        this.frames.clear();
    }
}
