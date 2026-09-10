import { Math as PhaserMath, Physics } from 'phaser';

// Esta classe concentra a criacao dos objetos coletaveis do minigame.
// Neste momento ela funciona como uma "fabrica": o FoodGame pede um objeto,
// e FoodObjects devolve um placeholder ja criado, com fisica e movimento.
export default class FoodObjects extends Physics.Arcade.Sprite {

    // static significa que posso chamar FoodObjects.criarPlaceholder(...)
    // sem precisar fazer new FoodObjects(...).
    // Isso faz sentido agora porque ainda nao estamos criando um alimento
    // com comportamento proprio; estamos so reaproveitando uma funcao de criacao.
    static criarPlaceholder(cena, cor, tipo) {
        
        // A cena e passada como parametro porque so a Scene do Phaser sabe
        // adicionar coisas na tela e acessar sistemas como physics e scale.
        // Aqui, "cena" normalmente sera o this do FoodGame.
        const x = cena.scale.width + 50;
        
        // PhaserMath.Between sorteia um numero inteiro entre minimo e maximo.
        // Usamos isso para cada alimento nascer em uma altura diferente.
        const y = PhaserMath.Between(
            80,
            cena.scale.height - 80
        );
        
        // Placeholder visual temporario: um quadrado colorido.
        // Depois ele pode virar uma imagem/sprite de alimento.
        const placeholder = cena.add.rectangle(
            x,
            y,
            60,
            60,
            cor
        );
        
        placeholder.tipo = tipo;

        // Objetos criados com add.rectangle sao visuais.
        // Esta linha adiciona um corpo fisico Arcade a ele, permitindo colisao
        // e movimento por velocidade.
        cena.physics.add.existing(placeholder);

        // Como e um jogo visto de lado/tela fixa, nao queremos gravidade puxando
        // o alimento para baixo. Queremos apenas movimento horizontal.
        placeholder.body.setAllowGravity(false);

        // Velocidade negativa no eixo X move o objeto para a esquerda.
        // Isso simula os alimentos vindo do lado direito da tela.
        placeholder.body.setVelocityX(-500);

        // Retornar o objeto permite que o FoodGame guarde em this.alimentoBom
        // ou this.alimentoRuim e depois configure colisao com o player.
        return placeholder;
    }
}
