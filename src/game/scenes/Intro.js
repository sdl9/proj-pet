import { Scene } from 'phaser';
import { PET_EDUCA_UI, createPetEducaScreen, addPetEducaBackdrop, addPetEducaImage, addPetEducaControl, bindPetEducaKeyboard } from '../ui/petEducaUI';

export class Intro extends Scene {
    constructor() {
        super('Intro');
    }

    create() {
        createPetEducaScreen(this, () => {
            addPetEducaBackdrop(this);
            const { intro, fonts, colors } = PET_EDUCA_UI;
            addPetEducaImage(this, 'panel', intro.panel.x, intro.panel.y);
            for (const block of intro.blocks) {
                this.add.text(intro.body.x, block.y, block.text, {
                    fontFamily: fonts.body, fontStyle: '700', fontSize: intro.body.size,
                    color: colors.brown, wordWrap: { width: intro.body.width }
                }).setLineSpacing(intro.body.lineSpacing);
            }
            const button = addPetEducaImage(this, 'button', intro.button.x, intro.button.y);
            this.add.text(intro.button.x + intro.button.width / 2, intro.button.y + intro.button.height / 2, intro.button.text, {
                fontFamily: fonts.heading, fontSize: intro.button.size, color: colors.cream
            }).setOrigin(0.5);
            bindPetEducaKeyboard(this, [addPetEducaControl(this, button, 'MainMenu')]);
        });
    }
}
