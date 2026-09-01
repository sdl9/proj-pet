import { Scene } from 'phaser';
import FuncoesUI from '../FuncoesUI';

export class Intro extends Scene {
    constructor() {
        super('Intro');
    }

    create() {

        this.add.image(640, 360, 'background');

        this.add.text(640, 250, 'FeevalePet', {
            fontFamily: 'Arial Black',
            fontSize: 38,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        const txt = this.add.text(
            640,
            420,
            'Esse jogo é uma colaboração entre o projeto FeevalePet, da Universidade Feevale, e a aluna Laíssa Dornelles Salles. Jogo criado sem fins lucrativos, e com intuito educacional. Para todos os públicos. \n \n Boa diversão!',
            {
                fontFamily: 'Arial',
                fontSize: 32,
                color: '#ffffff',
                align: 'center',
                wordWrap: { width: 1000 }
            }
        ).setOrigin(0.5);

        FuncoesUI.criarBotaoMenu(this);
    }
}