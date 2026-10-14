# Quiz do Saci — Q4: pacote visual completo

Este pacote reúne o fundo definitivo da Q4, a interface aprovada da Q3 e o
retrato estático escolhido na Q2. Os 19 PNGs da Q3 foram preservados sem alterações.

## O que baixar e colocar no projeto

1. Baixe somente `quiz-saci-q4-assets.zip`.
2. Extraia o ZIP em uma pasta temporária.
3. Copie a pasta `public/assets/quiz-saci` do ZIP para:
   `D:/ARQUIVOS/Documents/proj-pet/public/assets/quiz-saci`.
4. Substitua os arquivos de mesmo nome dessa pasta se já copiou Q2 ou Q3.

Não é preciso baixar nenhum pacote anterior. Os arquivos do jogo ficam somente
em `public/assets/quiz-saci`. As pastas `previews` e `tools`, este README e o
relatório de validação servem para referência.

O repositório remoto não foi alterado. A cena, o carregamento e a lógica do quiz
ainda não foram implementados. Copiar os assets não faz a tela surgir no jogo.

## Estrutura

```text
public/assets/quiz-saci/
├── backgrounds/quiz-saci-background.png
├── characters/saci-quiz-portrait.png
├── ui/
│   ├── question-panel.png
│   ├── question-tail.png
│   ├── portrait-frame.png
│   ├── separator.png
│   ├── answer-panel-{normal,hover,selected,correct,wrong,disabled}.png
│   └── answer-badge-{normal,hover,selected,correct,wrong,disabled}.png
├── effects/
│   ├── correct-effect.png
│   └── wrong-effect.png
└── quiz-saci-assets-manifest.json
```

Total: 20 PNGs independentes. A imagem da composição em `previews` não deve ser
usada como fundo do jogo: ela já mostra os elementos montados para revisão.
O fundo verdadeiro está em `backgrounds` e não contém interface, personagem,
perguntas, respostas, letras ou mensagens.

## Medidas e escala

| Elemento | PNG nativo | Exibição lógica planejada |
|---|---|---|
| Fundo | 640 × 360 | 1280 × 720, escala 2× |
| Retrato e moldura | 96 × 96 | 192 × 192, escala 2× |
| Painel de pergunta | 64 × 64 | 960 × 192, Nine Slice |
| Painéis de alternativa | 64 × 64 | 1032 × 112, Nine Slice |
| Medalhões | 48 × 48 | 96 × 96, escala 2× |
| Ícones de feedback | 24 × 24 | 48 × 48, escala 2× |
| Cauda de fala | 16 × 16 | 32 × 32, escala 2× |
| Separador | 64 × 4 | 1184 × 8, 3-slice |

O fundo possui 14 cores opacas e deve ser exibido em escala 2× com amostragem
nearest-neighbor. Os painéis têm centros planos e cantos protegidos de 8 pixels
NATIVOS em todos os lados. Redimensione em unidades nativas e depois aplique
escala 2: pergunta de 480 × 96 e alternativa de 516 × 56.
Não estique os PNGs inteiros dos painéis como imagens comuns.

O separador usa bordas nativas de 4 pixels e altura nativa de 4 pixels:
3-slice de 592 × 4 seguido de escala 2.

O manifesto descreve os caminhos relativos a `assets`, chaves sugeridas,
dimensões, regiões escaláveis e posições. As posições são medidas pelo canto
superior esquerdo na tela lógica de 1280 × 720.

Reserve 24 pixels lógicos de margem interna para texto e 96 pixels à direita
das alternativas para ícones. O correto e o incorreto devem usar os símbolos
separados além da mudança de cor do painel.
O retrato permanece estático. Não há spritesheet nem animação facial neste pacote.

## Prévia e validação

- `previews/quiz-saci-composition-q4.png`: composição completa, 1280 × 720.
- `previews/quiz-saci-ui-states.png`: referência dos seis estados da interface.
- `validation.json`: medidas, paletas e alpha verificados.

Os PNGs de interface e personagem têm alpha somente 0/255; o fundo é totalmente
opaco. O fundo foi gerado a partir da direção visual aprovada e normalizado com
Python/Pillow para resolução nativa e paleta limitada, sem interpolação suave.
As verificações de arquivo e a composição estática passaram. Ainda não houve
integração ou teste de renderização dentro do Phaser.

## Reproduzir a normalização do fundo e a prévia

Requisitos: Pillow e numpy. Com os assets incluídos disponíveis, na pasta deste
pacote execute:

```bash
python tools/build_background.py public/assets/quiz-saci/backgrounds/quiz-saci-background.png
```

O script reutiliza a interface e o retrato incluídos para remontar a prévia.
Ele não implementa cena, perguntas, respostas ou pontuação.
