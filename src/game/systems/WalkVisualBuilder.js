import { WALK_VISUAL_CONFIG } from '../data/walkVisualConfig';

const COMPOSITE_LAYERS = Object.freeze({
    'plaza-tree-large': [
        'plaza-tree-large-base',
        'plaza-tree-large-canopy'
    ],
    'plaza-tree-young': [
        'plaza-tree-young-base',
        'plaza-tree-young-canopy'
    ],
    'plaza-fountain': [
        'plaza-fountain-base',
        'plaza-fountain-water'
    ]
});

export class WalkVisualBuilder {
    constructor(scene) {
        this.scene = scene;
    }

    build(stageMap, prototypeLayout, { includeRegistry = false } = {}) {
        this.createModularTerrain(prototypeLayout);

        // Stable source-slot IDs distinguish repeated textures without changing source data.
        const ambientRecords = stageMap.ambientAssets.map((asset, index) => ({
            id: `ambient:${index}`,
            key: asset.key,
            group: null,
            sourceIndex: index,
            renderMode: asset.renderMode,
            anchor: { x: asset.x, y: asset.y },
            objects: this.createAmbientAsset(asset)
        }));
        const ambientObjects = ambientRecords.flatMap((record) => record.objects);
        const educationalElements = this.createEducationalElements(
            stageMap,
            prototypeLayout
        );
        const educationalRecord = (id, group, keys) => {
            const objects = keys.map((key) => educationalElements.find((object) => object.texture.key === key));
            return {
                id, group, key: keys[0], objects,
                anchor: { x: objects[0].x, y: objects[0].y }
            };
        };

        return {
            ambientObjects,
            educationalElements,
            visualRegistry: includeRegistry ? [
                ...ambientRecords,
                educationalRecord('education:guide', null, ['npc-tutor-cachorro-guia']),
                educationalRecord('composition:rest', 'descanso', [
                    'walk-bench', 'npc-pessoa-sentada', 'npc-cachorro-descansando'
                ]),
                educationalRecord('composition:booth', 'estande', [
                    'walk-booth', 'npc-voluntaria', 'npc-veterinaria', 'walk-booth-front'
                ]),
                educationalRecord('composition:water', 'agua', [
                    'walk-drinking-fountain', 'walk-water-bowl'
                ])
            ] : undefined,
            width: prototypeLayout.world.width,
            height: prototypeLayout.world.height
        };
    }

    createModularTerrain({ world, terrain, fence, decorations }) {
        this.tileSize = world.tileSize;

        for (let row = 0; row < world.rows; row += 1) {
            for (let column = 0; column < world.columns; column += 1) {
                const frame = this.getTerrainFrame(column, row, terrain);
                this.createTile(column, row, frame, -1000);
            }
        }

        this.createFence(fence, -900);
        decorations.forEach(({ tile, x, y }) => {
            this.createTile(x, y, tile, -800);
        });
    }

    getTerrainFrame(column, row, terrain) {
        if (this.isInside(column, row, terrain.water)) {
            return 5;
        }

        if (this.isInside(column, row, terrain.dirt)) {
            return 4;
        }

        if (
            this.isInside(column, row, terrain.verticalPath)
            || this.isInside(column, row, terrain.horizontalPath)
        ) {
            return (column + row) % 4 === 0 ? 3 : 2;
        }

        return (column + row) % terrain.grassVariantModulo === 0 ? 1 : 0;
    }

    isInside(column, row, area) {
        return column >= area.xMin
            && column <= area.xMax
            && row >= area.yMin
            && row <= area.yMax;
    }

    createFence({ leftX, rightX, topY, bottomY, bottomOpening }, depth) {
        this.createTile(leftX, topY, 22, depth);
        this.createTile(rightX, topY, 23, depth);
        this.createTile(leftX, bottomY, 25, depth);
        this.createTile(rightX, bottomY, 24, depth);

        for (let column = leftX + 1; column < rightX; column += 1) {
            this.createTile(column, topY, 20, depth);

            if (!bottomOpening.includes(column)) {
                this.createTile(column, bottomY, 20, depth);
            }
        }

        this.createTile(bottomOpening[0] - 1, bottomY, 27, depth);
        this.createTile(bottomOpening[1] + 1, bottomY, 26, depth);

        for (let row = topY + 1; row < bottomY; row += 1) {
            this.createTile(leftX, row, 21, depth);
            this.createTile(rightX, row, 21, depth);
        }
    }

