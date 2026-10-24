import { Input } from 'phaser';
import { createWalkPanel, createWalkButton, walkTextStyle } from '../ui/walkUI';

const UI_DEPTH = 21000;

export class WalkDialogueSystem {
    constructor(scene, dialogues, requiredLessons) {
        this.scene = scene;
        this.dialogues = dialogues;
        this.requiredLessons = requiredLessons;
        this.completedLessons = new Set();
        this.mode = 'closed';
        this.pages = [];
        this.pageIndex = 0;
        this.pageCompletion = null;
        this.topicDialogue = null;
        this.allowClose = false;
        this.finalShown = false;

        this.topicKeys = scene.input.keyboard.addKeys({
            first: 'A',
            second: 'B',
            third: 'C',
            close: 'ESC'
        });

        this.createProgressUI();
        this.createDialogueUI();
        this.updateProgress();
    }

    createProgressUI() {
        const background = createWalkPanel(this.scene, 16, 12, 244, 64).object;
        this.progressText = this.scene.add.text(138, 44, '', walkTextStyle(24)).setOrigin(0.5);
        this.progressUI = this.scene.add.container(0, 0, [background, this.progressText])
            .setDepth(UI_DEPTH).setScrollFactor(0, 0, true);
    }

    createDialogueUI() {
        // HUD fixo em coordenadas lógicas. O container não recebe escala 2:
        // só as molduras são escaladas pelo componente compartilhado com o quiz.
        this.dialogueFrame = createWalkPanel(this.scene, 48, 360, 1184, 344);
        const background = this.dialogueFrame.object;
        this.speakerText = this.scene.add.text(80, 384, '', walkTextStyle(28));
        this.bodyText = this.scene.add.text(80, 432, '', walkTextStyle(30, {
            lineSpacing: 4, wordWrap: { width: 1120 }
        }));
        this.instructionText = this.scene.add.text(80, 646, '', walkTextStyle(20, {
            wordWrap: { width: 720 }
        }));
        this.closeButton = this.createButton(904, 652, 176, 64, 'FECHAR', () => this.close());
        this.nextButton = this.createButton(1112, 652, 208, 64, 'CONTINUAR', () => this.advance());
        this.topicButtons = [520, 592, 664].map((y, index) =>
            this.createButton(440, y, 720, 64, '', () => this.selectTopic(index), 28));
        this.buttons = [...this.topicButtons, this.closeButton, this.nextButton];
        this.panel = this.scene.add.container(0, 0, [
            background, this.speakerText, this.bodyText, this.instructionText,
            ...this.buttons.flatMap(button => [button.background, button.text, button.hit])
        ]).setDepth(UI_DEPTH + 1).setScrollFactor(0, 0, true).setVisible(false);
        this.buttons.forEach(button => button.setVisible(false));

        this.onFocusKey = event => {
            if (!this.isOpen() || event.repeat) return;
            const available = this.buttons.filter(button => button.visible && button.enabled);
            if (!available.length) return;
            const current = available.findIndex(button => button.focused);
            if (['Tab', 'ArrowDown', 'ArrowUp'].includes(event.code)) {
                event.preventDefault();
                const step = event.shiftKey || event.code === 'ArrowUp' ? -1 : 1;
                const index = current < 0 ? (step > 0 ? 0 : available.length - 1)
                    : (current + step + available.length) % available.length;
                this.buttons.forEach(button => button.setFocused(button === available[index]));
            } else if (event.code === 'Enter' && current >= 0) {
                event.preventDefault();
                available[current].activate();
            }
        };
        this.scene.input.keyboard.on('keydown', this.onFocusKey);
        this.scene.events.once('shutdown', () => this.scene.input.keyboard.off('keydown', this.onFocusKey));
    }

    createButton(x, y, width, height, label, onActivate, fontSize = 24) {
        return createWalkButton(this.scene, x - width / 2, y - height / 2,
            width, height, label, onActivate, fontSize);
    }

    openInteraction(interaction) {
        if (this.isOpen()) {
            return;
        }

        const dialogue = this.dialogues[interaction.dialogue];

        if (interaction.type === 'topics') {
            this.topicDialogue = dialogue;
            this.showTopics();
            return;
        }

        this.showPages(dialogue, () => {
            this.completeLessons(interaction.lessonIds);

            if (!this.openFinalIfComplete()) {
                this.close();
            }
        });
    }

    update(activatePressed) {
        const topicPressed = [
            this.topicKeys.first,
            this.topicKeys.second,
            this.topicKeys.third
        ].findIndex((key) => Input.Keyboard.JustDown(key));
        const closePressed = Input.Keyboard.JustDown(this.topicKeys.close);

        if (!this.isOpen()) {
            return;
        }

        if (closePressed && this.allowClose) {
            this.close();
            return;
        }

        if (this.mode === 'topics') {
            if (topicPressed >= 0) {
                this.selectTopic(topicPressed);
            }
            return;
        }

        if (activatePressed) {
            this.advance();
        }
    }

