# Integração dos assets animados aprovados do WalkGame

Integre ao meu projeto Pet Educa, em Phaser + JavaScript, os três assets já aprovados: água da fonte, brinquedo de mola e homem passeando com cachorro. Execute a integração e as verificações disponíveis; ao terminar, explique brevemente o que mudou e como conferir no jogo.

## 1. Inspecione o projeto antes de editar

- Leia as instruções locais, inclusive AGENTS.md quando existir, e identifique a cena de passeio realmente usada, seu carregamento de assets, a criação dos objetos, as colisões e as interações.
- Trabalhe no checkout local atual. A referência consultada para este pacote foi `sdl9/proj-pet`, branch `walk-game-l5-interactions`. O código local é a referência para a implementação; adapte os pontos abaixo se ele tiver evoluído.
- Localize a pasta extraída `WalkGame_Assets_Animados` e leia `MANIFESTO_ASSETS.json`, `LEIA-ME.md` e os GIFs em `previews/`.
- As imagens e os movimentos já foram aprovados. Preserve os PNGs fornecidos, a estética, as posições, as escalas, as origens e a composição existente da praça. A mudança é nas animações e no deslocamento do tutor.
- Preserve o trabalho local e os demais minigames, controles, diálogos e progresso educativo.

Na referência consultada, os pontos relevantes são:

- `src/game/scenes/WalkGameLearning.js`;
- `src/game/systems/WalkVisualBuilder.js`;
- `src/game/data/walkAssetCatalog.js` e o carregamento usado pelo Preloader;
- `src/game/data/walkStage18Map.json` e `walkVisualConfig.js`;
- `src/game/systems/WalkCollisionBuilder.js`;
- `src/game/systems/WalkInteractionSystem.js`;
- `src/game/systems/WalkDialogueSystem.js`;
- `public/assets/walk/collision-depth-manifest.json` e demais manifestos usados.

## 2. Instale e carregue os três spritesheets

Copie os PNGs de `runtime/walk/animations/` para `public/assets/walk/animations/`, preservando os arquivos fornecidos. `frames/`, `previews/`, `referencias/` e a documentação são material de inspeção e não precisam ser publicados em `public/assets`.

| Arquivo | Dimensão total | Frame | Índices | Velocidade |
| --- | --- | --- | --- | --- |
| `plaza-fountain-water-animated.png` | 960 × 128 px | 160 × 128 px | 0–5 | 6 fps |
| `plaza-spring-rider-animated.png` | 1152 × 96 px | 96 × 96 px | 0–11 | 10 fps |
| `npc-tutor-cachorro-walk.png` | 512 × 64 px | 128 × 64 px | 0–3 | 6 fps |

Todos são spritesheets horizontais, sem espaçamento ou margem, com transparência. As três animações repetem continuamente (`repeat: -1`).

Use o fluxo de preload e os padrões existentes. Evite carregar uma imagem estática e um spritesheet com a mesma chave. O catálogo de referência contém comentário de arquivo gerado: procure sua fonte/gerador e respeite o fluxo encontrado, sem inventar um script ausente. Registre as animações sem duplicar chaves ao reiniciar a cena.

As chaves lógicas antigas ajudam a preservar os vínculos do cenário e dos manifestos. Se mantiver essas chaves para os spritesheets, substitua seus registros de preload de forma consistente. Se usar novas chaves de textura, mantenha uma associação explícita com as chaves lógicas originais para as colisões e o registro visual.

## 3. Anime somente a água da fonte

- Na referência, `plaza-fountain` já é composto pelas camadas `plaza-fountain-base` e `plaza-fountain-water`.
- Preserve a base original e substitua somente a camada de água pelo sprite animado.
- A água deve usar o mesmo ponto de ancoragem, origem e escala da base. Na referência, a posição é `(800, 470)`, a origem é `(0.5, 1)` e a escala é `1.25`; confira os valores locais e preserve o encaixe existente.
- Mantenha a ordenação das duas camadas. A água não deve deslocar a estrutura nem ganhar um colisor próprio.
- Preserve a colisão da bacia, associada logicamente à fonte. Evite desenhar simultaneamente a imagem completa estática e as camadas, o que duplicaria a água.

## 4. Anime o brinquedo de mola

- Use os 12 frames fornecidos no lugar do desenho estático de `plaza-spring-rider`.
- O balanço já está desenhado nos frames. Mantenha a posição do objeto fixa, sem adicionar outra rotação, oscilação ou deslocamento por tween.
- Na referência, ele fica em `(1344, 656)`, escala `1`, origem `(0.5, 1)`. Preserve os valores locais.
- A base inferior e sua colisão permanecem fixas; a colisão não deve oscilar com o cachorro de brinquedo nem usar toda a largura de 1152 px da folha.

## 5. Faça o homem e o cachorro caminharem juntos

