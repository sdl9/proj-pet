# Integração das telas do Pet Educa

A abertura normal segue Boot → Preloader → Intro → MainMenu. O Preloader continua carregando os assets atuais e acrescenta oito texturas exclusivas com prefixo `pet-educa-ui-`. Imagens e fontes locais estão em `public/assets/pet-educa-ui/`, com as duas licenças das fontes preservadas.

## Navegação

- Jogo da Alimentação: `FoodGame` (tela de instruções existente).
- Passeio Consciente: `WalkGameLearning` (mapa e interações atuais). A implementação de `WalkGame` está comentada e não é usada pelo menu.
- Quiz do Saci: cartão visível e marcado “Indisponível”, sem área interativa ou chave de cena inventada. Quando existir uma cena registrada, definir sua chave no campo `scene` do terceiro cartão.

Não há quarto cartão. Os métodos existentes de retorno ao menu e de continuar nos minigames foram preservados em `FuncoesUI.js`; somente o menu provisório antigo foi removido.

## Onde editar

`src/game/ui/petEducaUI.js` reúne textos, caminhos dos PNGs, famílias, cores, tamanhos e coordenadas lógicas das telas. `Intro.js` monta painel e botão; `MainMenu.js` monta cartões, ícones e o aviso de indisponibilidade. Os arquivos e o intervalo de peso variável da Nunito Sans são declarados pelos `@font-face` em `public/style.css`.

As fontes começam a carregar durante o Preloader. Antes de criar os textos das telas, a interface confirma que Lilita One e Nunito Sans 700 carregaram. Falhas e timeout de 10 segundos mostram uma mensagem explícita com orientação para recarregar. As rotas `?walkLearning` e `?walkLayoutEditor` mantêm o fluxo direto e não dependem dessas fontes. O menu também confirma as fontes quando aberto a partir de outra cena.

As imagens usam origem (0, 0), escala 1 e filtragem por vizinho mais próximo. A configuração Phaser de 1280 × 720, FIT e CENTER_BOTH foi preservada; o CSS dimensiona o contêiner para o espaço disponível, usando 100dvh com fallback 100vh.

O botão e os dois cartões disponíveis recebem mouse/toque em toda a área retangular. Ícones e textos não interceptam input. Há uma trava para navegação única e remoção dos listeners de teclado no shutdown. Enter/Espaço abre o menu e ativa uma opção; as setas alternam entre os dois minigames disponíveis, com indicação visual de foco apenas ao usar teclado.

## Validação em 09/10/2026

- `npm run build-nolog`: passou; o Vite avisou sobre o tamanho do chunk Phaser.
- Com `npm run dev-nolog` ativo, `node src/game/ui/petEducaUI.browser-check.mjs`: passou no Edge headless real, usando o aplicativo Vite e sem renderer substituto.
- Conferidos: textos exatos e acentos, fontes locais carregadas e peso 200–900 declarado, geometria e ordem dos três cartões, filtros de textura, mouse nas bordas/ícones/rótulos, teclado, reaberturas sem acúmulo de elementos/listeners, abertura de FoodGame e WalkGameLearning, cartão de quiz desativado, contatos simultâneos com transição única e tratamento explícito de rejeição/timeout das fontes.
- Conferidas as rotas de desenvolvimento, criação do editor e remoção de seu painel ao sair. Os 26 arquivos de código fora desta integração permaneceram idênticos por SHA-256, incluindo cenas, física, mapas, diálogos, controles e editor.
- Capturas das duas telas em 1280 × 720 foram comparadas visualmente às prévias aprovadas. Também foram inspecionadas as capturas em viewport horizontal de 740 × 360 (DPR 2): canvas exibido em 640 × 360, centralizado, sem cortes ou sobreposições. Mouse e toque emulado foram testados nos dois cartões disponíveis; o quiz permaneceu desativado.
- O fluxo normal não produziu erros de console, fontes, texturas, carregamento ou chaves de cena. Os testes de fontes provocam erros deliberadamente, em páginas separadas.
- Capturas finais: `tmp/pet-educa-check-n7C1Sh/`.

O teste existente `node src/game/dev/WalkLayoutEditor.browser-check.mjs` falha na comparação de visuais entre passeio e editor porque inclui jogador, Saci, coração e controles que não fazem parte do cenário editável. A mesma falha foi reproduzida numa cópia isolada das fontes anteriores à integração (porta 8081); o teste original foi preservado. O novo teste confirma acesso e limpeza do editor. Uma cópia temporária do teste antigo (tmp/walk-editor-static-check.mjs), filtrando somente jogador, Saci, coração e controles da comparação de cenário, passou por todas as verificações seguintes: seleção/arraste, snap de 16 px, arraste livre com Shift, composições, exportação real de JSON, preservação dos arquivos oficiais, descarte das alterações provisórias ao recarregar e retorno ao passeio. Evidências em tmp/walk-editor-check-BAMmJH/. A falha antiga permanece no script original, que não foi alterado.

Pendências: cena do Quiz do Saci e teste em aparelho físico. Toque emulado não substitui validação em celular real. Não foram feitos commit, push ou deploy; a branch `walk-game-l5-interactions` foi mantida.
