import { Physics } from 'phaser';

export class Player extends Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);

        scene.add.existing(this);

        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);

        this.velocidade = 200;

        this.cursors = scene.input.keyboard.createCursorKeys();

        this.teclas = scene.input.keyboard.addKeys({
            cima: 'W',
            baixo: 'S',
            esquerda: 'A',
            direita: 'D',
        });
    }

    update() {
        // Para o personagem antes de verificar as teclas
        this.setVelocity(0);

        if (this.cursors.left.isDown || this.teclas.esquerda.isDown) {
            this.setVelocityX(-this.velocidade);
        }

        if (this.cursors.right.isDown || this.teclas.direita.isDown) {
            this.setVelocityX(this.velocidade);
        }

        if (this.cursors.up.isDown || this.teclas.cima.isDown) {
            this.setVelocityY(-this.velocidade);
        }

        if (this.cursors.down.isDown || this.teclas.baixo.isDown) {
            this.setVelocityY(this.velocidade);
        }
    }

}