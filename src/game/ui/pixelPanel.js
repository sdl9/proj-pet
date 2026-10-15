import { CANVAS, Textures } from 'phaser';
import { QUIZ_SACI_ASSETS } from '../data/quizSaciAssets';

// WebGL usa o NineSlice nativo do Phaser 4. Canvas compõe os mesmos recortes
// numa textura em unidades nativas: somente centro/bordas extensíveis mudam.
export function addSlicedPanel(scene, key, x, y, width, height) {
    const asset = QUIZ_SACI_ASSETS[key];
    const { left, right, top = 0, bottom = 0, scale } = asset.nineSlice || asset.threeSlice;
    let nativeWidth = width / scale;
    let nativeHeight = height / scale;
    let currentTexture = key;
    const canvasKey = textureKey => {
        const result = textureKey + '-slice-' + nativeWidth + 'x' + nativeHeight;
        if (scene.textures.exists(result)) return result;
        const texture = scene.textures.createCanvas(result, nativeWidth, nativeHeight);
        const context = texture.context;
        const source = scene.textures.get(textureKey).getSourceImage();
        context.imageSmoothingEnabled = false;
        const sx = [0, left, source.width - right, source.width];
        const dx = [0, left, nativeWidth - right, nativeWidth];
        const sy = top ? [0, top, source.height - bottom, source.height] : [0, source.height];
        const dy = top ? [0, top, nativeHeight - bottom, nativeHeight] : [0, nativeHeight];
        for (let row = 0; row < sy.length - 1; row++) {
            for (let col = 0; col < 3; col++) {
                context.drawImage(source, sx[col], sy[row], sx[col + 1] - sx[col], sy[row + 1] - sy[row],
                    dx[col], dy[row], dx[col + 1] - dx[col], dy[row + 1] - dy[row]);
            }
        }
        texture.refresh().setFilter(Textures.FilterMode.NEAREST);
        return result;
    };
    const isCanvas = scene.game.renderer.type === CANVAS;
    const object = isCanvas
        ? scene.add.image(x, y, canvasKey(key))
        : scene.add.nineslice(x, y, key, undefined, nativeWidth, nativeHeight, left, right, top, bottom);
    object.setOrigin(0).setScale(scale);
    return {
        object,
        resize(width, height) {
            nativeWidth = width / scale;
            nativeHeight = height / scale;
            this.setStateTexture(currentTexture);
        },
        setStateTexture(textureKey) {
            currentTexture = textureKey;
            object.setTexture(isCanvas ? canvasKey(textureKey) : textureKey);
            if (!isCanvas) object.setSlices(nativeWidth, nativeHeight, left, right, top, bottom);
            object.setOrigin(0).setScale(scale);
        }
    };
}

