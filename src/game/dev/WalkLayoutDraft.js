// Temporary Phase A state. No source JSON is mutated or written.
export class WalkLayoutDraft {
    constructor(registry, world) {
        this.world = { ...world };
        this.records = registry.map((entry) => ({
            id: entry.id,
            key: entry.key,
            group: entry.group,
            sourceIndex: entry.sourceIndex,
            renderMode: entry.renderMode,
            initialPosition: { ...entry.anchor },
            currentPosition: { ...entry.anchor },
            members: entry.objects.map((object, index) => ({
                id: `${entry.id}/part:${index}`,
                key: object.texture.key,
                object,
                initialPosition: { x: object.x, y: object.y },
                offset: { x: object.x - entry.anchor.x, y: object.y - entry.anchor.y },
                depthOffset: object.depth - entry.anchor.y,
                scale: { x: object.scaleX, y: object.scaleY },
                origin: { x: object.originX, y: object.originY }
            }))
        }));
    }

    move(record, x, y, snap = true) {
        const quantize = (value) => snap ? Math.round(value / 16) * 16 : value;
        record.currentPosition = {
            x: Math.max(0, Math.min(this.world.width, quantize(x))),
            y: Math.max(0, Math.min(this.world.height, quantize(y)))
        };
        for (const member of record.members) {
            member.object.setPosition(
                record.currentPosition.x + member.offset.x,
                record.currentPosition.y + member.offset.y
            );
            member.object.setDepth(record.currentPosition.y + member.depthOffset);
        }
    }

    exportDraft() {
        const serialize = (record) => ({
            id: record.id,
            key: record.key,
            group: record.group,
            sourceIndex: record.sourceIndex,
            renderMode: record.renderMode,
            x: record.currentPosition.x,
            y: record.currentPosition.y,
            anchor: { ...record.currentPosition },
            initialPosition: { ...record.initialPosition },
            currentPosition: { ...record.currentPosition },
            members: record.members.map(({ object, ...member }) => ({
                ...member,
                currentPosition: { x: object.x, y: object.y }
            }))
        });
        return {
            format: 'walk-layout-draft',
            version: 1,
            date: new Date().toISOString(),
            world: { ...this.world },
            tileSize: this.world.tileSize,
            sources: {
                ambient: 'src/game/data/walkStage18Map.json',
                placements: 'public/assets/walk/walk-prototype-layout.json',
                idPolicy: 'Source array slot + part index; stable while official source order is unchanged.'
            },
            ambientAssets: this.records.filter((record) => record.sourceIndex !== undefined).map(serialize),
            compositions: this.records.filter((record) => record.group !== null).map(serialize),
            standalone: this.records.filter((record) => record.group === null && record.sourceIndex === undefined).map(serialize)
        };
    }
}
