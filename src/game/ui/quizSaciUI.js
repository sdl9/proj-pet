import { addSlicedPanel } from './pixelPanel';
import { QUIZ_SACI_MANIFEST } from '../data/quizSaciAssets';
import { QUIZ_SACI_LAYOUT as layout, QUIZ_SACI_PLAY_LAYOUT } from '../data/quizSaciVisualConfig';
import { PET_EDUCA_UI } from './petEducaUI';

const textStyle = size => ({
    fontFamily: PET_EDUCA_UI.fonts.body, fontStyle: '700', fontSize: size,
    color: layout.textColor, padding: { top: 2, bottom: 2 }
});

// Mede os textos com a fonte já carregada. Só reduz quando a quebra exigir.
function fitText(text, maxSize, minSize, maxHeight) {
    text.setFontSize(maxSize);
    while (text.height > maxHeight && Number.parseInt(text.style.fontSize, 10) > minSize) {
        text.setFontSize(Number.parseInt(text.style.fontSize, 10) - 1);
    }
}

// Uma zona por controle. A soltura só ativa se a pressão começou e terminou
// nele; sair, cancelar ou bloquear limpa os ponteiros pendentes.
function createControl(hit, render, activate = () => {}) {
    const control = {
        hit, enabled: true, baseState: 'normal', state: 'normal',
        hovered: false, focused: false, pressed: new Set(),
        refresh() {
            const transient = ['normal', 'hover'].includes(this.baseState);
            this.state = transient && this.pressed.size ? 'selected'
                : transient && (this.hovered || this.focused) ? 'hover' : this.baseState;
            render(this.state);
        },
        reset() {
            this.hovered = false; this.focused = false; this.pressed.clear(); this.refresh();
        },
        setEnabled(value) {
            this.enabled = value && this.baseState !== 'disabled';
            if (this.enabled) hit.setInteractive({ useHandCursor: true });
            else { hit.disableInteractive(true); this.reset(); }
        },
        setState(state) {
            if (!QUIZ_SACI_MANIFEST.states.includes(state)) throw new Error('Estado visual desconhecido: ' + state);
            this.baseState = state;
            this.reset();
            this.setEnabled(state !== 'disabled');
        },
        press(id) {
            if (this.enabled) { this.pressed.add(id); this.refresh(); }
        },
        release(id, shouldActivate = false) {
            const accepted = this.enabled && this.pressed.delete(id);
            this.refresh();
            if (accepted && shouldActivate) activate();
        },
        setFocused(value) { this.focused = this.enabled && value; this.refresh(); }
    };
    hit.on('pointerover', pointer => {
        if (control.enabled) { control.hovered = !pointer.wasTouch; control.refresh(); }
    });
    hit.on('pointerout', pointer => {
        control.hovered = false; control.pressed.delete(pointer.id); control.refresh();
    });
    hit.on('pointerdown', pointer => control.press(pointer.id));
    hit.on('pointerup', pointer => control.release(pointer.id, true));
    return control;
}

function addQuizButton(scene, box, text, activate) {
    const panel = addSlicedPanel(scene, 'quiz-saci-answer-panel-normal', box.x, box.y, box.width, box.height);
    const label = scene.add.text(box.x + box.width / 2, box.y + box.height / 2,
        text, textStyle(30)).setOrigin(0.5);
    const hit = scene.add.zone(box.x, box.y, box.width, box.height).setOrigin(0);
    const control = createControl(hit, state => panel.setStateTexture('quiz-saci-answer-panel-' + state), activate);
    return Object.assign(control, {
        panel: panel.object, label,
        setVisible(value) {
            panel.object.setVisible(value); label.setVisible(value); hit.setVisible(value);
            this.setEnabled(value);
        }
    });
}

