import test from 'node:test';
import assert from 'node:assert/strict';
import { SACI_QUIZ_QUESTIONS as questions } from '../src/game/data/saciQuizQuestions.js';
import { SaciQuizRound, SACI_QUIZ_LETTERS as letters } from '../src/game/systems/SaciQuizRound.js';

const wrongLetter = question => letters.find(letter => letter !== question.correta);

test('15 perguntas na ordem fornecida, três opções e gabarito preservado', () => {
    assert.deepEqual(questions.map(question => question.id), Array.from({ length: 15 }, (_, index) => index + 1));
    assert.equal(questions.map(question => question.correta).join(''), 'BCAACBACBBACCBA');
    for (const question of questions) {
        assert.equal(question.alternativas.length, 3);
        assert.ok(question.pergunta.length && question.alternativas.every(text => typeof text === 'string' && text.length));
        assert.ok(letters.includes(question.correta));
    }
    assert.equal(questions[5].alternativas[1], 'Avisar um adulto para buscar orientação veterinária.');
    assert.equal(questions[10].alternativas[0], 'Uma atividade adequada para ele e feita com segurança.');
    assert.equal(questions[12].alternativas[2], 'Perguntar à pessoa que cuida dele se podemos nos aproximar.');
});

test('começa na primeira pergunta, sem feedback e com zero acertos', () => {
    const round = new SaciQuizRound(questions);
    assert.equal(round.currentQuestion.id, 1);
    assert.equal(round.hits, 0);
    assert.equal(round.phase, 'question');
    assert.equal(round.feedback, null);
    assert.equal(round.advance(), false);
    assert.throws(() => new SaciQuizRound([]));
});

test('aceita uma única resposta e conta o acerto uma única vez', () => {
    const round = new SaciQuizRound(questions);
    const result = round.answer('B');
    assert.deepEqual(result, { chosen: 'B', correct: 'B', correctText: questions[0].alternativas[1], isCorrect: true });
    assert.equal(round.hits, 1);
    for (const letter of ['B', 'A', 'C', 'B']) assert.equal(round.answer(letter), null);
    assert.equal(round.hits, 1);
    assert.equal(round.feedback, result);
    assert.equal(round.index, 0); // Feedback nunca avança automaticamente.
});

test('erro informa letra e texto corretos, sem segunda tentativa', () => {
    const round = new SaciQuizRound(questions);
    assert.deepEqual(round.answer('A'), {
        chosen: 'A', correct: 'B', correctText: questions[0].alternativas[1], isCorrect: false
    });
    assert.equal(round.answer('B'), null);
    assert.equal(round.hits, 0);
});

test('não confunde índice, letra inválida ou tecla repetida com uma escolha', () => {
    const round = new SaciQuizRound(questions);
    for (const invalid of [0, 1, 2, 'b', 'D', '', null, undefined]) {
        assert.equal(round.answer(invalid), null);
        assert.equal(round.phase, 'question');
        assert.equal(round.hits, 0);
    }
});

test('avanço é manual e único; limpa o feedback antes da nova questão', () => {
    const round = new SaciQuizRound(questions);
    round.answer('B');
    assert.equal(round.advance(), true);
    assert.equal(round.advance(), false); // Segundo clique sem nova resposta.
    assert.equal(round.index, 1);
    assert.equal(round.currentQuestion.id, 2);
    assert.equal(round.phase, 'question');
    assert.equal(round.feedback, null);
    assert.equal(round.hits, 1);
});

test('percorre as 15 questões sem omissões, aceita acertos A/B/C e só conclui ao finalizar', () => {
    const before = JSON.stringify(questions);
    const round = new SaciQuizRound(questions);
    const visited = [];
    for (let index = 0; index < 15; index++) {
        const question = round.currentQuestion;
        visited.push(question.id);
        assert.equal(round.isLastQuestion, index === 14);
        assert.equal(round.answer(question.correta).isCorrect, true);
        assert.equal(round.hits, index + 1);
        assert.equal(round.phase, 'feedback');
        assert.equal(round.currentQuestion.id, question.id);
        round.advance();
        assert.equal(round.advance(), false);
    }
    assert.deepEqual(visited, Array.from({ length: 15 }, (_, index) => index + 1));
    assert.equal(round.phase, 'complete');
    assert.equal(round.currentQuestion, null);
    assert.equal(round.hits, 15);
    assert.equal(round.index, 14);
    assert.equal(round.answer('A'), null);
    assert.equal(round.advance(), false);
    assert.equal(JSON.stringify(questions), before);
});

test('quinze erros terminam com zero acertos', () => {
    const round = new SaciQuizRound(questions);
    for (const question of questions) { round.answer(wrongLetter(question)); round.advance(); }
    assert.equal(round.phase, 'complete');
    assert.equal(round.hits, 0);
});

test('resultado misto e reinício zeram índice, feedback, acertos e bloqueios', () => {
    const round = new SaciQuizRound(questions);
    questions.forEach((question, index) => {
        round.answer(index % 2 === 0 ? question.correta : wrongLetter(question)); round.advance();
    });
    assert.equal(round.hits, 8);
    round.reset();
    assert.equal(round.index, 0);
    assert.equal(round.currentQuestion.id, 1);
    assert.equal(round.phase, 'question');
    assert.equal(round.feedback, null);
    assert.equal(round.hits, 0);
    assert.equal(round.answer('B').isCorrect, true);
    assert.equal(round.hits, 1);
    round.reset(); // Também limpa uma rodada parcial, sem criar listeners.
    assert.equal(round.phase, 'question');
    assert.equal(round.hits, 0);
    assert.equal(round.feedback, null);
});

test('partidas independentes não compartilham contagem', () => {
    const first = new SaciQuizRound(questions);
    const second = new SaciQuizRound(questions);
    first.answer('B');
    assert.equal(second.hits, 0);
    assert.equal(second.phase, 'question');
});
