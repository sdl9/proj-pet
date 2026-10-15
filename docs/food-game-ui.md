# Interface do jogo de alimentação

As instruções do FoodGame reaproveitam apenas o painel da Intro sobre o
cenário original da alimentação. Não exibem o parque, o título Pet Educa ou
o retrato do Caramelo. Os textos, o botão Continuar e o Menu são mantidos.
O painel fica centralizado na tela, movendo textos e Continuar junto com ele.
Os textos existentes foram mantidos e organizados em blocos dentro do painel.
O container de instruções é destruído ao iniciar, removendo também seu input.
A partida só pode começar uma vez por entrada na cena.

Ao chegar a zero, o contador encerra a partida uma única vez. Movimento,
coletas e geração de alimentos param, preservando o Score final. O mesmo
método criarBalao monta o resultado centralizado sobre o jogo, exibindo
"Tempo esgotado!", "Seu Score: X" e o botão "Menu". Enter também retorna
ao menu nessa etapa. Reentrar inicia uma nova partida com 60 segundos e Score zero.

O botão Menu permanece no canto superior direito durante as instruções e
a partida. Usa o controle já compartilhado com o passeio. Escape também
retorna ao menu. A saída bloqueia novas ativações, interrompe o movimento
e cancela timer/spawn antes de trocar de cena. O cronômetro foi deslocado
para a esquerda do botão. Regras de alimentos, pontuação e movimento não mudaram.

Abra pelo menu: Jogo da Alimentação. Execute o Vite com npm.cmd run dev-nolog.
Para repetir a validação no navegador, execute npm.cmd run test:food-ui
com o servidor na porta 8080. O teste usa o Edge instalado em modo headless;
na sandbox deste ambiente, o navegador precisa ser executado fora dela.

Validação: painel comparado à Intro, cenário próprio preservado e ausência
do parque/título/retrato; medidas reais de texto e botão,
Menu antes/durante a partida, início único, remoção das instruções, movimento,
timer/spawn, Enter/Escape, toque emulado, cancelamento e reentrada limpa.
Passou em 1280 × 720 e 844 × 390, no Edge WebGL/SwiftShader, sem erros de
console/execução ou assets. Não foi usado um celular físico.
Capturas e relatório ficam em tmp/food-ui-validation. Build-nolog passou.
O teste também percorre os 60 ticks do contador (acelerando apenas seu
TimerEvent), confere o resultado, bloqueio de coletas/movimento após o fim,
Score positivo/negativo, saída por mouse/toque e reinício após a conclusão.

Arquivos: src/game/scenes/FoodGame.js, tests/foodGameUI.browser-check.mjs,
package.json, .gitignore e este documento. Intro e componentes compartilhados
continuam sem alterações nesta etapa.
