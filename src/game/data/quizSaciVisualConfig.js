import { QUIZ_SACI_MANIFEST } from './quizSaciAssets';

export const QUIZ_SACI_LAYOUT = {
    ...QUIZ_SACI_MANIFEST.layout,
    scale: QUIZ_SACI_MANIFEST.pixelScale,
    tail: { x: 252, y: 116 },
    questionFontSize: 36,
    answerFontSize: 36,
    letterFontSize: 40,
    textColor: '#342B24'
};

// Mantém dimensões e recortes dos painéis. Aproxima as linhas para reservar
// um rodapé de feedback e avanço sem cobrir nenhuma alternativa.
export const QUIZ_SACI_PLAY_LAYOUT = {
    ...QUIZ_SACI_LAYOUT,
    answers: { ...QUIZ_SACI_LAYOUT.answers, ys: [248, 368, 488] },
    badges: { ...QUIZ_SACI_LAYOUT.badges, ys: [256, 376, 496] },
    separator: { ...QUIZ_SACI_LAYOUT.separator, y: 240 },
    answerTextHeight: 88,
    exitMenu: { x: 1032, y: 48, width: 184, height: 64 },
    footer: { x: 48, y: 616, width: 928, height: 88 },
    next: { x: 1008, y: 624, width: 224, height: 72 },
    result: { x: 200, y: 280, width: 1032, height: 320 }
};

// Conteúdo neutro exclusivo do modo de demonstração ?quizVisual (dev).
export const QUIZ_SACI_DEMO_TEXT = {
    question: 'Este é o espaço da pergunta. O texto de demonstração ocupa até três linhas e permite conferir a leitura e os acentos: ação, atenção e opção.',
    answers: [
        'Texto de demonstração da alternativa A.',
        'Texto de demonstração da alternativa B.',
        'Texto de demonstração da alternativa C.'
    ]
};
