import { Scene } from 'phaser';

export class MainMenu extends Scene {
    constructor() {
        super('MainMenu');
    }

    create() 
    {
        this.add.image(512, 384, 'background');

        this.add.image(512, 300, 'logo');

        this.add.text(640, 250, 'FeevalePet', {
            fontFamily: 'Arial Black',
            fontSize: 38,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        const jogar = this.add.text(640, 420, 'JOGAR', {
            fontFamily: 'Arial',
            fontSize: 40,
            color: '#ffffff'

        })
        .setOrigin(0.5)
        .setInteractive();

        jogar.on('pointerdown', () => {

            this.scene.start('Game');

        });
    }
}
