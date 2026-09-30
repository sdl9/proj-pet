import { Physics } from 'phaser';

const TEXTURE_KEY = 'walk-player';

const DIRECTION_FRAMES = Object.freeze({
    baixo: Object.freeze([0, 1, 2, 3]),
    esquerda: Object.freeze([4, 5, 6, 7]),
    direita: Object.freeze([8, 9, 10, 11]),
    cima: Object.freeze([12, 13, 14, 15])
});

export class WalkPlayer extends Physics.Arcade.Sprite {
    constructor(scene, x, y, collisionShape) {
        super(
            scene,
            x,
            y,
            TEXTURE_KEY,
            DIRECTION_FRAMES.baixo[0]
        );

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.velocidade = 200;
        this.ultimaDirecao = 'baixo';

        this.setFrame(0);
        this.setOrigin(0.5, 61 / 64);
        this.setScale(1.5);
        this.setDepth(y);

        if (!scene.anims.exists('walk-player-baixo')) {
            scene.anims.create({
                key: 'walk-player-baixo',
                frames: scene.anims.generateFrameNumbers(
                    'walk-player',
                    {
                        start: 0,
                        end: 3
                    }
                ),
                frameRate: 8,
                repeat: -1
            });
        }

        if (!scene.anims.exists('walk-player-esquerda')) {
            scene.anims.create({
                key: 'walk-player-esquerda',
                frames: scene.anims.generateFrameNumbers(
                    'walk-player',
                    {
                        start: 4,
                        end: 7
                    }
                ),
                frameRate: 8,
                repeat: -1
            });
        }

        if (!scene.anims.exists('walk-player-direita')) {
            scene.anims.create({
                key: 'walk-player-direita',
                frames: scene.anims.generateFrameNumbers(
                    'walk-player',
                    {
                        start: 8,
                        end: 11
                    }
                ),
                frameRate: 8,
                repeat: -1
            });
        }

        if (!scene.anims.exists('walk-player-cima')) {
            scene.anims.create({
                key: 'walk-player-cima',
                frames: scene.anims.generateFrameNumbers(
                    'walk-player',
                    {
                        start: 12,
                        end: 15
                    }
                ),
                frameRate: 8,
                repeat: -1
            });
        }
    }

    mover(direcaoX, direcaoY) {
        this.setVelocity(0);

        this.setVelocityX(
            direcaoX * this.velocidade
        );

        this.setVelocityY(
            direcaoY * this.velocidade
        );

        if (direcaoX !== 0 && direcaoY !== 0) {
            this.body.velocity
                .normalize()
                .scale(this.velocidade);
        }

        if (direcaoY < 0) {
            this.ultimaDirecao = 'cima';
            this.anims.play('walk-player-cima', true);
        } else if (direcaoY > 0) {
            this.ultimaDirecao = 'baixo';
            this.anims.play('walk-player-baixo', true);
        } else if (direcaoX < 0) {
            this.ultimaDirecao = 'esquerda';
            this.anims.play('walk-player-esquerda', true);
        } else if (direcaoX > 0) {
            this.ultimaDirecao = 'direita';
            this.anims.play('walk-player-direita', true);
        } else {
            this.anims.stop();
            this.setFrame(
                DIRECTION_FRAMES[this.ultimaDirecao][0]
            );
        }
        this.setDepth(this.y);
    }
}
