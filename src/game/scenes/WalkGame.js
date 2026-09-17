import { Scene } from 'phaser';
import FuncoesUI from '../FuncoesUI';
import { Player } from '../objects/Player';

export class WalkGame extends Scene {
    constructor() {
        super('WalkGame');
    }

    create() {
        this.cameras.main.setBackgroundColor(0x50ff99);

        this.jogoComecou = false;
        this.jogoFinalizado = false;

        this.mostrarInstrucoes();
    }

        mostrarInstrucoes() {
            this.textoInstrucoes = this.add.text(
                640,
                320,
                'Faça um passeio pela praça! Nesse minigame você passeará pela praça, e conversará com os moradores.',
                {
                    fontFamily: 'Arial',
                    fontSize: 32,
                    color: '#ffffff',
                    align: 'center',
                    wordWrap: { width: 1000 }
                }
            ).setOrigin(0.5);
    
            // Botao guardado em this porque ele pertence ao estado de instrucoes
            // e sera removido quando o jogo comecar.
            this.botaoMenu = FuncoesUI.criarBotaoMenu(this);
    
            // Aqui passamos uma funcao como argumento.
            // FuncoesUI cria o botao; FoodGame decide o que acontece no clique.
            // Esse tipo de funcao passada para outra funcao e chamado de callback.
            this.botaoContinuar = FuncoesUI.criarBotaoContinuar(this, () => {
                this.iniciarJogo();
            });
        }
}