# Interface do Passeio Consciente

A cena usada pelo menu continua sendo `WalkGameLearning`. Abra pelo menu
ou execute `npm.cmd run dev-nolog` e acesse `http://localhost:8080/?walkLearning`.

O botão **Menu**, fixo no canto superior direito, permanece disponível durante
a exploração e os diálogos. Ele encerra o movimento e volta ao menu principal.

## O que foi padronizado

- Moldura dos diálogos e indicador de cuidados.
- Opções da veterinária; botões FECHAR, CONTINUAR e CONCLUIR.
- Botão de interação por proximidade, incluindo o texto de instrução.
- Molduras e setas do direcional de toque, nas mesmas posições e áreas de antes.

São usados os PNGs existentes `question-panel.png` e
`answer-panel-{normal,hover,selected,disabled}.png` de `public/assets/quiz-saci/ui/`.
Nenhuma imagem foi gerada ou alterada. A fonte é Nunito Sans, peso 700,
e a cor de texto é #342B24, como no quiz. Falas usam 30 px, nomes 28 px,
opções 28 px, ações 24 px e instruções secundárias 20 px.

Não foi adicionada cauda: o painel é um HUD fixo, sem vínculo espacial com um
personagem do mapa. Também não foram adicionados retratos ou decorações.

## Como funciona a apresentação

`src/game/ui/pixelPanel.js` contém o Nine Slice extraído da implementação
existente do quiz. Os dois minigames agora usam essa mesma função. As bordas
continuam sendo lidas do manifesto: 8 pixels nativos em cada lado, escala 2.
A largura e a altura são divididas por 2 antes de criar/redimensionar o objeto.
A troca de estado reaplica origem zero, escala 2 e limites dos recortes.
O fallback Canvas recompõe nove/três recortes com NEAREST, sem deformar cantos.

`src/game/ui/walkUI.js` aplica os textos, molduras e botões do passeio.
Os botões têm uma única zona de input que cobre também o texto. Hover e foco
usam a textura hover; a pressão usa selected; setEnabled(false) usa disabled.
Só há ativação quando o gesto começa e termina no mesmo controle. Saída,
soltura externa, pausa, blur e cancelamento limpam o estado de pressão.
Esconder um botão desativa explicitamente sua zona. Não se usam correto/incorreto.

`WalkDialogueSystem.js` preserva as páginas e regras originais. O painel
cresce para cima conforme a altura real do texto, com os controles no rodapé.
A tela de tópicos reserva espaço para três opções de 720 × 64. Nomes, falas,
instruções e opções têm áreas separadas. Não há redução da fonte das falas.

A UI usa containers em escala 1 e scrollFactor 0; apenas as molduras têm
escala 2. As zonas de input também recebem scrollFactor 0 explicitamente,
para coincidirem com os botões após o deslocamento da câmera.

`WalkInteractionSystem.js` preserva a seleção por proximidade. O botão
apenas recebe a nova apresentação e cancela uma pressão se o NPC próximo mudar.
`VirtualDPad.js` usa os mesmos frames sem mudar tamanho, posições ou cálculo
das direções. Continua escondido/desativado quando o diálogo está aberto.

A rota direta do passeio agora aguarda as fontes já carregadas pelo Preloader.
Os caminhos dos assets, o registro de cenas, o menu e as outras rotas continuam iguais.
As regras de movimentação, colisão, conteúdo, condições e recompensas não mudaram.

## Validação

Com o Vite em execução, rode `npm.cmd run test:walk-ui`.
O teste usa o Edge instalado em modo headless, sem dependências novas.
Pode exigir execução fora da sandbox: nela o processo do Edge encerrou a conexão.
Ele gera `tmp/walk-ui-validation/report.json` e capturas PNG.

Foram verificados no navegador real (WebGL/SwiftShader):

- 1280 × 720 e celular horizontal emulado de 844 × 390.
- Abertura dos diferentes NPCs, câmera em posições diferentes e HUD fixo.
- Todas as 12 páginas, medidas com a fonte carregada, sem cortes ou sobreposição.
- Tópicos da veterinária, paginação e marcas de conclusão dos cuidados.
- Estados normal, hover, pressionado e desabilitado, incluindo bloqueio do input.
- Foco por Tab e ativação por Enter.
- Mouse, toque emulado, cancelamento e soltura; movimento pelo direcional.
- Bloqueio do direcional durante diálogo; fechamento sem input invisível.
- Cinco pontos, sete cuidados e conclusão preservados.
- Saída pelo botão Menu no PC e por toque, com/sem diálogo, cancelamento e reentrada.
- Quiz do Saci: aparência da moldura, resposta correta e avanço manual.
- Ausência de exceções, erros de console e erros HTTP dos assets.

Além disso: 19 testes do quiz e a verificação anterior de recortes/estados
continuaram passando; build-nolog e git diff --check passaram.
O build mantém o aviso de chunk maior que 500 kB.

As capturas foram inspecionadas visualmente. Não houve teste em um celular físico
ou GPU de hardware. O fallback Canvas foi verificado por testes simulados do quiz;
a renderização real desta etapa foi WebGL. Os arquivos de diálogos, mapa,
WalkPlayer, Saci e PNGs permaneceram sem alterações. A cena WalkGameLearning
recebeu somente o botão Menu e o bloqueio de movimento durante a saída.
A limpeza do direcional no shutdown foi ajustada para não atualizar molduras
que o Phaser já destruiu.

## Arquivos

- Novos: `src/game/ui/pixelPanel.js`, `src/game/ui/walkUI.js`,
  `tests/walkUI.browser-check.mjs` e este documento.
- Adaptados: `WalkDialogueSystem.js`, `WalkInteractionSystem.js`,
  `VirtualDPad.js`, `WalkGameLearning.js`, `Preloader.js` e `quizSaciUI.js`.
- Verificação/documentação: `tests/saciQuizUI.test.js`,
  `tmp/quiz-visual-validation/check-ui.mjs`, `package.json`, `.gitignore`
  e `docs/quiz-saci-visual.md`.
