import { Scene } from 'phaser';
import walkStage18Map from '../data/walkStage18Map.json';
import { WalkVisualBuilder } from '../systems/WalkVisualBuilder';
import { WalkLayoutDraft } from './WalkLayoutDraft';

const PANEL_WIDTH = 300;

export class WalkLayoutEditor extends Scene {
    constructor() {
        super('WalkLayoutEditor');
    }

    create() {
        if (!import.meta.env.DEV) {
            this.scene.start('Intro');
            return;
        }
        const layout = this.cache.json.get('walk-prototype-layout');
        this.stage = new WalkVisualBuilder(this).build(walkStage18Map, layout, { includeRegistry: true });
        this.draft = new WalkLayoutDraft(this.stage.visualRegistry, layout.world);
        this.selected = null;
        this.drag = null;
        this.outline = this.add.graphics().setDepth(100000);
        this.createPanel();
        this.fitEditor();
        this.bindMouse();
        this.scale.on('resize', this.fitEditor, this);
        this.events.once('shutdown', this.cleanup, this);
    }

    createPanel() {
        const panel = document.createElement('aside');
        panel.setAttribute('aria-label', 'Editor provisório de layout');
        panel.style.cssText = 'position:fixed;z-index:1000;box-sizing:border-box;padding:18px;background:#14232e;color:#edf4f8;font:14px/1.45 Arial,sans-serif;overflow:auto;border-left:1px solid #527184;text-align:left;';
        const heading = document.createElement('h2');
        heading.textContent = 'Walk Layout Editor · Fase A';
        heading.style.cssText = 'margin:0 0 12px;font-size:18px;';
        const instructions = document.createElement('p');
        instructions.textContent = 'Clique para selecionar e arraste com o mouse. Snap de 16 px; segure Shift para mover livremente. Terreno e caminhos não são selecionáveis.';
        this.selectionInfo = document.createElement('pre');
        this.selectionInfo.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.6 monospace;padding:12px;background:#0a1720;border-radius:6px;';
        this.selectionInfo.setAttribute('aria-live', 'polite');
        const download = document.createElement('button');
        download.textContent = 'Baixar layout provisório';
        download.type = 'button';
        download.style.cssText = 'width:100%;padding:12px 8px;background:#91edc4;color:#102720;border:0;border-radius:6px;font-weight:bold;cursor:pointer;';
        download.addEventListener('click', () => this.downloadDraft());
        this.status = document.createElement('p');
        this.status.textContent = 'Alterações só em memória. Recarregar descarta o rascunho. Os JSONs oficiais não são gravados.';
        panel.append(heading, instructions, this.selectionInfo, download, this.status);
        document.body.append(panel);
        this.panel = panel;
        this.refreshSelection();
    }

    fitEditor() {
        const width = this.scale.width - PANEL_WIDTH;
        this.cameras.main
            .setViewport(0, 0, width, this.scale.height)
            .setBounds(0, 0, this.stage.width, this.stage.height)
            .setZoom(Math.min(width / this.stage.width, this.scale.height / this.stage.height))
            .centerOn(this.stage.width / 2, this.stage.height / 2);
        const rect = this.game.canvas.getBoundingClientRect();
        const ratio = rect.width / this.scale.width;
        Object.assign(this.panel.style, {
            left: `${rect.left + width * ratio}px`,
            top: `${rect.top}px`,
            width: `${PANEL_WIDTH * ratio}px`,
            height: `${rect.height}px`
        });
        this.refreshSelection();
    }

    // CSS display size, Phaser canvas coordinates, then camera-to-world conversion.
    eventPoint(event) {
        const rect = this.game.canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * this.scale.width / rect.width;
        const y = (event.clientY - rect.top) * this.scale.height / rect.height;
        return this.cameras.main.getWorldPoint(x, y);
    }

    pick(point) {
        const candidates = this.draft.records.flatMap((record) => record.members.map((member) => ({ record, member })));
        candidates.sort((a, b) => b.member.object.depth - a.member.object.depth ||
            this.children.getIndex(b.member.object) - this.children.getIndex(a.member.object));
        return candidates.find(({ member: { object } }) => {
            const local = object.getWorldTransformMatrix().applyInverse(point.x, point.y);
            const x = local.x + object.displayOriginX;
            const y = local.y + object.displayOriginY;
            return object.visible && x >= 0 && y >= 0 && x < object.width && y < object.height &&
                this.textures.getPixelAlpha(Math.floor(x), Math.floor(y), object.texture.key, object.frame.name) > 0;
        });
    }

