import { Geom, Input, Scene } from 'phaser';
import FuncoesUI from '../FuncoesUI';
import { Player } from '../objects/Player';
import FoodObjects from '../objects/FoodObjects';
import { readKeyboardDirection, combineDirections, shouldShowTouchControls } from '../systems/DirectionInput';
import { VirtualDPad } from '../systems/VirtualDPad';

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
        this.add.image(0, 0, 'foodgame-street-background').setOrigin(0);
        this.registrarAnimacoes();

        // Propriedade da instancia: fica guardada dentro deste FoodGame.
        // O update() usa essa flag para saber se ja pode mover o player.
        this.jogoComecou = false;
        this.jogoFinalizado = false;
        this.menuKeys = this.input.keyboard.addKeys({
            continuar: 'ENTER',
            menu: 'ESC'
        });

        // Primeiro estado da cena: tela de instrucoes.
        // Separar em metodo deixa claro que "mostrar instrucoes" e uma etapa
        // diferente de "iniciar o jogo".
        this.mostrarInstrucoes();
    }

    registrarAnimacoes() {
        const textura = 'food-dog-caramelo';
        if (!this.anims.exists('food-dog-idle')) {
            // Nesta versao do Phaser, duration no frame e o tempo total do frame.
            this.anims.create({
                key: 'food-dog-idle',
                frames: [
                    { key: textura, frame: 0, duration: 1500 },
                    { key: textura, frame: 1, duration: 120 }
                ],
                frameRate: 8,
                repeat: -1
            });
        }
        if (!this.anims.exists('food-dog-move')) {
            this.anims.create({
                key: 'food-dog-move',
                frames: this.anims.generateFrameNumbers(textura, { start: 2, end: 5 }),
                frameRate: 8,
                repeat: -1
            });
        }
        if (!this.anims.exists('food-dog-eat')) {
            this.anims.create({
                key: 'food-dog-eat',
                frames: this.anims.generateFrameNumbers(textura, { start: 6, end: 9 }),
                frameRate: 8,
                repeat: 0
            });
        }
    }


    mostrarInstrucoes() {
        this.painelInstrucoes = this.add.rectangle(640, 320, 1080, 270, 0x17202a, 0.78);
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
        this.painelInstrucoes.destroy();
        this.botaoContinuar.destroy();
        this.botaoMenu.destroy();

        this.score = 0;
        this.timer = 60;

        this.criarHUD();

        // Criamos o player somente quando o jogo comeca.
        // A Scene interpreta o teclado e envia a direcao ao player no update().
        this.cursors = this.input.keyboard.createCursorKeys();
        this.teclas = this.input.keyboard.addKeys({
            cima: 'W',
            baixo: 'S',
            esquerda: 'A',
            direita: 'D',
        });
        this.player = new Player(this, 160, 654, 'food-dog-caramelo');
        this.player.setScale(2).setOrigin(0.5, 61 / 64);
        // Mantem a area anterior de 100x100 pixels, ancorada nos pes do cachorro.
        this.player.body.setSize(50, 50).setOffset(7, 11);
        this.player.body.updateFromGameObject();
        // O primeiro pixel visivel do cachorro fica no y=21 do frame, 40px acima da origem dos pes.
        // Na escala 2, a cabeca encosta na linha da calcada (y=350) quando os pes estao em y=430.
        const topoCorpo = 350 + (61 - 21) * this.player.scaleY - this.player.body.height;
        // Apenas o cachorro recebe estes limites; os alimentos seguem atravessando a cena.
        this.player.body.setBoundsRectangle(new Geom.Rectangle(48, topoCorpo, 1184, 700 - topoCorpo));
        this.player.anims.play('food-dog-idle');
        this.playerComendo = false;
        this.player.on('animationcomplete-food-dog-eat', () => {
            this.playerComendo = false;
            this.atualizarAnimacaoPlayer();
        });
        this.touchControls = new VirtualDPad(this, shouldShowTouchControls());

        this.onInputInterrupted = () => {
            this.touchControls.clear();
            this.player.mover(0, 0);
        };
        this.onVisibilityChange = () => {
            if (document.hidden) this.onInputInterrupted();
        };
        window.addEventListener('blur', this.onInputInterrupted);
        document.addEventListener('visibilitychange', this.onVisibilityChange);
        this.events.on('pause', this.onInputInterrupted);
        this.events.once('shutdown', () => {
            window.removeEventListener('blur', this.onInputInterrupted);
            document.removeEventListener('visibilitychange', this.onVisibilityChange);
            this.events.off('pause', this.onInputInterrupted);
        });

        this.iniciarSpawn();
        this.iniciarTimer();

        // Agora o update pode comecar a controlar o player.
        this.jogoComecou = true;

        // overlap detecta contato entre dois corpos fisicos sem empurrar
        // um objeto contra o outro. E ideal para coletaveis.
    }

    criarHUD() {
        this.textoScore = this.add.text(
            32,
            24,
            'Score: ' + this.score,
            {
                fontFamily: 'Arial',
                fontSize: 28,
                color: '#ffffff',
            }
        ).setShadow(2, 2, '#000000', 4, true, true);

        this.textoTimer = this.add.text(
            1248,
            24,
            'Timer: ' + this.timer,
            {
                fontFamily: 'Arial',
                fontSize: 28,
                color: '#ffffff',
            }
        ).setOrigin(1, 0).setShadow(2, 2, '#000000', 4, true, true);
    }

    iniciarTimer() {
        this.timerJogo = this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.timer -= 1
                this.textoTimer.setText("Timer: " + this.timer)
            },
            loop: true
        });

    }

    capturarItem(player, item) { //estudar dps pq n this.capturaritem e pq this.capturaritem ta dentro de iniciarspawn
        if (item.tipo == 'bom') {
            this.score += 1;
            this.playerComendo = true;
            this.player.anims.play('food-dog-eat');
        }

        if (item.tipo === 'ruim') {
            this.score -= 1;
        }

        item.destroy();
        this.textoScore.setText('Score: ' + this.score);
    }

    iniciarSpawn() {
        this.timerSpawn = this.time.addEvent({
            delay: 650,
            callback: () => {
                const alimentoBom = FoodObjects.criar(this, 'bom');

                this.physics.add.overlap(
                    this.player,
                    alimentoBom,
                    (player, item) => {
                        this.capturarItem(player, item);
                    }
                );

                const alimentoRuim = FoodObjects.criar(this, 'ruim');

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
    }

    atualizarAnimacaoPlayer() {
        if (this.playerComendo) return;
        const corpo = this.player.body;
        const { x, y } = corpo.velocity;
        const limites = corpo.customBoundsRectangle;
        const movendo = (x < 0 && corpo.left > limites.left)
            || (x > 0 && corpo.right < limites.right)
            || (y < 0 && corpo.top > limites.top)
            || (y > 0 && corpo.bottom < limites.bottom);
        const animacao = movendo ? 'food-dog-move' : 'food-dog-idle';
        if (this.player.anims.currentAnim?.key !== animacao) {
            this.player.anims.play(animacao);
        }
    }

    // update() roda continuamente enquanto a Scene esta ativa.
    // Ele e usado para logicas que precisam ser verificadas a cada frame,
    // como movimento do jogador, timers, IA simples e controles.
    update() {
        if (!this.jogoComecou) {
            if (Input.Keyboard.JustDown(this.menuKeys.continuar)) {
                this.iniciarJogo();
            } else if (Input.Keyboard.JustDown(this.menuKeys.menu)) {
                this.scene.start('MainMenu');
            }
            return;
        }

        // Como o player so existe depois do botao CONTINUAR,
        // protegemos o update com a flag jogoComecou.
        // Sem isso, o codigo tentaria mover um player que ainda nao foi criado.
        if (this.jogoComecou) {
            const direction = combineDirections(
                readKeyboardDirection(this.cursors, this.teclas),
                this.touchControls.getDirection()
            );
            this.player.mover(direction.x, direction.y);
            this.atualizarAnimacaoPlayer();
        }
    }
}
