import { Boot } from './scenes/Boot';
import { Intro } from './scenes/Intro';
import { Game as MainGame } from './scenes/Game';
import { FoodGame } from './scenes/FoodGame';
import { GameOver } from './scenes/GameOver';
import { MainMenu } from './scenes/MainMenu';
import { Preloader } from './scenes/Preloader';
import { AUTO, Game, Scale } from 'phaser';
import { WalkGame } from './scenes/WalkGame';
import { WalkGameLearning } from './scenes/WalkGameLearning';
import { WalkLayoutEditor } from './dev/WalkLayoutEditor';

// Keep startup synchronous so src/main.js registers before DOMContentLoaded.
// Vite removes this unused scene from the production build.
const developmentScenes = import.meta.env.DEV
    ? [WalkLayoutEditor]
    : [];

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config = {
    type: AUTO,
    width: 1280,
    height: 720,
    parent: 'game-container',
    backgroundColor: '#028af8',
    pixelArt: true,
    roundPixels: true,
    input: {
        activePointers: 3
    },
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH
    },
    scene: [
        Boot,
        Preloader,
        Intro,
        MainMenu,
        FoodGame,
        WalkGame,
        WalkGameLearning,
        ...developmentScenes,
        MainGame,
        GameOver
    ],
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    }
};

const StartGame = (parent) => {

    return new Game({ ...config, parent });

}

export default StartGame;
