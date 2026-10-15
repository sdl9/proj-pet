import { createWalkButton } from '../ui/walkUI';

export class WalkInteractionSystem {
    constructor(scene, interactions, onActivate) {
        this.interactions = interactions;
        this.onActivate = onActivate;
        this.current = null;
        this.promptButton = createWalkButton(scene, 855, 606, 390, 88, '', () => this.activateCurrent(), 24);
        this.promptBackground = this.promptButton.background;
        this.promptText = this.promptButton.text;
        this.prompt = scene.add.container(0, 0, [this.promptBackground, this.promptText, this.promptButton.hit])
            .setDepth(20000).setScrollFactor(0, 0, true).setVisible(false);
        this.promptButton.setVisible(false);
    }

    update(player, enabled) {
        if (!enabled) {
            this.current = null;
            this.prompt.setVisible(false);
            this.promptButton.setVisible(false);
            return;
        }
        const nearest = this.findNearest(player);
        // Não reaproveita uma pressão iniciada perto de outro personagem.
        if (nearest !== this.current) this.promptButton.reset();
        this.current = nearest;
        if (!this.current) {
            this.prompt.setVisible(false);
            this.promptButton.setVisible(false);
            return;
        }
        this.promptText.setText(
            `${this.current.label}\nE / ESPAÇO ou TOQUE`
        );
        this.prompt.setVisible(true);
        this.promptButton.setVisible(true);
    }

    activateCurrent() {
        if (this.current) this.onActivate(this.current);
    }

    findNearest(player) {
        let nearest = null;
        let nearestDistance = Infinity;
        this.interactions.forEach((interaction) => {
            const distanceX = player.x - interaction.x;
            const distanceY = player.y - interaction.y;
            const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
            const radiusSquared = interaction.radius * interaction.radius;
            if (distanceSquared <= radiusSquared && distanceSquared < nearestDistance) {
                nearest = interaction;
                nearestDistance = distanceSquared;
            }
        });
        return nearest;
    }
}
