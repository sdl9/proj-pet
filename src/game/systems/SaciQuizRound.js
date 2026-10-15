export const SACI_QUIZ_LETTERS = ['A', 'B', 'C'];

// Estado da partida sem Phaser, DOM, temporizadores ou armazenamento.
export class SaciQuizRound {
    constructor(questions) {
        if (!questions.length) throw new Error('O quiz precisa de perguntas.');
        this.questions = questions;
        this.reset();
    }

    reset() {
        this.index = 0;
        this.hits = 0;
        this.phase = 'question';
        this.feedback = null;
    }

    get total() { return this.questions.length; }
    get currentQuestion() { return this.phase === 'complete' ? null : this.questions[this.index]; }
    get isLastQuestion() { return this.index === this.total - 1; }

    answer(letter) {
        if (this.phase !== 'question' || !SACI_QUIZ_LETTERS.includes(letter)) return null;
        // Bloqueia a rodada antes de contar ou devolver o feedback.
        this.phase = 'feedback';
        const question = this.currentQuestion;
        const isCorrect = letter === question.correta;
        if (isCorrect) this.hits++;
        this.feedback = {
            chosen: letter,
            correct: question.correta,
            correctText: question.alternativas[SACI_QUIZ_LETTERS.indexOf(question.correta)],
            isCorrect
        };
        return this.feedback;
    }

    advance() {
        if (this.phase !== 'feedback') return false;
        this.feedback = null;
        if (this.isLastQuestion) {
            this.phase = 'complete';
        } else {
            this.index++;
            this.phase = 'question';
        }
        return true;
    }
}
