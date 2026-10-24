const LEFT_X = 448;
const RIGHT_X = 640;
const SPEED = 48;
const END_PAUSE_MS = 320;

export class WalkTutorPatrol {
    constructor(sprite, interaction, syncCollision) {
        this.sprite = sprite;
        this.interaction = interaction;
        this.syncCollision = syncCollision;
        this.direction = 1;
        this.pauseRemaining = 0;
        this.sprite.setFlipX(false);
        this.sync();
    }

    setPaused(paused) {
        if (paused || this.pauseRemaining > 0) this.sprite.anims.pause();
        else this.sprite.anims.resume();
    }

    update(delta, dialogueOpen) {
        if (dialogueOpen) {
            this.setPaused(true);
            return;
        }
        // Consume travel and endpoint pauses separately, including overshoot.
        let remaining = Math.max(0, delta);
        while (remaining > 0) {
            if (this.pauseRemaining > 0) {
                const elapsed = Math.min(remaining, this.pauseRemaining);
                this.pauseRemaining -= elapsed;
                remaining -= elapsed;
                if (this.pauseRemaining > 0) break;
                this.direction *= -1;
            }
            const target = this.direction > 0 ? RIGHT_X : LEFT_X;
            const travelMs = Math.abs(target - this.sprite.x) / SPEED * 1000;
            if (remaining < travelMs) {
                this.sprite.x += this.direction * SPEED * remaining / 1000;
                remaining = 0;
            } else {
                this.sprite.x = target;
                remaining -= travelMs;
                this.pauseRemaining = END_PAUSE_MS;
            }
        }
        this.sprite.setFlipX(this.direction < 0);
        this.setPaused(false);
        this.sync();
    }

    sync() {
        this.sprite.setDepth(this.sprite.y);
        this.interaction.x = this.sprite.x;
        this.interaction.y = this.sprite.y;
        this.syncCollision(this.sprite);
    }

    destroy() {
        this.sprite = null;
        this.interaction = null;
        this.syncCollision = null;
    }
}
