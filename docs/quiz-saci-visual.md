# Quiz do Saci

A cena continua sendo `SaciGame`, aberta pelo botão **Quiz do Saci** do menu.
Durante as perguntas e o feedback, o botão **Menu** no canto superior direito
permite sair da partida por mouse, toque ou teclado. Na conclusão, a saída
continua disponível no botão **Voltar ao menu**.
Há 15 perguntas na ordem fornecida, sem embaralhamento. A criança responde
uma vez, lê o feedback e só avança ao pressionar **Próxima**. Na pergunta 15,
o botão passa a **Finalizar**. A conclusão oferece **Jogar novamente** e
**Voltar ao menu**. Não há cronômetro, ranking, armazenamento ou pontuação extra.

## Abrir e testar

- Execute `npm run dev-nolog` e entre pelo menu ou acesse
  `http://localhost:8080/?saciQuiz` para abrir a partida diretamente em dev.
- Em Windows PowerShell que bloqueie npm.ps1, use `npm.cmd run dev-nolog`.
- Responda com mouse/toque, tanto no painel quanto no medalhão. A pressão deve
  começar e terminar na mesma opção; sair ou cancelar não registra resposta.
- Teclado: setas cima/baixo ou Tab movem o foco; Espaço/Enter ativam ao soltar;
  Escape volta ao menu. Após a resposta, o foco passa ao botão de avanço.
- `?quizVisual` abre apenas a demonstração com textos neutros e o inspetor de
  estados no rodapé. Não cria uma rodada nem revela o gabarito da partida.
  Esse modo e o inspetor são exclusivos de desenvolvimento. Voltar pelo menu
  e abrir o quiz inicia a partida normal, mesmo com a query de demo na URL.
- As rotas existentes `?walkLearning` e `?walkLayoutEditor` foram preservadas.

## Organização e fluxo (JavaScript e POO)

- `src/game/data/saciQuizQuestions.js` contém somente os dados: id, pergunta,
  três alternativas e correta. A/B/C correspondem às posições 0/1/2.
- `src/game/systems/SaciQuizRound.js` define a classe da rodada. Cada instância
  guarda seu índice, acertos, fase e feedback, sem depender do Phaser.
  `answer(letter)` só aceita uma escolha na fase question e muda para feedback
  antes de contar o acerto. `advance()` só funciona após responder. Depois da
  última questão, a fase é complete e currentQuestion retorna null.
  `reset()` limpa a partida sem recriar objetos de interface ou listeners.
- `src/game/scenes/SaciGame.js` conecta os dados, a rodada e a UI. O create
  aguarda as fontes, prepara texturas, cria a rodada e constrói a tela uma vez.
  `presentQuestion()` envia só o enunciado e as alternativas à interface.
  `handleAnswer(letter)` pede o resultado à rodada e só então mostra o gabarito.
  `advanceQuiz()` escolhe entre apresentar a próxima pergunta e a conclusão.
  `restartQuiz()` zera a rodada e reapresenta a primeira pergunta.
- `src/game/ui/quizSaciUI.js` constrói os elementos existentes e oferece
  showQuestion, showFeedback e showCompletion. Cada opção tem uma zona única,
  cobrindo painel e medalhão. O bloqueio de input é independente do estado
  visual, preservando os destaques correto/incorreto após a resposta.
- `src/game/data/quizSaciVisualConfig.js` separa o layout da demonstração e
  o da partida. O segundo aproxima as linhas, sem diminuir os painéis de
  1032 × 112, para reservar o rodapé de feedback e o botão. Textos são medidos
  pelo Phaser e ajustados somente quando necessário para caber na área útil.
- `src/game/data/quizSaciAssets.js` usa o manifesto aprovado para carregar os
  20 PNGs e aplicar NEAREST. A paleta mais vermelha do erro continua aplicada
  em memória, sem alterar PNGs, dimensões, alpha ou limites dos recortes.
- `src/game/dev/QuizVisualInspector.js` permanece isolado da partida normal.
- `Preloader.js` mantém o carregamento e as rotas; `petEducaUI.js` aceita
  dados opcionais ao abrir uma cena depois das fontes, usados para a demo.

O papel da classe é proteger as regras da rodada. O papel da cena é coordenar
as chamadas. A interface só transforma o resultado recebido em textos,
estados e ícones. Por exemplo: B → handleAnswer('B') → round.answer('B') →
showFeedback(result). O índice da alternativa é convertido em letra no input;
a comparação do gabarito usa letras, nunca índices numéricos.

## Renderização preservada

Phaser 4.0.0; tela lógica 1280 × 720, Scale.FIT, centralização, pixelArt e
roundPixels. O retrato é uma Image estática, sem a classe Saci do passeio.
Nine Slice continua em unidades nativas com escala 2 e recortes 8/8/8/8;
o separador usa três recortes horizontais, com bordas nativas de 4 pixels.
Canvas mantém a composição por recortes em memória, preservando cantos.
Nenhum novo asset foi gerado. Código e configuração dos demais minigames
não foram alterados nesta etapa.

## Verificações executadas

- `npm.cmd run test:quiz`: 19 testes passaram, sem dependências novas.
- `tests/saciQuizRound.test.js`: IDs 1–15, três alternativas, gabarito,
  respostas A/B/C, entrada inválida, resposta única, acertos únicos, avanço
  manual/duplo, quinze acertos, quinze erros, resultado misto e reinício.
- `tests/saciQuizUI.test.js`: eventos simulados de mouse/toque/teclado,
  bloqueio inclusive com dois ponteiros, destaques de erro/acerto, limpeza
  entre perguntas, Finalizar, resultado, reinício, retorno ao menu e limpeza
  de listeners e saída pelo Menu durante perguntas/feedback. Verifica também a separação demo/partida ao reabrir a cena. Exercita as APIs de WebGL e Canvas com objetos simulados;
  não executa o renderizador real nem mede a fonte real.
- `node tmp/quiz-visual-validation/check-ui.mjs`: verificações anteriores de
  geometria, estados, cantos/recortes, cancelamento e limpeza continuaram passando.
- `npm.cmd run build-nolog`: passou; aviso de chunk acima de 500 kB.
- `git diff --check`: passou.

O controle de navegador não disponibilizou apps ou abas nesta sessão.
A revisão em execução não foi realizada. Ainda precisam de revisão visual:
fontes e alternativas longas (sobretudo 6, 11 e 13), feedback longo, composição
em PC/celular horizontal, toque real, abertura pelo menu e regressão dos
outros minigames. Os testes com eventos simulados não substituem essa revisão.
