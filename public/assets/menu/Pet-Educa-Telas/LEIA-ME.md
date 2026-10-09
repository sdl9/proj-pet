# Pet Educa — telas de apresentação e seleção

Pacote visual preparado para resolução lógica de 1280 × 720, orientação horizontal. Não contém implementação de cenas, navegação, animação ou lógica de minigames.

## O que copiar para o projeto

Copie `assets/` para uma pasta de imagens do projeto, por exemplo `public/assets/pet-educa-ui/`. Copie `fonts/` para a pasta de fontes, preservando os dois arquivos de licença. A organização definitiva pode seguir o padrão já usado no seu projeto.

Use somente as oito imagens de `assets/` para montar as cenas. As imagens de `previews/` demonstram o encaixe das peças e das fontes: são referências compostas e NÃO devem ser utilizadas como fundo final do jogo.

## Imagens separadas

| Arquivo | Medidas | Uso |
| --- | --- | --- |
| pet-educa-parque.png | 1280 × 720 | Fundo compartilhado, opaco e sem escrita |
| pet-educa-caramelo.png | 272 × 288 | Cachorro estático, transparente fora da silhueta |
| pet-educa-painel.png | 752 × 432 | Painel creme da apresentação, sem texto |
| pet-educa-botao-verde.png | 280 × 96 | Botão principal, sem texto |
| pet-educa-cartao.png | 704 × 128 | Uma base reutilizável para os três cartões |
| pet-educa-icone-alimentacao.png | 96 × 96 | Pote com ração e base verde |
| pet-educa-icone-passeio.png | 96 × 96 | Guia com base verde |
| pet-educa-icone-saci.png | 96 × 96 | Retrato do cavalo com base verde |

O título, os parágrafos, “Boa diversão!”, “Menu” e os três nomes dos minigames não estão gravados em nenhum PNG de `assets/`.

## Fontes locais

- `LilitaOne-Regular.ttf`: título e nomes dos botões/cartões. Família: Lilita One; peso normal.
- `NunitoSans-Variable.ttf`: apresentação e mensagem final. Família: Nunito Sans; peso recomendado 700 (negrito).

As fontes estão incluídas, assim o jogo não precisa solicitar os arquivos a um CDN. Ambas vêm do repositório oficial Google Fonts e acompanham suas licenças SIL Open Font License. Aguarde o carregamento das fontes antes de criar os objetos de texto no Phaser; isso evita renderização inicial com outra fonte.

O título do esboço foi aproximado com Lilita One, contorno marrom e sombra deslocada. Não é uma reprodução tipográfica idêntica das letras geradas por IA.

## Posições de referência

Todas as coordenadas abaixo são lógicas. Para imagens, `x` e `y` representam o canto superior esquerdo: use origem (0, 0), ou converta explicitamente para a origem escolhida. Os PNGs já possuem o tamanho de apresentação previsto, portanto podem começar em escala 1.

| Elemento | Apresentação | Menu |
| --- | --- | --- |
| Fundo | x=0, y=0 | x=0, y=0 |
| Título | centralizado em x=640, área superior y≈48–160 | mesma posição |
| Caramelo | x=940, y=364 | x=940, y=364 |
| Painel creme | x=128, y=192 | — |
| Botão verde | x=364, y=516 | — |
| Primeiro cartão | — | x=156, y=194 |
| Segundo cartão | — | x=156, y=344 |
| Terceiro cartão | — | x=156, y=494 |
| Ícones dos cartões | — | x=176; y=210, 360, 510 |

Recomendações de texto: título em Lilita One 104 px, creme, contorno marrom de cerca de 5 px; apresentação em Nunito Sans 30 px/peso 700, marrom; “Boa diversão!” em 30 px; “Menu” em Lilita One 46 px/creme; nomes dos minigames em Lilita One 42 px/marrom. Os rótulos dos cartões começam em x=300 e ficam centralizados verticalmente nos cartões.

As coordenadas e tamanhos são uma referência visual, não um teste executado dentro do projeto. O Phaser pode exigir pequenos ajustes no alinhamento vertical e nas quebras de linha por usar métricas de texto diferentes do renderizador da prévia.

## Texto da apresentação

Pet Educa é um jogo educativo desenvolvido em colaboração entre o projeto FeevalePet, da Universidade Feevale, e a aluna Laíssa Dornelles Sales. Criado sem fins lucrativos, convida todos a aprender sobre os animais brincando.

Para manter a composição, organize em dois blocos. Quebras previstas no primeiro:

Pet Educa é um jogo educativo  
desenvolvido em colaboração entre o projeto  
FeevalePet, da Universidade Feevale,  
e a aluna Laíssa Dornelles Sales.

Segundo bloco:

Criado sem fins lucrativos, convida todos  
a aprender sobre os animais brincando.

Mensagem final: Boa diversão!  
Botão principal: Menu

## Ordem dos cartões

1. Jogo da Alimentação
2. Passeio Consciente
3. Quiz do Saci

São somente três minigames. O Saci do ícone é o cavalo castanho, com crina escura e marca branca alongada. O ícone foi baseado no menu aprovado nesta conversa; não foi comparado com o retrato separado do quiz.

## Montagem e conferência no Phaser

Monte o fundo primeiro; depois painéis/cartões e personagem; depois ícones; por último os textos. A área de toque pode cobrir todo o cartão de 704 × 128. Mantenha a separação entre cartões, título e cachorro.

As imagens foram exportadas com amostragem por vizinho mais próximo, grade visual de 4 px, redução de paleta sem dithering e alfa binário nos recortes. Use filtragem por vizinho mais próximo para os sprites. O texto pode ter suavização própria para favorecer a leitura, conforme a escolha aprovada de fontes não pixeladas.

Antes de usar nas escolas, confira a leitura em celular na horizontal, o carregamento das fontes, as margens e o toque em toda a área dos cartões. A verificação deste pacote foi estática; controles e responsividade do projeto ainda não foram testados.

## Referências consultadas

- Passeio: https://github.com/sdl9/proj-pet/tree/walk-layout-editor-phase-a
- FoodGame: https://github.com/sdl9/proj-pet/tree/walk-game-l5-interactions
- Lilita One: https://github.com/google/fonts/tree/main/ofl/lilitaone
- Nunito Sans: https://github.com/google/fonts/tree/main/ofl/nunitosans

## Verificação do pacote

Foram conferidos: dimensões dos oito PNGs, transparência externa nas sete peças sobrepostas, ausência de texto nos assets, encaixe dos textos nas prévias, três cartões na ordem correta e integridade do ZIP.
