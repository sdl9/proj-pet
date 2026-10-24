import { WALK_IMAGE_ASSETS, WALK_SPRITESHEETS, WALK_JSON_ASSETS } from './walkAssetCatalog';

// Runtime overrides for the generated catalog. Its referenced generator is not
// present in this checkout; keep the generated inventory intact.
export const WALK_ANIMATED_ASSETS = Object.freeze([
    { key: 'plaza-fountain-water', path: 'walk/animations/plaza-fountain-water-animated.png',
        frameWidth: 160, frameHeight: 128, end: 5, frameRate: 6 },
    { key: 'plaza-spring-rider', path: 'walk/animations/plaza-spring-rider-animated.png',
        frameWidth: 96, frameHeight: 96, end: 11, frameRate: 10 },
    { key: 'npc-tutor-cachorro-guia', path: 'walk/animations/npc-tutor-cachorro-walk.png',
        frameWidth: 128, frameHeight: 64, end: 3, frameRate: 6 }
]);

export const WALK_ANIMATION_BY_KEY = new Map(
    WALK_ANIMATED_ASSETS.map(asset => [asset.key, asset])
);

export function preloadAnimatedWalkAssets(scene) {
    WALK_IMAGE_ASSETS.filter(({ key }) => !WALK_ANIMATION_BY_KEY.has(key))
        .forEach(({ key, path }) => scene.load.image(key, path));
    [...WALK_SPRITESHEETS, ...WALK_ANIMATED_ASSETS]
        .forEach(({ key, path, frameWidth, frameHeight }) => {
            scene.load.spritesheet(key, path, { frameWidth, frameHeight });
        });
    WALK_JSON_ASSETS.forEach(({ key, path }) => scene.load.json(key, path));
}

export function registerWalkAnimations(scene) {
    WALK_ANIMATED_ASSETS.forEach(({ key, end, frameRate }) => {
        const animationKey = `${key}-loop`;
        if (!scene.anims.exists(animationKey)) {
            scene.anims.create({
                key: animationKey,
                frames: scene.anims.generateFrameNumbers(key, { start: 0, end }),
                frameRate,
                repeat: -1
            });
        }
    });
}
