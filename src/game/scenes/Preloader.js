import { Scene } from 'phaser';
import { preloadWalkAssets } from '../data/walkAssetCatalog';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    init() {
        //  We loaded this image in our Boot Scene, so we can display it here
        this.add.image(512, 384, 'background');

        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress) => {

            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + (460 * progress);

        });
    }

    preload() {
        this.load.setPath('assets');

        this.load.image('logo', '2.png');
        this.load.image('tst', 'tst.png');

        this.load.image('foodgame-street-background', 'foodgame/background/foodgame-street-background.png');
        this.load.spritesheet('food-dog-caramelo', 'foodgame/dog/food-dog-caramelo-sheet.png', {
            frameWidth: 64,
            frameHeight: 64
        });
        for (const key of [
            'food-good-kibble', 'food-good-rice', 'food-good-carrot', 'food-good-water',
            'food-bad-chocolate', 'food-bad-grapes', 'food-bad-avocado',
            'food-bad-candy', 'food-bad-onion', 'food-bad-garlic'
        ]) {
            this.load.image(key, `foodgame/foods/${key}.png`);
        }

        preloadWalkAssets(this);
        this.load.spritesheet(
            'walk-saci',
            'walk/npcs/saci-idle-spritesheet.png',
            { frameWidth: 128, frameHeight: 96 }
        );
        this.load.image('walk-heart', 'walk/effects/walk-heart.png');
    }

    create() {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        const params = new URLSearchParams(window.location.search);
        const startScene = import.meta.env.DEV && params.has('walkLayoutEditor')
            ? 'WalkLayoutEditor'
            : params.has('walkLearning')
            ? 'WalkGameLearning'
            : 'Intro';

        this.scene.start(startScene);

        console.log(
            'Player carregado:',
            this.textures.exists('walk-player')
        );

        console.log(
            'Tileset carregado:',
            this.textures.exists('walk-tileset')
        );

        console.log(
            'Árvore carregada:',
            this.textures.exists('plaza-tree-large')
        );
    }
}