    showPages(pages, onComplete, { allowClose = false } = {}) {
        this.mode = 'pages';
        this.allowClose = allowClose;
        this.pages = pages;
        this.pageIndex = 0;
        this.pageCompletion = onComplete;
        this.panel.setVisible(true);
        this.renderPage();
    }

    renderPage() {
        const page = this.pages[this.pageIndex];
        const isLastPage = this.pageIndex === this.pages.length - 1;

        this.buttons.forEach(button => button.reset());
        this.hideTopicButtons();
        this.instructionText.setPosition(80, 646).setWordWrapWidth(720);
        this.speakerText.setText(page.speaker);
        this.bodyText.setText(page.text);
        // Cresce para cima conforme a fala medida, mantendo os botões no rodapé.
        const top = Math.max(16, Math.min(464, Math.floor((604 - 72 - this.bodyText.height) / 2) * 2));
        this.dialogueFrame.object.setPosition(48, top);
        this.dialogueFrame.resize(1184, 704 - top);
        this.speakerText.setPosition(80, top + 24);
        this.bodyText.setPosition(80, top + 72);
        this.instructionText.setText(
            `E / ESPAÇO ou toque em ${isLastPage ? 'CONCLUIR' : 'CONTINUAR'}`
        );
        this.nextButton.text.setText(
            isLastPage ? 'CONCLUIR' : 'CONTINUAR'
        );
        this.setButtonVisible(this.nextButton, true);
        this.setButtonVisible(this.closeButton, this.allowClose);
    }

    advance() {
        if (this.mode !== 'pages') {
            return;
        }

        if (this.pageIndex < this.pages.length - 1) {
            this.pageIndex += 1;
            this.renderPage();
            return;
        }

        const onComplete = this.pageCompletion;
        this.pageCompletion = null;

        if (onComplete) {
            onComplete();
        }
    }

    showTopics() {
        this.mode = 'topics';
        this.allowClose = true;
        this.dialogueFrame.object.setPosition(48, 360);
        this.dialogueFrame.resize(1184, 344);
        this.speakerText.setPosition(80, 384);
        this.bodyText.setPosition(80, 432);
        this.buttons.forEach(button => button.reset());
        this.instructionText.setPosition(832, 488).setWordWrapWidth(368);
        this.panel.setVisible(true);
        this.speakerText.setText(this.topicDialogue.speaker);
        this.bodyText.setText(this.topicDialogue.prompt);
        this.instructionText.setText(
            'Use A, B ou C, ou toque em uma opção'
        );
        this.setButtonVisible(this.nextButton, false);
        this.setButtonVisible(this.closeButton, true);

        this.topicDialogue.topics.forEach((topic, index) => {
            const completed = this.completedLessons.has(topic.id);
            this.topicButtons[index].text.setText(
                `${completed ? '✓ ' : ''}${topic.label}`
            );
            this.setButtonVisible(this.topicButtons[index], true);
        });
    }

    selectTopic(index) {
        if (this.mode !== 'topics') {
            return;
        }

        const topic = this.topicDialogue.topics[index];

        if (!topic) {
            return;
        }

        this.showPages(topic.pages, () => {
            this.completeLessons([topic.id]);

            if (!this.openFinalIfComplete()) {
                this.showTopics();
            }
        }, { allowClose: true });
    }

    completeLessons(lessonIds) {
        lessonIds.forEach((lessonId) => {
            this.completedLessons.add(lessonId);
        });
        this.updateProgress();
    }

    updateProgress() {
        this.progressText.setText(
            `Cuidados: ${this.completedLessons.size}/${this.requiredLessons.length}`
        );
    }

    openFinalIfComplete() {
        const complete = this.requiredLessons.every((lessonId) => (
            this.completedLessons.has(lessonId)
        ));

        if (!complete || this.finalShown) {
            return false;
        }

        this.finalShown = true;
        this.showPages(this.dialogues.final, () => {
            this.close();
        });
        return true;
    }

    close() {
        this.mode = 'closed';
        this.allowClose = false;
        this.pages = [];
        this.pageIndex = 0;
        this.pageCompletion = null;
        this.panel.setVisible(false);
        this.buttons.forEach(button => button.setVisible(false));
    }

    isOpen() {
        return this.mode !== 'closed';
    }

    hideTopicButtons() {
        this.topicButtons.forEach((button) => {
            this.setButtonVisible(button, false);
        });
    }

    setButtonVisible(button, visible) {
        button.setVisible(visible);
    }
}
