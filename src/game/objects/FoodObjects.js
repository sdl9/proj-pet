import { Math as PhaserMath } from 'phaser';

const TEXTURAS = {
    bom: ['food-good-kibble', 'food-good-rice', 'food-good-carrot', 'food-good-water'],
    ruim: ['food-bad-chocolate', 'food-bad-grapes', 'food-bad-avocado',
        'food-bad-candy', 'food-bad-onion', 'food-bad-garlic']
};

export default class FoodObjects {
    static criar(cena, tipo) {
        const x = cena.scale.width + 50;
        const y = PhaserMath.Between(440, 630);
        const texturas = TEXTURAS[tipo];
        const textura = texturas[PhaserMath.Between(0, texturas.length - 1)];
        const item = cena.physics.add.sprite(x, y, textura).setOrigin(0.5).setScale(2);

        item.tipo = tipo;
        // 30 pixels de origem viram os 60 pixels da colisao anterior na escala 2.
        item.body.setSize(30, 30).setOffset(1, 1);
        item.body.updateFromGameObject();
        item.body.setAllowGravity(false);
        item.body.setVelocityX(-500);
        return item;
    }
}
