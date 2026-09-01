import { Scene } from 'phaser';
import FuncoesUI from '../FuncoesUI';

export class FoodGame extends Scene {
    constructor() {
        super('FoodGame');
    }

    create() {

        this.cameras.main.setBackgroundColor(0x50ff99);


        const txt = this.add.text(
            640,
            320,
            'COMO JOGAR? \n\n Desvie dos alimentos que fazem mal aos animais, e coma os saudáveis. \n\n Cuidado! Se comer 3 alimentos ruins, perde!',
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
