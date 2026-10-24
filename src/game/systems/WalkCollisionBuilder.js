export class WalkCollisionBuilder {
    constructor(scene, collisionManifest) {
        this.scene = scene;
        this.definitions = collisionManifest.objects;
        this.staticBodies = scene.physics.add.staticGroup();
        this.objectZones = new WeakMap();
    }

    build({ player, stageMap, prototypeLayout, visualRegistry }) {
        this.createTerrainCollisions(prototypeLayout);
        this.createAmbientCollisions(stageMap, visualRegistry);
        this.createEducationalCollisions(visualRegistry);

        const collider = this.scene.physics.add.collider(
            player,
            this.staticBodies
        );

        return {
            staticBodies: this.staticBodies,
            collider,
            bodyCount: this.staticBodies.getLength(),
            syncObject: (object) => this.syncObjectCollisions(object)
        };
    }

    createTerrainCollisions({ world, terrain, fence }) {
        this.createTileArea(terrain.water, world.tileSize, 'water');

        this.createTileArea({
            xMin: fence.leftX,
            xMax: fence.rightX,
            yMin: fence.topY,
            yMax: fence.topY
        }, world.tileSize, 'fence-top');

        this.createTileArea({
            xMin: fence.leftX,
            xMax: fence.leftX,
            yMin: fence.topY + 1,
            yMax: fence.bottomY - 1
        }, world.tileSize, 'fence-left');

        this.createTileArea({
            xMin: fence.rightX,
            xMax: fence.rightX,
            yMin: fence.topY + 1,
            yMax: fence.bottomY - 1
        }, world.tileSize, 'fence-right');

        this.createTileArea({
            xMin: fence.leftX,
            xMax: fence.bottomOpening[0] - 1,
            yMin: fence.bottomY,
            yMax: fence.bottomY
        }, world.tileSize, 'fence-bottom-left');

        this.createTileArea({
            xMin: fence.bottomOpening[1] + 1,
            xMax: fence.rightX,
            yMin: fence.bottomY,
            yMax: fence.bottomY
        }, world.tileSize, 'fence-bottom-right');
    }

    createAmbientCollisions(stageMap, visualRegistry) {
        visualRegistry
            .filter(({ id }) => id.startsWith('ambient:'))
            .forEach((record) => {
                const asset = stageMap.ambientAssets[record.sourceIndex];

                if (asset.collision === false) {
                    return;
                }

                this.createObjectCollisions(
                    record.key,
                    record.objects[0]
                );
            });
    }

    createEducationalCollisions(visualRegistry) {
        visualRegistry
            .filter(({ id }) => !id.startsWith('ambient:'))
            .flatMap(({ objects }) => objects)
            .forEach((object) => {
                this.createObjectCollisions(object.texture.key, object);
            });
    }

    createObjectCollisions(key, object) {
        const definition = this.definitions[key];

        if (
            !definition
            || definition.physics === 'none'
            || definition.collisionShapes.length === 0
        ) {
            return;
        }

        const zones = definition.collisionShapes.map((shape) => ({
            shape,
            zone: this.createStaticZone(0, 0, shape.width, shape.height, `${key}:${shape.role}`)
        }));
        this.objectZones.set(object, { definition, zones });
        this.syncObjectCollisions(object);
    }

    syncObjectCollisions(object) {
        const binding = this.objectZones.get(object);
        if (!binding) return;
        const { definition, zones } = binding;
        // Manifest sizes describe one frame, never the full spritesheet.
        const [sourceWidth, sourceHeight] = definition.size;
        const scaleX = Math.abs(object.scaleX);
        const scaleY = Math.abs(object.scaleY);
        const sourceLeft = object.x
            - (sourceWidth * object.originX * scaleX);
        const sourceTop = object.y
            - (sourceHeight * object.originY * scaleY);

        zones.forEach(({ shape, zone }) => {
            const width = shape.width * scaleX;
            const height = shape.height * scaleY;
            const shapeX = object.flipX ? sourceWidth - shape.x - shape.width : shape.x;
            const shapeY = object.flipY ? sourceHeight - shape.y - shape.height : shape.y;
            const x = sourceLeft + (shapeX * scaleX) + (width / 2);
            const y = sourceTop + (shapeY * scaleY) + (height / 2);
            zone.setPosition(x, y).setSize(width, height);
            // Refresh both bounds and the Arcade static spatial index.
            zone.body.updateFromGameObject();
        });
    }

    createTileArea({ xMin, xMax, yMin, yMax }, tileSize, name) {
        const width = (xMax - xMin + 1) * tileSize;
        const height = (yMax - yMin + 1) * tileSize;
        const x = (xMin * tileSize) + (width / 2);
        const y = (yMin * tileSize) + (height / 2);

        this.createStaticZone(x, y, width, height, name);
    }

    createStaticZone(x, y, width, height, name = '') {
        const zone = this.scene.add
            .zone(x, y, width, height)
            .setOrigin(0.5);

        zone.name = name;
        this.staticBodies.add(zone);

        return zone;
    }
}
