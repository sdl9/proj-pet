// Scenes combine device directions before passing them to a player.
export function readKeyboardDirection(cursors, keys) {
    return {
        x: Number(cursors.right.isDown || keys.direita.isDown)
            - Number(cursors.left.isDown || keys.esquerda.isDown),
        y: Number(cursors.down.isDown || keys.baixo.isDown)
            - Number(cursors.up.isDown || keys.cima.isDown)
    };
}

export function combineDirections(...sources) {
    return {
        x: Math.max(-1, Math.min(1, sources.reduce((sum, source) => sum + source.x, 0))),
        y: Math.max(-1, Math.min(1, sources.reduce((sum, source) => sum + source.y, 0)))
    };
}
