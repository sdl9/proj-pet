import { Scene } from 'phaser';
import { PET_EDUCA_UI, createPetEducaScreen, addPetEducaBackdrop, addPetEducaImage, addPetEducaControl, bindPetEducaKeyboard } from '../ui/petEducaUI';

export class MainMenu extends Scene {
    constructor() {
        super('MainMenu');
    }

    create() {
        createPetEducaScreen(this, () => {
            addPetEducaBackdrop(this);
            const { menu, fonts, colors } = PET_EDUCA_UI;
            const controls = menu.cards.map(card => {
                const image = addPetEducaImage(this, 'card', menu.x, card.y);
                addPetEducaImage(this, card.icon, menu.iconX, card.y + 16);
                this.add.text(menu.labelX, card.y + menu.height / 2, card.label, {
                    fontFamily: fonts.heading, fontSize: menu.size, color: colors.brown
                }).setOrigin(0, 0.5);
                const control = addPetEducaControl(this, image, card.scene);
                if (!control.available) {
                    this.add.text(menu.labelX, card.y + 86, menu.unavailable, {
                        fontFamily: fonts.body, fontStyle: '700', fontSize: 18, color: colors.brown
                    });
                }
                return control;
            });
            bindPetEducaKeyboard(this, controls);
        });
    }
}
