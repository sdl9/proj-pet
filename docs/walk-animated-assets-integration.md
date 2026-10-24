# Integração dos assets animados do passeio

Implementação local concluída em 24/10/2026, conforme o prompt em
`public/assets/WalkGame_Assets_Animados/PROMPT_INTEGRACAO_CODEX.md`.

## Comportamento

- Fonte: apenas a água anima, com 6 frames a 6 fps; base, encaixe e colisão da bacia preservados.
- Brinquedo de mola: 12 frames a 10 fps, sem tween adicional; posição e colisor da base fixos.
- Tutor e cachorro: sprite composto de 4 frames a 6 fps. Começa em `(544, 368)`,
  anda entre X 448 e 640 a 48 px/s e pausa por 320 ms nas extremidades.
  O retorno espelha o objeto inteiro, mantendo a ordem dos frames.
  Após ajuste solicitado, a escala do conjunto é 1,8 (20% maior que a escala inicial de 1,5),
  com o colisor acompanhando proporcionalmente o novo tamanho.
- Conversa e colisor acompanham o tutor. Qualquer diálogo congela percurso e
  passos, preservando posição, direção e eventual pausa restante.
- O estado de interação pertence à instância da cena; o JSON importado não é alterado.
  Ao sair ou destruir a cena, o controlador é descartado. A reentrada restaura o início.
- O editor usa os sprites animados com as mesmas chaves e dimensões por frame,
  mantendo os objetos disponíveis para arraste, sem executar o percurso.

## Arquivos alterados ou adicionados

| Arquivo | Alteração |
| --- | --- |
| `src/game/data/walkAnimatedAssets.js` | Configuração dos três spritesheets, preload e registro de animações sem duplicações. |
| `src/game/data/walkVisualConfig.js` | Escala do tutor com o cachorro aumentada para 1,8. |
| `src/game/scenes/Preloader.js` | Usa o carregamento dos assets animados. |
| `src/game/systems/WalkVisualBuilder.js` | Cria sprites para as três chaves aprovadas, com as posições, origens, escalas e profundidades existentes. |
| `src/game/systems/WalkTutorPatrol.js` | Percurso por delta, pausas, direção, sincronização e descarte. |
| `src/game/systems/WalkCollisionBuilder.js` | Vincula as zonas aos objetos e atualiza corpo e índice espacial estáticos ao mover o tutor. |
| `src/game/scenes/WalkGameLearning.js` | Estado local das interações, atualização do percurso antes da proximidade e pausa durante diálogos. |
| `public/assets/walk/animations/plaza-fountain-water-animated.png` | Cópia exata do PNG aprovado. |
| `public/assets/walk/animations/plaza-spring-rider-animated.png` | Cópia exata do PNG aprovado. |
| `public/assets/walk/animations/npc-tutor-cachorro-walk.png` | Cópia exata do PNG aprovado. |
| `tests/walkAnimations.browser-check.mjs` | Verificação no Edge dos sprites, percurso, interação, colisão, reentrada e editor. |
| `package.json` | Comando `test:walk-animations`. |
| `.gitignore` | Ignora capturas e relatório gerados pelo teste de animações. |
| `docs/walk-animated-assets-integration.md` | Este registro. |

O gerador mencionado em `walkAssetCatalog.js` não existe neste checkout. O catálogo
gerado foi preservado; o novo módulo compõe seu inventário e substitui os três
registros estáticos no preload, mantendo as chaves lógicas para colisões e editor.
Os hashes SHA-256 dos três PNGs de destino conferem com `MANIFESTO_ASSETS.json`.
As alterações locais preexistentes em `WalkDialogueSystem.js`,
`tests/walkUI.browser-check.mjs` e `dist.zip` foram preservadas.

## Validação executada

- `npm.cmd run build-nolog`: passou; apenas aviso de chunks maiores que 500 kB.
- `node tests/walkAnimations.browser-check.mjs`: passou no Edge headless com WebGL/SwiftShader.
  Verificou frames, taxas, dimensões e animação ativa; alinhamento das camadas;
  velocidade, extremos, pausas e delta variável; colisão física e índice espacial;
  ausência de barreira na origem; E, espaço e toque; congelamento e retomada;
  reentrada sem duplicação ou mutação do mapa; movimentação no editor.
- `node tests/walkUI.browser-check.mjs`: passou, incluindo diálogos, sete cuidados,
  teclado, toque em viewport horizontal, menu, reentrada e Quiz do Saci.
- `npm.cmd run test:quiz`: 19 testes passaram.
- `git diff --check`: passou.
- Capturas da praça, diálogo por toque e editor inspecionadas visualmente.
- Nenhum erro de execução ou carregamento de assets nos testes de navegador.

Os relatórios e capturas ficam em `tmp/walk-animations-validation/` e
`tmp/walk-ui-validation/` (artefatos locais ignorados pelo Git).
O toque foi emulado no navegador; não foi usado um celular físico.

## Como conferir no jogo

1. Execute `npm.cmd run dev-nolog` e abra `http://localhost:8080/?walkLearning`.
2. Observe a água da fonte e o brinquedo de mola. Acompanhe o tutor no caminho acima da fonte.
3. Aproxime-se do tutor e use E, espaço ou o botão de conversa. Conclua a fala para retomar o movimento.
4. Saia pelo Menu e entre novamente em Passeio Consciente para conferir o reinício do percurso.
5. Em desenvolvimento, `?walkLayoutEditor` abre o editor com os mesmos objetos animados.

Não há pendência funcional identificada nos testes executados. Uma conferência
adicional em celular físico pode complementar a emulação de toque.