export function buildQuizSaciUI(scene, content, options = {}) {
    const { play = false, onAnswer, onNext, onRestart } = options;
    const onMenu = options.onMenu || (() => scene.scene.start('MainMenu'));
    const uiLayout = play ? QUIZ_SACI_PLAY_LAYOUT : layout;
    const image = (key, x, y) => scene.add.image(x, y, key).setOrigin(0).setScale(uiLayout.scale);
    image('quiz-saci-background', 0, 0);
    const portrait = image('quiz-saci-portrait', uiLayout.portrait.x, uiLayout.portrait.y);
    image('quiz-saci-portrait-frame', uiLayout.portrait.x, uiLayout.portrait.y);
    const q = uiLayout.question;
    const questionPanel = addSlicedPanel(scene, 'quiz-saci-question-panel', q.x, q.y, q.width, q.height);
    image('quiz-saci-question-tail', uiLayout.tail.x, uiLayout.tail.y);
    const question = scene.add.text(q.x + q.textInset, play ? 166 : q.y + q.height / 2, content.question, {
        ...textStyle(uiLayout.questionFontSize), wordWrap: { width: q.width - q.textInset * 2 }
    }).setOrigin(0, 0.5);
    const indicator = play ? scene.add.text(q.x + q.textInset, 60, '', textStyle(24)) : null;
    const s = uiLayout.separator;
    const separator = addSlicedPanel(scene, 'quiz-saci-separator', s.x, s.y, s.width, s.height);
    const answers = content.answers.map((text, index) => {
        const a = uiLayout.answers;
        const b = uiLayout.badges;
        const y = a.ys[index];
        const panel = addSlicedPanel(scene, 'quiz-saci-answer-panel-normal', a.x, y, a.width, a.height);
        const badge = image('quiz-saci-answer-badge-normal', b.x, b.ys[index]);
        const letter = scene.add.text(b.x + b.width / 2, b.ys[index] + b.height / 2,
            String.fromCharCode(65 + index), textStyle(uiLayout.letterFontSize)).setOrigin(0.5);
        const label = scene.add.text(a.x + a.textInset, y + a.height / 2, text, {
            ...textStyle(uiLayout.answerFontSize),
            wordWrap: { width: a.width - a.textInset * 2 - a.feedbackRightReserve }
        }).setOrigin(0, 0.5);
        const feedback = image('quiz-saci-correct-effect', a.x + a.width - a.textInset - 48,
            y + (a.height - 48) / 2).setVisible(false);
        const hit = scene.add.zone(b.x, y, a.x + a.width - b.x, a.height).setOrigin(0);
        const control = createControl(hit, state => {
            panel.setStateTexture('quiz-saci-answer-panel-' + state);
            badge.setTexture('quiz-saci-answer-badge-' + state);
            feedback.setVisible(state === 'correct' || state === 'wrong');
            if (feedback.visible) feedback.setTexture(QUIZ_SACI_MANIFEST.feedback[state + 'Icon']);
        }, () => onAnswer?.(String.fromCharCode(65 + index)));
        control.setEnabled(true);
        return Object.assign(control, { panel: panel.object, badge, letter, label, feedback,
            setVisible(value) {
                [panel.object, badge, letter, label, hit].forEach(item => item.setVisible(value));
                feedback.setVisible(value && ['correct', 'wrong'].includes(this.state));
                this.setEnabled(value);
            }
        });
    });
    const controls = [...answers];
    let footerPanel, feedbackText, next, resultPanel, resultText, restart, menu, exitMenu;
    if (play) {
        const footer = uiLayout.footer;
        footerPanel = addSlicedPanel(scene, 'quiz-saci-question-panel', footer.x, footer.y, footer.width, footer.height).object;
        feedbackText = scene.add.text(footer.x + 24, footer.y + footer.height / 2, '', {
            ...textStyle(26), wordWrap: { width: footer.width - 48 }
        }).setOrigin(0, 0.5);
        next = addQuizButton(scene, uiLayout.next, 'Próxima', onNext);
        exitMenu = addQuizButton(scene, uiLayout.exitMenu, 'Menu', onMenu);
        exitMenu.setVisible(true);
        const box = uiLayout.result;
        resultPanel = addSlicedPanel(scene, 'quiz-saci-question-panel', box.x, box.y, box.width, box.height).object;
        resultText = scene.add.text(716, 360, '', { ...textStyle(40), align: 'center', wordWrap: { width: 936 } }).setOrigin(0.5);
        restart = addQuizButton(scene, { x: 240, y: 440, width: 440, height: 88 }, 'Jogar novamente', onRestart);
        menu = addQuizButton(scene, { x: 728, y: 440, width: 440, height: 88 }, 'Voltar ao menu', onMenu);
        controls.push(exitMenu, next, restart, menu);
        footerPanel.setVisible(false); feedbackText.setVisible(false); next.setVisible(false);
        resultPanel.setVisible(false); resultText.setVisible(false); restart.setVisible(false); menu.setVisible(false);
    }

    let focused = null;
    let keyboardPressed = null;
    const focus = control => {
        controls.forEach(item => item.setFocused(item === control));
        focused = control;
    };
    const release = pointer => controls.forEach(control => control.release(pointer.id));
    const cancel = () => {
        controls.forEach(control => control.reset()); focused = null; keyboardPressed = null;
    };
    const keydown = event => {
        if (event.target?.closest?.('select, button, input, summary')) return;
        if (event.code === 'Escape') { onMenu(); return; }
        if (['ArrowDown', 'ArrowUp', 'Tab'].includes(event.code)) {
            event.preventDefault();
            const available = controls.filter(control => control.enabled);
            if (!available.length) return;
            const direction = event.code === 'ArrowUp' || event.shiftKey ? -1 : 1;
            const current = available.indexOf(focused);
            const index = current < 0 ? (direction > 0 ? 0 : available.length - 1)
                : (current + direction + available.length) % available.length;
            focus(available[index]);
        } else if (['Space', 'Enter', 'NumpadEnter'].includes(event.code)) {
            event.preventDefault();
            if (!event.repeat && focused?.enabled) {
                keyboardPressed = focused; keyboardPressed.press('keyboard');
            }
        }
    };
    const keyup = event => {
        if (['Space', 'Enter', 'NumpadEnter'].includes(event.code)) {
            const control = keyboardPressed;
            keyboardPressed = null;
            control?.release('keyboard', control === focused);
        }
    };
    scene.input.on('pointerup', release);
    scene.input.on('pointerupoutside', release);
    scene.input.on('gameout', cancel);
    scene.game.events.on('blur', cancel);
    window.addEventListener('blur', cancel);
    scene.game.canvas.addEventListener('touchcancel', cancel);
    scene.game.canvas.addEventListener('pointercancel', cancel);
    scene.input.keyboard?.on('keydown', keydown);
    scene.input.keyboard?.on('keyup', keyup);
    scene.events.once('shutdown', () => {
        scene.input.off('pointerup', release);
        scene.input.off('pointerupoutside', release);
        scene.input.off('gameout', cancel);
        scene.game.events.off('blur', cancel);
        window.removeEventListener('blur', cancel);
        scene.game.canvas.removeEventListener('touchcancel', cancel);
        scene.game.canvas.removeEventListener('pointercancel', cancel);
        scene.input.keyboard?.off('keydown', keydown);
        scene.input.keyboard?.off('keyup', keyup);
    });

    return {
        portrait, question, questionPanel: questionPanel.object, separator: separator.object, answers,
        indicator, feedbackText, next, restart, menu, exitMenu,
        showQuestion(text, alternatives, number, total) {
            cancel();
            // Reserva o cabeçalho para o indicador e o botão de saída.
            question.setText(text); fitText(question, uiLayout.questionFontSize, 30, 88);
            exitMenu.setVisible(true);
            indicator.setText('Pergunta ' + number + ' de ' + total);
            answers.forEach((answer, index) => {
                answer.setVisible(true); answer.setState('normal');
                answer.label.setText(alternatives[index]);
                fitText(answer.label, uiLayout.answerFontSize, 28, uiLayout.answerTextHeight);
            });
            footerPanel.setVisible(false); feedbackText.setText('').setVisible(false); next.setVisible(false);
            resultPanel.setVisible(false); resultText.setVisible(false); restart.setVisible(false); menu.setVisible(false);
        },
        showFeedback(result, isLast) {
            cancel();
            answers.forEach((answer, index) => {
                const letter = String.fromCharCode(65 + index);
                answer.setState(letter === result.correct ? 'correct' : letter === result.chosen ? 'wrong' : 'disabled');
                // Bloqueio de input separado da aparência: mantém os destaques.
                answer.setEnabled(false);
            });
            const message = result.isCorrect ? 'Muito bem!'
                : 'Vamos aprender! A resposta correta é ' + result.correct + ': ' + result.correctText;
            footerPanel.setVisible(true); feedbackText.setText(message).setVisible(true);
            fitText(feedbackText, 26, 22, 64);
            next.label.setText(isLast ? 'Finalizar' : 'Próxima'); next.setVisible(true);
            focus(next);
        },
        showCompletion(hits, total) {
            cancel();
            exitMenu.setVisible(false); // A conclusão já oferece "Voltar ao menu".
            answers.forEach(answer => answer.setVisible(false));
            footerPanel.setVisible(false); feedbackText.setVisible(false); next.setVisible(false);
            indicator.setText('Quiz do Saci');
            question.setText('Você terminou o Quiz do Saci!'); fitText(question, 36, 30, 88);
            resultPanel.setVisible(true);
            resultText.setText('Você acertou ' + hits + ' de ' + total + ' perguntas').setVisible(true);
            restart.setVisible(true); menu.setVisible(true); focus(restart);
        }
    };
}
