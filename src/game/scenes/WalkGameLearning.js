import { Scene } from 'phaser';
import walkStage18Map from '../data/walkStage18Map.json';
import { WalkVisualBuilder } from '../systems/WalkVisualBuilder';
import { WalkPlayer } from '../objects/WalkPlayer';

export class WalkGameLearning extends Scene {
    constructor() {
        super('WalkGameLearning');
    }

    create() {
        const visualBuilder = new WalkVisualBuilder(this);
        const prototypeLayout = this.cache.json.get('walk-prototype-layout');
        const stage = visualBuilder.build(walkStage18Map, prototypeLayout);

        this.physics.world.setBounds(
            0,
            0,
            stage.width,
            stage.height
        );

        this.player = new WalkPlayer(this, 800, 832);

        this.cursors = this.input.keyboard.createCursorKeys();

        this.teclas = this.input.keyboard.addKeys({
            cima: 'W',
            baixo: 'S',
            esquerda: 'A',
            direita: 'D'
        });

        this.cameras.main
            .setBounds(0, 0, stage.width, stage.height)
            .setZoom(Math.min(
                this.scale.width / stage.width,
                this.scale.height / stage.height
            ))
            .centerOn(stage.width / 2, stage.height / 2);
    }

    update() {
        let direcaoX = 0;
        let direcaoY = 0;

        if (this.cursors.left.isDown || this.teclas.esquerda.isDown) {
            direcaoX -= 1;
        }

        if (this.cursors.right.isDown || this.teclas.direita.isDown) {
            direcaoX += 1;
        }

        if (this.cursors.up.isDown || this.teclas.cima.isDown) {
            direcaoY -= 1;
        }

        if (this.cursors.down.isDown || this.teclas.baixo.isDown) {
            direcaoY += 1;
        }

        this.player.mover(direcaoX, direcaoY);
    }
}
