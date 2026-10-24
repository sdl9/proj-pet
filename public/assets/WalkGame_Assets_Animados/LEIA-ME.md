# WalkGame — assets animados aprovados

Pacote final das três atualizações visuais do Pet Educa. Os PNGs são os mesmos aprovados nesta conversa, sem alterações após a aprovação.

## Como integrar

1. Extraia o ZIP dentro da pasta do seu projeto. Ele cria a pasta `WalkGame_Assets_Animados`, sem substituir o código do jogo.
2. Abra `PROMPT_INTEGRACAO_CODEX.md` e cole seu conteúdo no Codex do VSCode, com o projeto aberto.
3. O prompt orienta o Codex a copiar os três spritesheets, integrar as animações e verificar o jogo.

## Conteúdo

| Pasta/arquivo | Conteúdo |
| --- | --- |
| `runtime/walk/animations/` | Três PNGs para uso no jogo |
| `previews/` | GIFs e pranchas dos movimentos aprovados |
| `frames/` | Frames individuais para inspeção |
| `referencias/` | Assets estáticos originais |
| `MANIFESTO_ASSETS.json` | Dimensões, índices, velocidades, percurso e hashes |
| `VALIDACAO.md` | Conferências dos arquivos e limites da entrega |
| `SHA256SUMS.txt` | Verificação de integridade dos arquivos do pacote |
| `PROMPT_INTEGRACAO_CODEX.md` | Instrução completa para o Codex no VSCode |

## Parâmetros aprovados

| Asset | Frame | Frames | Velocidade |
| --- | --- | --- | --- |
| Água da fonte | 160 × 128 px | 6 | 6 fps |
| Brinquedo de mola | 96 × 96 px | 12 | 10 fps |
| Homem e cachorro | 128 × 64 px | 4 | 6 fps |

O tutor parte de `(544, 368)`, anda entre `x = 448` e `x = 640` a `48 px/s`, com Y fixo e pausa de `320 ms` em cada extremidade. No retorno, a composição inteira é espelhada.

A fonte usa a base original com a água animada sobreposta. O balanço do brinquedo já está nos frames. A integração do tutor inclui o acompanhamento da colisão e do ponto de conversa e a pausa durante diálogos.

Os assets e o percurso estão aprovados visualmente. O código do jogo ainda será integrado e verificado pelo Codex no seu projeto local.