Troque o objeto estático associado a `npc-tutor-cachorro-guia` pelo sprite composto aprovado. Homem, cachorro e guia continuam em um único objeto visual.

Parâmetros aprovados:

- posição inicial: `(544, 368)`;
- limite esquerdo: `x = 448`;
- limite direito: `x = 640`;
- `y = 368` constante;
- velocidade: `48` pixels por segundo;
- pausa nas extremidades: `320` milissegundos;
- direção inicial: direita;
- escala: `1.5`; origem usada pela criação visual de referência: `(0.5, 1)`;
- animação: frames `0–3`, a `6` fps.

Comece na posição inicial e vá ao limite direito; depois alterne entre os limites. A posição inicial já está no meio do trajeto e não deve saltar para uma extremidade no início.

No retorno, espelhe o sprite inteiro com `flipX`. Os frames continuam em ordem `0, 1, 2, 3`: não reverta a animação. Assim os dois olham para a direção do movimento e a guia permanece conectada. Na pausa da extremidade, congele o ciclo de passos; retome-o ao voltar a andar.

Faça o deslocamento depender do tempo (`delta` ou recurso equivalente já usado pelo projeto), com velocidade constante, evitando um easing que acelere e freie ao longo de todo o percurso. Trate a ultrapassagem dos limites sem tremores. Atualize a profundidade conforme a regra de Y existente.

### Conversa e pausa

- O ponto de interação `guia` deve acompanhar a posição atual do sprite, preservando diálogo, rótulo, raio e lições associados.
- Crie estado de interação próprio da instância da cena. Não altere continuamente o JSON importado compartilhado: isso deixaria posições persistentes depois de sair e voltar ao passeio.
- Atualize a posição da interação antes de calcular qual interação está próxima. Preserve teclado, espaço e toque.
- Pause o percurso e o ciclo de passos enquanto houver diálogo aberto. Na referência existe `dialogueSystem.isOpen()`; reutilize o estado real encontrado, inclusive a abertura por toque.
- Ao fechar a conversa, retome da mesma posição e direção. O tempo passado no diálogo não deve virar distância acumulada nem consumir a pausa da extremidade.

### Colisão do tutor

Este ponto é necessário: no código de referência, `WalkCollisionBuilder` cria zonas físicas estáticas separadas dos desenhos. Mover apenas o sprite deixaria o colisor parado.

- Preserve a definição lógica de colisão do tutor quando a chave de textura mudar. No código consultado, as colisões educativas são buscadas por `object.texture.key`.
- Faça a zona/body do tutor acompanhar a posição real do sprite. Se usar zona estática movida, sincronize também seu corpo físico conforme o mecanismo correto da versão instalada.
- Use as dimensões de um frame (`128 × 64`) e a origem/escala reais do objeto ao posicionar a colisão, sem confundir a largura do spritesheet com a largura do personagem.
- Na referência, a área `group-base` tem `x: 16`, `y: 40`, `width: 96`, `height: 22`. Ela é simétrica horizontalmente; confira a definição local e trate o espelhamento se houver alterações.
- Evite manter duas colisões para o mesmo tutor, perder a colisão ao trocar sua textura ou deixar uma barreira invisível na posição inicial.

## 6. Organização e ciclo de vida

Mantenha a implementação pequena e compreensível, aproveitando as classes e os padrões existentes. Um controlador separado para as animações ambientais pode ser usado se ajudar a organizar a cena; evite uma reestruturação ampla.

Ao sair, reiniciar ou destruir a cena, encerre os timers, tweens e listeners adicionados e descarte o estado da instância. Ao entrar novamente, o tutor começa em `(544, 368)`, olhando para a direita, sem animações ou colisores duplicados. Preserve o funcionamento do editor de layout, se houver.

## 7. Verificações e entrega

Execute o build disponível no projeto. Na referência existe `npm run build-nolog`; confira o `package.json` local antes de escolher o comando. Use as verificações existentes pertinentes às mudanças e confira no navegador, quando disponível:

1. Fonte: água animada, base alinhada, sem desenho ou colisão duplicados.
2. Brinquedo: balanço no mesmo lugar, base fixa e aparência igual ao GIF aprovado.
3. Tutor: passos e patas ativos, ida e volta nos limites, direção correta e pausas.
4. Interação com o tutor perto de cada extremidade, por teclado e toque; conversa pausa e depois retoma o movimento sem salto.
5. Colisão perto da posição inicial e durante o percurso, sem colisor abandonado ou desaparecido.
6. Entrada, saída e nova entrada na cena, incluindo ausência de duplicações e erros de assets no console.

Não apresente como testado algo que não conseguiu executar. Ao terminar, liste os arquivos alterados, as verificações realizadas e qualquer ponto que ainda precise de conferência manual. Não é necessário aguardar outra aprovação para implementar estas mudanças no projeto local.
