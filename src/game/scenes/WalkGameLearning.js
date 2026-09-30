import { Scene } from 'phaser';
import walkStage18Map from '../data/walkStage18Map.json';
import { WalkVisualBuilder } from '../systems/WalkVisualBuilder';
import { WalkCollisionBuilder } from '../systems/WalkCollisionBuilder';
import { WalkPlayer } from '../objects/WalkPlayer';
import { Saci } from '../objects/Saci';

export class WalkGameLearning extends Scene {
    constructor() {
        super('WalkGameLearning');
    }

    create() {
        const visualBuilder = new WalkVisualBuilder(this);
        const prototypeLayout = this.cache.json.get('walk-prototype-layout');
        const stage = visualBuilder.build(
            walkStage18Map,
            prototypeLayout,
            { includeRegistry: true }
        );
        const collisionManifest = this.cache.json.get(
            'walk-collision-depth-manifest'
        );

        const playerCollision =
            collisionManifest.objects['walk-player'].collisionShapes[0];


        this.physics.world.setBounds(
            0,
            0,
            stage.width,
            stage.height
        );

        this.player = new WalkPlayer(
            this,
            800,
            832,
            playerCollision
        );
        this.saci = new Saci(
            this,
            prototypeLayout.placements.saci.x,
            prototypeLayout.placements.saci.y
        );

        const collisionBuilder = new WalkCollisionBuilder(
            this,
            collisionManifest
        );
        this.walkCollisions = collisionBuilder.build({
            player: this.player,
            stageMap: walkStage18Map,
            prototypeLayout,
            visualRegistry: stage.visualRegistry
        });

        this.cursors = this.input.keyboard.createCursorKeys();

        this.teclas = this.input.keyboard.addKeys({
            cima: 'W',
            baixo: 'S',
            esquerda: 'A',
            direita: 'D'
        });

        this.cameras.main
            .setBounds(0, 0, stage.width, stage.height)
            .setZoom(1)
            .centerOn(
                this.player.x,
                this.player.y
            )
            .startFollow(
                this.player,
                true,
                0.15,
                0.15
            );
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
        this.saci.atualizarInteracao(this.player);
    }
}
