export default class FuncoesUI {
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

    static criarBotaoContinuar(cena, aoClicar) {
        const botao = cena.add.text(650, 500, 'CONTINUAR', {
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
            aoClicar();
        });

        return botao;
    }
}
