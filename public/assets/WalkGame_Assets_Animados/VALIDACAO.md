# Validação do pacote final

Os três assets, o ciclo de caminhada e a demonstração de ida e volta foram aprovados pela usuária nesta conversa.

## Arquivos conferidos

- Três spritesheets RGBA com transparência e dimensões compatíveis com todos os frames.
- Cópias dos PNGs aprovados preservadas byte a byte, com SHA-256 registrado no manifesto.
- Os 22 frames individuais correspondem exatamente aos recortes dos spritesheets.
- A máscara de transparência da água é a mesma da camada original em todos os seis frames.
- Os pixels da fonte fora da camada de água permanecem iguais aos do original.
- A base inferior do brinquedo permanece igual em todos os 12 frames; os frames neutros 0 e 6 são iguais ao original.
- As partes superiores e a guia do tutor permanecem estáveis entre os quatro frames de passos.
- A demonstração do percurso usa o spritesheet aprovado, sem alterações, e o espelhamento inteiro no retorno.
- GIFs e pranchas preservados a partir das etapas aprovadas.
- Integridade do ZIP e dos arquivos copiados conferida.

## Integração

Este pacote contém assets, prévias e instruções. O código do projeto não foi alterado nesta entrega, e nenhum build do jogo foi executado aqui. A integração e a verificação no navegador serão realizadas no checkout local pelo Codex do VSCode, seguindo o prompt incluído.

A revisão da arquitetura de referência identificou que o ponto de conversa e o colisor do tutor precisam acompanhar seu deslocamento. Esse requisito está detalhado no prompt, junto à pausa durante diálogos e ao reinício da cena.