    bindMouse() {
        const canvas = this.game.canvas;
        this.onDown = (event) => {
            if (event.pointerType !== 'mouse' || event.button !== 0) return;
            const point = this.eventPoint(event);
            const hit = this.pick(point);
            this.selected = hit ?? null;
            this.refreshSelection();
            if (!hit) return;
            this.drag = {
                pointerId: event.pointerId,
                clientX: event.clientX, clientY: event.clientY,
                start: point,
                anchor: { ...hit.record.currentPosition },
                started: false
            };
            canvas.setPointerCapture(event.pointerId);
            event.preventDefault();
        };
        this.onMove = (event) => {
            if (event.pointerType !== 'mouse' || !this.drag || event.pointerId !== this.drag.pointerId) return;
            if (!this.drag.started && Math.hypot(event.clientX - this.drag.clientX, event.clientY - this.drag.clientY) < 3) return;
            this.drag.started = true;
            const point = this.eventPoint(event);
            this.draft.move(this.selected.record,
                this.drag.anchor.x + point.x - this.drag.start.x,
                this.drag.anchor.y + point.y - this.drag.start.y,
                !event.shiftKey);
            this.refreshSelection(event.shiftKey);
        };
        this.onUp = (event) => {
            if (!this.drag || event.pointerId !== this.drag.pointerId) return;
            this.drag = null;
            if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
        };
        canvas.addEventListener('pointerdown', this.onDown);
        canvas.addEventListener('pointermove', this.onMove);
        canvas.addEventListener('pointerup', this.onUp);
        canvas.addEventListener('pointercancel', this.onUp);
        canvas.addEventListener('lostpointercapture', this.onUp);
        this.onWindowResize = () => this.fitEditor();
        window.addEventListener('resize', this.onWindowResize);
        window.addEventListener('scroll', this.onWindowResize);
    }

    refreshSelection(free = false) {
        this.outline.clear();
        if (!this.selected) {
            this.selectionInfo.textContent = 'Nenhum elemento selecionado.\nMundo: 1600 × 896\nSnap: 16 px';
            return;
        }
        const { record, member } = this.selected;
        const number = (n) => Number(n.toFixed(2));
        const bounds = record.members.map(({ object }) => object.getBounds());
        const left = Math.min(...bounds.map((b) => b.x));
        const top = Math.min(...bounds.map((b) => b.y));
        const right = Math.max(...bounds.map((b) => b.right));
        const bottom = Math.max(...bounds.map((b) => b.bottom));
        this.outline.lineStyle(2 / this.cameras.main.zoom, 0xffe16b, 1)
            .strokeRect(left - 2, top - 2, right - left + 4, bottom - top + 4);
        this.selectionInfo.textContent = [
            '● SELECIONADO',
            `ID: ${record.id}`,
            `Parte: ${member.id}`,
            `Key: ${member.key}`,
            `Grupo: ${record.group ?? 'ambiental / independente'}`,
            `x: ${number(member.object.x)}  y: ${number(member.object.y)}`,
            `Âncora: ${number(record.currentPosition.x)}, ${number(record.currentPosition.y)}`,
            `Inicial: ${record.initialPosition.x}, ${record.initialPosition.y}`,
            `Snap: ${free ? 'livre (Shift)' : '16 px'}`,
            '',
            `Unidade de arraste: ${record.members.length} parte(s)`,
            ...record.members.map((part) => `${part.key}\n  Δ ${number(part.offset.x)}, ${number(part.offset.y)}`)
        ].join('\n');
    }

    downloadDraft() {
        const blob = new Blob([JSON.stringify(this.draft.exportDraft(), null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'walk-layout-draft.json';
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.status.textContent = 'Download solicitado: walk-layout-draft.json. Os JSONs oficiais continuam intactos.';
    }

    cleanup() {
        const canvas = this.game.canvas;
        canvas.removeEventListener('pointerdown', this.onDown);
        canvas.removeEventListener('pointermove', this.onMove);
        canvas.removeEventListener('pointerup', this.onUp);
        canvas.removeEventListener('pointercancel', this.onUp);
        canvas.removeEventListener('lostpointercapture', this.onUp);
        window.removeEventListener('resize', this.onWindowResize);
        window.removeEventListener('scroll', this.onWindowResize);
        this.scale.off('resize', this.fitEditor, this);
        if (this.drag && canvas.hasPointerCapture(this.drag.pointerId)) canvas.releasePointerCapture(this.drag.pointerId);
        this.drag = null;
        this.panel.remove();
    }
}
