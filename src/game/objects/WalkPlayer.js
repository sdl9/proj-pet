import { GameObjects } from 'phaser';

const TEXTURE_KEY = 'walk-player';

// Verified 4x4 sheet of 64x64 frames: down, left, right, up.
const DIRECTION_FRAMES = Object.freeze({
    baixo: Object.freeze([0, 1, 2, 3]),
    esquerda: Object.freeze([4, 5, 6, 7]),
    direita: Object.freeze([8, 9, 10, 11]),
    cima: Object.freeze([12, 13, 14, 15])
});

// L1: visual sprite only. No physics body, controls or movement.
export class WalkPlayer extends GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, TEXTURE_KEY, DIRECTION_FRAMES.baixo[0]);

        scene.add.existing(this);

        // The approved asset's feet baseline is row 61, not the canvas bottom.
        this.setOrigin(0.5, 61 / 64);
        this.setScale(1.5);
        this.setDepth(y);

        for (const [direction, frames] of Object.entries(DIRECTION_FRAMES)) {
            const key = `${TEXTURE_KEY}-${direction}`;
            if (!scene.anims.exists(key)) {
                scene.anims.create({
                    key,
                    frames: scene.anims.generateFrameNumbers(TEXTURE_KEY, { frames }),
                    frameRate: 8,
                    repeat: -1
                });
            }
        }
        // Register the directional animations without playing them.
    }
}