    createTile(column, row, frame, depth) {
        this.scene.add
            .image(
                (column * this.tileSize) + (this.tileSize / 2),
                (row * this.tileSize) + (this.tileSize / 2),
                'walk-tileset',
                frame
            )
            .setDepth(depth);
    }

    createAmbientAsset({ key, x, y, renderMode }) {
        const textureKeys = renderMode === 'layers'
            ? COMPOSITE_LAYERS[key] ?? [key]
            : [key];
        const scale = WALK_VISUAL_CONFIG.ambientAssetScales[key] ?? 1;

        return textureKeys.map((textureKey, layerIndex) => (
            this.createImage(textureKey, x, y, y + (layerIndex * 0.01), { scale })
        ));
    }

    createEducationalElements(stageMap, prototypeLayout) {
        const interactionById = new Map(
            stageMap.interactions.map((interaction) => [interaction.id, interaction])
        );
        const { placements } = prototypeLayout;
        const guide = interactionById.get('guia');
        const volunteer = interactionById.get('feevalepet');
        const veterinarian = interactionById.get('veterinaria');
        const restArea = interactionById.get('descanso');
        const waterArea = interactionById.get('agua');
        const { tutor, booth, restArea: restAreaConfig } = WALK_VISUAL_CONFIG.educational;
        const volunteerPosition = this.scalePositionFromAnchor(
            volunteer,
            placements.booth,
            booth.scale
        );
        const veterinarianPosition = this.scalePositionFromAnchor(
            veterinarian,
            placements.booth,
            booth.scale
        );
        const seatedPersonPosition = this.getCompositionPosition(
            restArea,
            restAreaConfig.seatedPersonOffset,
            restAreaConfig.scale
        );
        const restingDogPosition = this.getCompositionPosition(
            restArea,
            restAreaConfig.restingDogOffset,
            restAreaConfig.scale
        );

        return [
            this.createImage('npc-tutor-cachorro-guia', guide.x, guide.y, guide.y, { scale: tutor.scale }),
            this.createImage('walk-booth', placements.booth.x, placements.booth.y, placements.booth.y, { scale: booth.scale }),
            this.createImage('npc-voluntaria', volunteerPosition.x, volunteerPosition.y, placements.booth.y + 0.1, {
                originY: WALK_VISUAL_CONFIG.humanOriginY,
                scale: booth.humanScale
            }),
            this.createImage('npc-veterinaria', veterinarianPosition.x, veterinarianPosition.y, placements.booth.y + 0.1, {
                originY: WALK_VISUAL_CONFIG.humanOriginY,
                scale: booth.humanScale
            }),
            this.createImage('walk-booth-front', placements.booth.x, placements.booth.y, placements.booth.y + 0.2, { scale: booth.scale }),
            this.createImage('walk-bench', restArea.x, restArea.y, restArea.y, { scale: restAreaConfig.scale }),
            this.createImage('npc-pessoa-sentada', seatedPersonPosition.x, seatedPersonPosition.y, restArea.y + 0.1, {
                originY: WALK_VISUAL_CONFIG.humanOriginY,
                scale: restAreaConfig.seatedPersonScale
            }),
            this.createImage('npc-cachorro-descansando', restingDogPosition.x, restingDogPosition.y, restArea.y + 0.2, {
                originY: WALK_VISUAL_CONFIG.humanOriginY,
                scale: restAreaConfig.scale
            }),
            this.createImage('walk-drinking-fountain', placements.drinkingFountain.x, waterArea.y, waterArea.y),
            this.createImage('walk-water-bowl', placements.waterBowl.x, waterArea.y, waterArea.y + 0.1)
        ];
    }

    scalePositionFromAnchor(position, anchor, scale) {
        return {
            x: anchor.x + ((position.x - anchor.x) * scale),
            y: anchor.y + ((position.y - anchor.y) * scale)
        };
    }

    getCompositionPosition(anchor, offset, scale) {
        return {
            x: anchor.x + (offset.x * scale),
            y: anchor.y + (offset.y * scale)
        };
    }

    createImage(key, x, y, depth, { originY = 1, scale = 1 } = {}) {
        return this.scene.add
            .image(x, y, key)
            .setOrigin(0.5, originY)
            .setScale(scale)
            .setDepth(depth);
    }
}
