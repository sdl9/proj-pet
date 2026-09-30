import { GameObjects } from 'phaser';

const TEXTURE_KEY = 'walk-saci';
const ANIMATION_KEY = 'walk-saci-comendo';
const SCALE = 1.2;
const INTERACTION_RADIUS = 120;
const HEART_OFFSET_Y = Math.round(88 * SCALE);
const HEART_RISE = 16;
const HEART_DURATION = 900;
const HEART_COOLDOWN = 1200;

export class Saci extends GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, TEXTURE_KEY, 0);

        scene.add.existing(this);

        this
            .setOrigin(0.5, 1)
            .setScale(SCALE)
            .setDepth(y);

        this.jogadorEstavaProximo = false;
        this.ultimoCoracaoEm = -Infinity;
        this.coracao = scene.add
            .image(x, y - HEART_OFFSET_Y, 'walk-heart')
            .setOrigin(0.5)
            .setDepth(10000)
            .setVisible(false);

        if (!scene.anims.exists(ANIMATION_KEY)) {
            scene.anims.create({
                key: ANIMATION_KEY,
                frames: scene.anims.generateFrameNumbers(TEXTURE_KEY, {
                    start: 0,
                    end: 3
                }),
                frameRate: 4,
                repeat: -1
            });
        }

        this.anims.play(ANIMATION_KEY);
    }

    atualizarInteracao(player) {
        const distanciaX = player.x - this.x;
        const distanciaY = player.y - this.y;
        const distanciaAoQuadrado = (distanciaX * distanciaX)
            + (distanciaY * distanciaY);
        const jogadorEstaProximo = distanciaAoQuadrado
            <= INTERACTION_RADIUS * INTERACTION_RADIUS;

        if (jogadorEstaProximo && !this.jogadorEstavaProximo) {
            this.mostrarCoracao();
        }

        this.jogadorEstavaProximo = jogadorEstaProximo;
    }

    mostrarCoracao() {
        const agora = this.scene.time.now;

        if (agora - this.ultimoCoracaoEm < HEART_COOLDOWN) {
            return;
        }

        this.ultimoCoracaoEm = agora;
        const posicaoInicialY = this.y - HEART_OFFSET_Y;

        this.scene.tweens.killTweensOf(this.coracao);
        this.coracao
            .setPosition(this.x, posicaoInicialY)
            .setAlpha(1)
            .setVisible(true);

        this.scene.tweens.add({
            targets: this.coracao,
            y: posicaoInicialY - HEART_RISE,
            alpha: 0,
            duration: HEART_DURATION,
            ease: 'Sine.easeOut',
            onComplete: () => {
                this.coracao.setVisible(false);
            }
        });
    }
}
