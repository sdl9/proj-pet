import { Input, Scene } from 'phaser';
import walkStage18Map from '../data/walkStage18Map.json';
import { WALK_DIALOGUES } from '../data/walkDialogues';
import { WalkVisualBuilder } from '../systems/WalkVisualBuilder';
import { WalkCollisionBuilder } from '../systems/WalkCollisionBuilder';
import { WalkInteractionSystem } from '../systems/WalkInteractionSystem';
import { WalkDialogueSystem } from '../systems/WalkDialogueSystem';
import { readKeyboardDirection, combineDirections } from '../systems/DirectionInput';
import { VirtualDPad } from '../systems/VirtualDPad';
import { WalkPlayer } from '../objects/WalkPlayer';
import { Saci } from '../objects/Saci';

export class WalkGameLearning extends Scene {
    constructor() {
        super('WalkGameLearning');
    }

    create() {
        const visualBuilder = new WalkVisualBuilder(this);
        const prototypeLayout = this.cache.json.get('walk-prototype-layout');
        const stage = visualBuilder.build(
            walkStage18Map,
            prototypeLayout,
            { includeRegistry: true }
        );
        const collisionManifest = this.cache.json.get(
            'walk-collision-depth-manifest'
        );

        const playerCollision =
            collisionManifest.objects['walk-player'].collisionShapes[0];


        this.physics.world.setBounds(
            0,
            0,
            stage.width,
            stage.height
        );

        this.player = new WalkPlayer(
            this,
            800,
            832,
            playerCollision
        );
        this.saci = new Saci(
            this,
            prototypeLayout.placements.saci.x,
            prototypeLayout.placements.saci.y
        );

        const collisionBuilder = new WalkCollisionBuilder(
            this,
            collisionManifest
        );
        this.walkCollisions = collisionBuilder.build({
            player: this.player,
            stageMap: walkStage18Map,
            prototypeLayout,
            visualRegistry: stage.visualRegistry
        });

        this.cursors = this.input.keyboard.createCursorKeys();

        this.teclas = this.input.keyboard.addKeys({
            cima: 'W',
            baixo: 'S',
            esquerda: 'A',
            direita: 'D',
            interagir: 'E',
            espaco: 'SPACE'
        });

        const touchAvailable = navigator.maxTouchPoints > 0
            || window.matchMedia('(pointer: coarse)').matches;
        const touchPreview = new URLSearchParams(window.location.search)
            .has('touchControls');
        this.touchControls = new VirtualDPad(
            this,
            touchAvailable || touchPreview
        );
        this.showTouchControls = touchAvailable || touchPreview;

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

        this.dialogueSystem = new WalkDialogueSystem(
            this,
            WALK_DIALOGUES,
            walkStage18Map.requiredLessons
        );
        this.interactionSystem = new WalkInteractionSystem(
            this,
            walkStage18Map.interactions,
            (interaction) => {
                this.touchControls.setEnabled(false);
                this.player.mover(0, 0);
                this.dialogueSystem.openInteraction(interaction);
            }
        );

        this.cameras.main
            .setBounds(0, 0, stage.width, stage.height)
            .setZoom(1)
            .centerOn(
                this.player.x,
                this.player.y
            )
            .startFollow(
                this.player,
                true,
                0.15,
                0.15
            );
    }

    update() {
        const interactionPressed = Input.Keyboard.JustDown(
            this.teclas.interagir
        ) || Input.Keyboard.JustDown(this.teclas.espaco);

        const dialogueWasOpen = this.dialogueSystem.isOpen();
        this.dialogueSystem.update(interactionPressed);
        const dialogueOpen = this.dialogueSystem.isOpen();
        this.touchControls.setEnabled(this.showTouchControls && !dialogueOpen);

        const direction = dialogueOpen
            ? { x: 0, y: 0 }
            : combineDirections(
                readKeyboardDirection(this.cursors, this.teclas),
                this.touchControls.getDirection()
            );

        this.player.mover(direction.x, direction.y);
        this.saci.atualizarInteracao(this.player);
        this.interactionSystem.update(this.player, !dialogueOpen);

        if (
            !dialogueWasOpen
            && !dialogueOpen
            && interactionPressed
        ) {
            this.interactionSystem.activateCurrent();
        }
    }
}
