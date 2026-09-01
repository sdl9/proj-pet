export default class FuncoesUI {
    static criarMenuInicial(cena) {
        const estiloBotao = {
            fontFamily: 'Arial',
            fontSize: 34,
            color: '#ffffff',
            backgroundColor: '#ca1dda',
            padding: {
                x: 20,
                y: 10
            }
        };

        const minigames = [
            { texto: 'Jogo da Alimentação', cena: 'FoodGame' },
            { texto: 'Passeio Consciente', cena: 'WalkGame' },
            { texto: 'Quiz do Saci', cena: 'SaciGame' },
            { texto: 'Brinque com Caramelo', cena: 'DogGame' }
        ];

        // Cria um botão para cada minigame da lista
        minigames.forEach((minigame, index) => {
            const botao = cena.add.text(
                640,
                330 + index * 70, // desce 70px a cada botão
                minigame.texto,  // nome que aparece no botão
                estiloBotao
            )
                .setOrigin(0.5)     // centraliza pelo meio
                .setInteractive();  // deixa clicável

            botao.on('pointerdown', () => {
                cena.scene.start(minigame.cena);
            })
        });
    }

    static criarBotaoMenu(cena) {
        const botao = cena.add.text(650, 600, 'MENU', {
            fontFamily: 'Arial',
            fontSize: 24,
            color: '#ffffff',
            backgroundColor: '#2b7cff',
            padding: {
                x: 12,
                y: 8
            }
        })
            .setOrigin(0.5)
            .setInteractive();

        botao.on('pointerdown', () => {
            cena.scene.start('MainMenu')
        });

        return botao

    }
}
