import { Scene } from 'phaser';
import FuncoesUI from '../FuncoesUI';

export class MainMenu extends Scene {
    constructor() {
        super('MainMenu');
    }

    create() {
        this.add.image(512, 384, 'background');

        this.add.image(640, 360, 'logo');

        this.add.text(640, 50, 'FeevalePet', {
            fontFamily: 'Arial Black',
            fontSize: 38,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        FuncoesUI.criarMenuInicial(this);

        
    }
}
