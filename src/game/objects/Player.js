import { Physics } from 'phaser';

export class Player extends Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);

        scene.add.existing(this);

        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);

        this.velocidade = 300;
    }

    mover(direcaoX, direcaoY) {
        this.setVelocity(direcaoX * this.velocidade, direcaoY * this.velocidade);
    }

}
