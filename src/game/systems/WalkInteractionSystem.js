export class WalkInteractionSystem {
    constructor(scene, interactions, onActivate) {
        this.interactions = interactions;
        this.onActivate = onActivate;
        this.current = null;

        this.promptBackground = scene.add
            .rectangle(1050, 650, 390, 76, 0x102720, 0.94)
            .setStrokeStyle(3, 0x91edc4)
            .setInteractive({ useHandCursor: true });
        this.promptText = scene.add
            .text(1050, 650, '', {
                align: 'center',
                color: '#ffffff',
                fontFamily: 'Arial',
                fontSize: '18px',
                fontStyle: 'bold'
            })
            .setOrigin(0.5);

        this.prompt = scene.add
            .container(0, 0, [
                this.promptBackground,
                this.promptText
            ])
            .setDepth(20000)
            .setScrollFactor(0)
            .setVisible(false);

        this.promptBackground.on('pointerdown', () => {
            this.activateCurrent();
        });
    }

    update(player, enabled) {
        if (!enabled) {
            this.current = null;
            this.prompt.setVisible(false);
            return;
        }

        this.current = this.findNearest(player);

        if (!this.current) {
            this.prompt.setVisible(false);
            return;
        }

        this.promptText.setText(
            `${this.current.label}\nE / ESPAÇO ou TOQUE`
        );
        this.prompt.setVisible(true);
    }

    activateCurrent() {
        if (this.current) {
            this.onActivate(this.current);
        }
    }

    findNearest(player) {
        let nearest = null;
        let nearestDistance = Infinity;

        this.interactions.forEach((interaction) => {
            const distanceX = player.x - interaction.x;
            const distanceY = player.y - interaction.y;
            const distanceSquared = (distanceX * distanceX)
                + (distanceY * distanceY);
            const radiusSquared = interaction.radius * interaction.radius;

            if (
                distanceSquared <= radiusSquared
                && distanceSquared < nearestDistance
            ) {
                nearest = interaction;
                nearestDistance = distanceSquared;
            }
        });

        return nearest;
    }
}
