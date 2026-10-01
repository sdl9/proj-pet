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
        this.visuals = [];
        this.enabled = null;

        const centerX = 154;
        const centerY = scene.scale.height - 188;
        DIRECTIONS.forEach(({ name, label, x, y }) => {
            const background = scene.add
                .rectangle(centerX + x, centerY + y, BUTTON_SIZE, BUTTON_SIZE, 0x102720, 0.84)
                .setStrokeStyle(3, 0x91edc4)
                .setScrollFactor(0)
                .setDepth(20001)
                .setInteractive();
            const text = scene.add
                .text(centerX + x, centerY + y, label, {
                    color: '#ffffff',
                    fontFamily: 'Arial',
                    fontSize: '38px',
                    fontStyle: 'bold'
                })
                .setOrigin(0.5)
                .setScrollFactor(0)
                .setDepth(20002);

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
        this.refreshButtons();
    }

    refreshButtons() {
        const active = new Set(this.pressed.values());
        this.buttons.forEach((button, name) => {
            button.setFillStyle(active.has(name) ? 0x338565 : 0x102720, 0.84);
        });
    }

    setEnabled(enabled) {
        if (this.enabled === enabled) return;
        this.enabled = enabled;
        if (!enabled) this.clear();
        this.visuals.forEach((visual) => visual.setVisible(enabled));
        this.buttons.forEach((button) => {
            button.input.enabled = enabled;
        });
    }

    destroy() {
        this.clear();
        this.scene.input.off('pointerup', this.release, this);
        this.scene.input.off('pointerupoutside', this.release, this);
        this.scene.input.off('gameout', this.clear, this);
        this.scene.events.off('pause', this.clear, this);
        window.removeEventListener('blur', this.onWindowBlur);
        this.scene.game.canvas.removeEventListener('pointercancel', this.onPointerCancel);
        this.scene.game.canvas.removeEventListener('touchcancel', this.onPointerCancel);
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
        this.visuals.forEach((visual) => visual.destroy());
    }
}
