import { Scene } from 'phaser';
import walkStage18Map from '../data/walkStage18Map.json';
import { WalkVisualBuilder } from '../systems/WalkVisualBuilder';

export class WalkGameLearning extends Scene {
    constructor() {
        super('WalkGameLearning');
    }

    create() {
        const visualBuilder = new WalkVisualBuilder(this);
        const prototypeLayout = this.cache.json.get('walk-prototype-layout');
        const stage = visualBuilder.build(walkStage18Map, prototypeLayout);

        this.cameras.main
            .setBounds(0, 0, stage.width, stage.height)
            .setZoom(Math.min(
                this.scale.width / stage.width,
                this.scale.height / stage.height
            ))
            .centerOn(stage.width / 2, stage.height / 2);
    }
}
