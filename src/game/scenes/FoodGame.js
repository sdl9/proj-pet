import { Geom, Input, Scene } from 'phaser';
import { PET_EDUCA_UI, createPetEducaScreen, addPetEducaImage } from '../ui/petEducaUI';
import { createWalkButton } from '../ui/walkUI';
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
        this.physics.resume();
        this.registrarAnimacoes();

        // Propriedade da instancia: fica guardada dentro deste FoodGame.
        // O update() usa essa flag para saber se ja pode mover o player.
        this.jogoComecou = false;
        this.jogoFinalizado = false;
        this.uiReady = false;
        this.uiNavigating = false;
        this.player = null;
        this.touchControls = null;
        this.timerJogo = null;
        this.timerSpawn = null;
        this.timerTonalidadeRuim = null;
        this.resultadoUI = null;
        this.menuKeys = this.input.keyboard.addKeys({
            continuar: 'ENTER',
            menu: 'ESC'
        });

        // Primeiro estado da cena: tela de instrucoes.
        // Separar em metodo deixa claro que "mostrar instrucoes" e uma etapa
        // diferente de "iniciar o jogo".
        createPetEducaScreen(this, () => {
            this.mostrarInstrucoes();
            this.criarBotaoMenu();
            this.uiReady = true;
        });
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
        const balao = this.criarBalao(
            'Ajude o Caramelo a se alimentar!',
            [
                { y: 296, text: 'Mova o cachorrinho para pegar ração, arroz, cenoura e água.' },
                { y: 414, text: 'Desvie dos alimentos que fazem mal!' }
            ],
            'Continuar', () => this.iniciarJogo()
        );
        this.instrucoesUI = balao.container;
        this.painelInstrucoes = balao.painel;
        this.textoInstrucoes = balao.titulo;
        this.botaoContinuar = balao.botao;
    }

    criarBalao(titulo, blocos, rotulo, aoClicar) {
        // Reaproveita apenas o painel sobre o cenário original da alimentação.
        const first = this.children.list.length;
        const { intro, fonts, colors } = PET_EDUCA_UI;
        const painel = addPetEducaImage(this, 'panel', intro.panel.x, intro.panel.y);
        const style = {
            fontFamily: fonts.body, fontStyle: '700', fontSize: intro.body.size,
            color: colors.brown, wordWrap: { width: intro.body.width }
        };
        const textoTitulo = this.add.text(intro.body.x, 228, titulo, { ...style, fontSize: 34 });
        for (const bloco of blocos) {
            this.add.text(intro.body.x, bloco.y, bloco.text, { ...style, fontSize: bloco.size ?? style.fontSize });
        }
        const botao = addPetEducaImage(this, 'button', intro.button.x, intro.button.y);
        this.add.text(intro.button.x + intro.button.width / 2, intro.button.y + intro.button.height / 2,
            rotulo, { fontFamily: fonts.heading, fontSize: 42, color: colors.cream }).setOrigin(0.5);
        botao.setInteractive({ useHandCursor: true }).on('pointerdown', aoClicar);
        // Remover o container também remove seus textos e a área interativa.
        const container = this.add.container(0, 0, this.children.list.slice(first)).setDepth(10000);
        // Move o conjunto inteiro: painel, textos e botão mantêm o mesmo alinhamento.
        container.setPosition(
            (this.scale.width - painel.displayWidth) / 2 - painel.x,
            (this.scale.height - painel.displayHeight) / 2 - painel.y
        );
        return { container, painel, titulo: textoTitulo, botao };
    }

    criarBotaoMenu() {
        this.botaoMenu = createWalkButton(this, 1080, 12, 184, 64, 'Menu', () => this.voltarAoMenu());
        this.menuUI = this.add.container(0, 0, [
            this.botaoMenu.background, this.botaoMenu.text, this.botaoMenu.hit
        ]).setDepth(21002).setScrollFactor(0, 0, true);
    }

    voltarAoMenu() {
        if (!this.uiReady || this.uiNavigating) return;
        this.uiNavigating = true;
        this.botaoMenu.setEnabled(false);
        this.touchControls?.setEnabled(false);
        this.player?.mover(0, 0);
        this.timerJogo?.remove(false);
        this.timerSpawn?.remove(false);
        this.cancelarTonalidadeRuim();
        this.scene.start('MainMenu');
    }

    iniciarJogo() {
        // Aceita o início uma vez, mesmo com toque duplo ou Enter simultâneo.
        if (!this.uiReady || this.uiNavigating || this.jogoComecou) return;
        this.jogoComecou = true;
        this.instrucoesUI.destroy();
        this.instrucoesUI = null;

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
        this.timerTonalidadeRuim = null;
        this.player.on('animationcomplete-food-dog-eat', () => {
            this.playerComendo = false;
            this.atualizarAnimacaoPlayer();
        });
        this.player.once('destroy', () => this.cancelarTonalidadeRuim());
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
            this.cancelarTonalidadeRuim();
            window.removeEventListener('blur', this.onInputInterrupted);
            document.removeEventListener('visibilitychange', this.onVisibilityChange);
            this.events.off('pause', this.onInputInterrupted);
        });

        this.iniciarSpawn();
        this.iniciarTimer();

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
            1048,
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
                if (this.jogoFinalizado || this.uiNavigating) return;
                this.timer = Math.max(0, this.timer - 1);
                this.textoTimer.setText('Timer: ' + this.timer);
                if (this.timer === 0) this.finalizarJogo();
            },
            loop: true
        });

    }

    finalizarJogo() {
        if (!this.jogoComecou || this.jogoFinalizado || this.uiNavigating) return;
        // Bloqueia movimento e pontuação antes de construir o resultado.
        this.jogoFinalizado = true;
        this.timerJogo.remove(false);
        this.timerSpawn.remove(false);
        this.cancelarTonalidadeRuim();
        this.touchControls.setEnabled(false);
        this.player.mover(0, 0);
        this.player.anims.stop();
        this.player.clearTint();
        this.physics.pause();
        this.textoScore.setVisible(false);
        this.textoTimer.setVisible(false);
        this.resultadoUI = this.criarBalao(
            'Passeio finalizado!',
            [{ y: 330, text: 'Seu Score: ' + this.score, size: 40 }],
            'Menu', () => this.voltarAoMenu()
        ).container;
    }

    capturarItem(player, item) { //estudar dps pq n this.capturaritem e pq this.capturaritem ta dentro de iniciarspawn
        if (this.jogoFinalizado || this.uiNavigating) return;
        if (item.tipo == 'bom') {
            this.score += 1;
            this.playerComendo = true;
            this.player.anims.play('food-dog-eat');
        }

        if (item.tipo === 'ruim') {
            this.score -= 1;
            this.aplicarTonalidadeRuim(player);
        }

        item.destroy();
        this.textoScore.setText('Score: ' + this.score);
    }

    cancelarTonalidadeRuim() {
        if (this.timerTonalidadeRuim) {
            this.time.removeEvent(this.timerTonalidadeRuim);
            this.timerTonalidadeRuim = null;
        }
    }

    aplicarTonalidadeRuim(player) {
        this.cancelarTonalidadeRuim();
        player.setTint(0xffb3b3);
        this.timerTonalidadeRuim = this.time.delayedCall(400, () => {
            player.clearTint();
            this.timerTonalidadeRuim = null;
        });
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
        if (!this.uiReady || this.uiNavigating) return;
        if (Input.Keyboard.JustDown(this.menuKeys.menu)) {
            this.voltarAoMenu();
            return;
        }
        if (!this.jogoComecou) {
            if (Input.Keyboard.JustDown(this.menuKeys.continuar)) {
                this.iniciarJogo();
            }
            return;
        }
        if (this.jogoFinalizado) {
            if (Input.Keyboard.JustDown(this.menuKeys.continuar)) this.voltarAoMenu();
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
