export const WALK_VISUAL_CONFIG = Object.freeze({
    ambientAssetScales: Object.freeze({
        'plaza-fire-hydrant': 0.6,
        'plaza-bike-rack': 0.7,
        'plaza-fountain': 1.25
    }),
    humanOriginY: 61 / 64,
    educational: Object.freeze({
        tutor: Object.freeze({
            scale: 1.5
        }),
        booth: Object.freeze({
            scale: 1.35,
            humanScale: 1.5
        }),
        restArea: Object.freeze({
            scale: 1.35,
            seatedPersonScale: 1.5,
            seatedPersonOffset: Object.freeze({ x: -24, y: 0 }),
            restingDogOffset: Object.freeze({ x: 32, y: 0 })
        })
    })
});
