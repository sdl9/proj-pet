import { Scene } from 'phaser';
import { prepareQuizSaciTextures } from '../data/quizSaciAssets';
import { QUIZ_SACI_DEMO_TEXT } from '../data/quizSaciVisualConfig';
import { SACI_QUIZ_QUESTIONS } from '../data/saciQuizQuestions';
import { SaciQuizRound } from '../systems/SaciQuizRound';
import { createPetEducaScreen } from '../ui/petEducaUI';
import { buildQuizSaciUI } from '../ui/quizSaciUI';
import { addQuizVisualInspector } from '../dev/QuizVisualInspector';

export class SaciGame extends Scene {
    constructor() {
        super('SaciGame');
    }

    create(data = {}) {
        const visualDemo = import.meta.env.DEV && data.visualDemo;
        // Phaser conserva os dados ao reabrir uma cena sem novos parâmetros.
        // Consome a flag da rota para que a próxima entrada pelo menu seja normal.
        data.visualDemo = false;
        // A mesma cena oferece uma demonstração isolada, só pela rota de dev.
        createPetEducaScreen(this, () => {
            prepareQuizSaciTextures(this);
            if (visualDemo) {
                this.round = null;
                this.quizUI = buildQuizSaciUI(this, QUIZ_SACI_DEMO_TEXT);
                addQuizVisualInspector(this, this.quizUI);
                return;
            }
            this.round = new SaciQuizRound(SACI_QUIZ_QUESTIONS);
            const first = this.round.currentQuestion;
            this.quizUI = buildQuizSaciUI(this, { question: first.pergunta, answers: first.alternativas }, {
                play: true,
                onAnswer: letter => this.handleAnswer(letter),
                onNext: () => this.advanceQuiz(),
                onRestart: () => this.restartQuiz(),
                onMenu: () => this.scene.start('MainMenu')
            });
            this.presentQuestion();
        });
    }

    presentQuestion() {
        const question = this.round.currentQuestion;
        this.quizUI.showQuestion(question.pergunta, question.alternativas, this.round.index + 1, this.round.total);
    }

    handleAnswer(letter) {
        const result = this.round.answer(letter);
        if (result) this.quizUI.showFeedback(result, this.round.isLastQuestion);
    }

    advanceQuiz() {
        if (!this.round.advance()) return;
        if (this.round.phase === 'complete') this.quizUI.showCompletion(this.round.hits, this.round.total);
        else this.presentQuestion();
    }

    restartQuiz() {
        if (this.round.phase !== 'complete') return;
        this.round.reset();
        this.presentQuestion();
    }
}
