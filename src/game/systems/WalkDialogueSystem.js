import { Input } from 'phaser';

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
        const background = this.scene.add
            .rectangle(138, 34, 244, 46, 0x102720, 0.9)
            .setStrokeStyle(2, 0x91edc4);
        this.progressText = this.scene.add
            .text(138, 34, '', {
                color: '#ffffff',
                fontFamily: 'Arial',
                fontSize: '20px',
                fontStyle: 'bold'
            })
            .setOrigin(0.5);

        this.progressUI = this.scene.add
            .container(0, 0, [background, this.progressText])
            .setDepth(UI_DEPTH)
            .setScrollFactor(0, 0, true);
    }

    createDialogueUI() {
        const background = this.scene.add
            .rectangle(640, 570, 1160, 260, 0x102720, 0.97)
            .setStrokeStyle(4, 0x91edc4);
        this.speakerText = this.scene.add
            .text(84, 458, '', {
                color: '#91edc4',
                fontFamily: 'Arial',
                fontSize: '24px',
                fontStyle: 'bold'
            });
        this.bodyText = this.scene.add
            .text(84, 500, '', {
                color: '#ffffff',
                fontFamily: 'Arial',
                fontSize: '22px',
                lineSpacing: 7,
                wordWrap: { width: 1108 }
            });
        this.instructionText = this.scene.add
            .text(84, 674, '', {
                color: '#cfe8dc',
                fontFamily: 'Arial',
                fontSize: '16px'
            });

        this.closeButton = this.createButton(914, 660, 150, 46, 'FECHAR');
        this.nextButton = this.createButton(1090, 660, 174, 46, 'CONTINUAR');
        this.topicButtons = [
            this.createButton(455, 548, 730, 40, ''),
            this.createButton(455, 596, 730, 40, ''),
            this.createButton(455, 644, 730, 40, '')
        ];

        const children = [
            background,
            this.speakerText,
            this.bodyText,
            this.instructionText,
            this.closeButton.background,
            this.closeButton.text,
            this.nextButton.background,
            this.nextButton.text,
            ...this.topicButtons.flatMap(({ background: button, text }) => (
                [button, text]
            ))
        ];

        this.panel = this.scene.add
            .container(0, 0, children)
            .setDepth(UI_DEPTH + 1)
            .setScrollFactor(0, 0, true)
            .setVisible(false);

        this.closeButton.background.on('pointerdown', () => {
            this.close();
        });
        this.nextButton.background.on('pointerdown', () => {
            this.advance();
        });
        this.topicButtons.forEach((button, index) => {
            button.background.on('pointerdown', () => {
                this.selectTopic(index);
            });
        });
    }

    createButton(x, y, width, height, label) {
        const background = this.scene.add
            .rectangle(x, y, width, height, 0x245744, 1)
            .setStrokeStyle(2, 0x91edc4)
            .setInteractive({ useHandCursor: true });
        const text = this.scene.add
            .text(x, y, label, {
                align: 'center',
                color: '#ffffff',
                fontFamily: 'Arial',
                fontSize: '17px',
                fontStyle: 'bold'
            })
            .setOrigin(0.5);

        return { background, text };
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

        if (closePressed) {
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

    showPages(pages, onComplete) {
        this.mode = 'pages';
        this.pages = pages;
        this.pageIndex = 0;
        this.pageCompletion = onComplete;
        this.panel.setVisible(true);
        this.renderPage();
    }

    renderPage() {
        const page = this.pages[this.pageIndex];
        const isLastPage = this.pageIndex === this.pages.length - 1;

        this.hideTopicButtons();
        this.speakerText.setText(page.speaker);
        this.bodyText.setText(page.text);
        this.instructionText.setText(
            'E / ESPAÇO ou toque em CONTINUAR'
        );
        this.nextButton.text.setText(
            isLastPage ? 'CONCLUIR' : 'CONTINUAR'
        );
        this.setButtonVisible(this.nextButton, true);
        this.setButtonVisible(this.closeButton, true);
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
        });
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
        this.pages = [];
        this.pageIndex = 0;
        this.pageCompletion = null;
        this.panel.setVisible(false);
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
        button.background.setVisible(visible);
        button.text.setVisible(visible);
    }
}
