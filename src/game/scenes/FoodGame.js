import { Scene } from 'phaser';
import FuncoesUI from '../FuncoesUI';
import { Player } from '../objects/Player';

export class FoodGame extends Scene {
    constructor() {
        super('FoodGame');
    }

    create() {
        this.cameras.main.setBackgroundColor(0x50ff99);

        this.jogoComecou = false;
        this.mostrarInstrucoes();
    }

    mostrarInstrucoes() {
        this.textoInstrucoes = this.add.text(
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
        this.botaoMenu = FuncoesUI.criarBotaoMenu(this); //guardado em variável (criado objeto) pra destruir depois
        this.botaoContinuar = FuncoesUI.criarBotaoContinuar(this, () => {
            this.iniciarJogo();
        });
    }

    iniciarJogo() {
        this.textoInstrucoes.destroy();
        this.botaoContinuar.destroy();
        this.botaoMenu.destroy();
        this.player = new Player(this, 640, 360, 'tst');
        this.jogoComecou = true;

    }

    update() {
        if (this.jogoComecou) {
            this.player.update();

        }
    }
}


