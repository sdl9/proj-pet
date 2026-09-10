import { Scene } from 'phaser';
import FuncoesUI from '../FuncoesUI';
import { Player } from '../objects/Player';
import FoodObjects from '../objects/FoodObjects';

// FoodGame e a Scene do primeiro minigame.
// Em arquitetura, a Scene funciona como a "orquestradora":
// ela decide quando mostrar instrucoes, quando iniciar o jogo,
// quais objetos existem e como eles se relacionam.
export class FoodGame extends Scene {
    constructor() {
        // super('FoodGame') registra o nome interno desta Scene.
        // E esse nome que outras telas usam em this.scene.start('FoodGame').
        super('FoodGame');
    }

    // create() roda uma vez quando a Scene abre.
    // Ele prepara o estado inicial, mas nao precisa colocar o jogo inteiro
    // em movimento imediatamente.
    create() {
        this.cameras.main.setBackgroundColor(0x50ff99);

        // Propriedade da instancia: fica guardada dentro deste FoodGame.
        // O update() usa essa flag para saber se ja pode mover o player.
        this.jogoComecou = false;
        this.jogoFinalizado = false;

        // Primeiro estado da cena: tela de instrucoes.
        // Separar em metodo deixa claro que "mostrar instrucoes" e uma etapa
        // diferente de "iniciar o jogo".
        this.mostrarInstrucoes();
    }

    capturarItem(player, item) {
        if (item.tipo == 'bom') {
            this.score += 2;
        }

        if (item.tipo === 'ruim') {
            this.score -= 1;
        }

        item.destroy();
    }

    mostrarInstrucoes() {
        // Guardamos em this.textoInstrucoes porque outro metodo
        // iniciarJogo() precisara destruir esse texto depois.
        // Se fosse const textoInstrucoes, ele so existiria dentro deste metodo.
        this.textoInstrucoes = this.add.text(
            640,
            320,
            'COMO JOGAR? \n\n Desvie dos alimentos que fazem mal aos animais, e coma os saudaveis. \n\n Cuidado! Se comer 3 alimentos ruins, perde!',
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

    iniciarJogo() {
        // Ao mudar do estado "instrucoes" para "jogo", removemos da tela
        // os objetos que pertenciam apenas as instrucoes.
        this.textoInstrucoes.destroy();
        this.botaoContinuar.destroy();
        this.botaoMenu.destroy();

        this.score = 0;
        this.tempoRestante = 60;

        // Criamos o player somente quando o jogo comeca.
        // this.player precisa ser propriedade da Scene porque update()
        // vai chamar this.player.update() varias vezes por segundo.
        this.player = new Player(this, 640, 360, 'tst');

        // Criamos dois coletaveis placeholders.
        // Verde representa provisoriamente o alimento bom.
        // Vermelho representa provisoriamente o alimento ruim.

        this.timerSpawn = this.time.addEvent({
            delay: 750,
            callback: () => {
                const alimentoBom = FoodObjects.criarPlaceholder(this, 0x00ff00, 'bom');

                this.physics.add.overlap(
                    this.player,
                    alimentoBom,
                    (player, item) => {
                        this.capturarItem(player, item);
                    }
                );

                const alimentoRuim = FoodObjects.criarPlaceholder(this, 0xff0000, 'ruim');

                this.physics.add.overlap(
                    this.player,
                    alimentoRuim,
                    (player, item) => {
                        this.capturarItem(player, item);
                    }
                );
            },
            loop: true
        });

        // Agora o update pode comecar a controlar o player.
        this.jogoComecou = true;

        // overlap detecta contato entre dois corpos fisicos sem empurrar
        // um objeto contra o outro. E ideal para coletaveis.
    }

    // update() roda continuamente enquanto a Scene esta ativa.
    // Ele e usado para logicas que precisam ser verificadas a cada frame,
    // como movimento do jogador, timers, IA simples e controles.
    update() {
        // Como o player so existe depois do botao CONTINUAR,
        // protegemos o update com a flag jogoComecou.
        // Sem isso, o codigo tentaria mover um player que ainda nao foi criado.
        if (this.jogoComecou) {
            this.player.update();
        }
    }
}
