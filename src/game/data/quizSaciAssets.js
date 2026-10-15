import { Textures } from 'phaser';
import manifest from '../../../public/assets/quiz-saci/quiz-saci-assets-manifest.json';

export const QUIZ_SACI_MANIFEST = manifest;
export const QUIZ_SACI_ASSETS = Object.fromEntries(manifest.images.map(asset => [asset.key, asset]));

// Caminhos relativos ao setPath('assets') do Preloader.
export function preloadQuizSaciAssets(scene) {
    manifest.images.forEach(({ key, path }) => scene.load.image(key, path));
}

export function prepareQuizSaciTextures(scene) {
    const missing = manifest.images.filter(({ key }) => !scene.textures.exists(key));
    if (missing.length) throw new Error('Assets do quiz ausentes: ' + missing.map(a => a.path).join(', '));
    // Ajuste visual do erro em memória, igual em WebGL e Canvas.
    // Mantém PNGs aprovados, transparência, dimensões e recortes originais.
    for (const key of ['quiz-saci-answer-panel-wrong', 'quiz-saci-answer-badge-wrong']) {
        const source = scene.textures.get(key).getSourceImage();
        if (source instanceof HTMLCanvasElement) continue; // Reabrir a cena não acumula a cor.
        const canvas = document.createElement('canvas');
        canvas.width = source.width;
        canvas.height = source.height;
        const context = canvas.getContext('2d');
        context.drawImage(source, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < pixels.data.length; i += 4) {
            pixels.data[i + 1] = Math.round(pixels.data[i + 1] * 0.6);
            pixels.data[i + 2] = Math.round(pixels.data[i + 2] * 0.6);
        }
        context.putImageData(pixels, 0, 0);
        scene.textures.remove(key);
        scene.textures.addCanvas(key, canvas);
    }
    manifest.images.forEach(({ key }) => scene.textures.get(key).setFilter(Textures.FilterMode.NEAREST));
}
