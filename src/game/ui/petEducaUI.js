import { Textures } from 'phaser';

// Coordenadas lógicas em 1280 × 720; imagens com origem no canto superior esquerdo.
export const PET_EDUCA_UI = {
    assetPath: 'pet-educa-ui/', // Relativo ao setPath('assets') do Preloader.
    images: {
        park: 'pet-educa-parque.png', dog: 'pet-educa-caramelo.png',
        panel: 'pet-educa-painel.png', button: 'pet-educa-botao-verde.png',
        card: 'pet-educa-cartao.png', food: 'pet-educa-icone-alimentacao.png',
        walk: 'pet-educa-icone-passeio.png', saci: 'pet-educa-icone-saci.png'
    },
    fonts: { heading: 'Lilita One', body: 'Nunito Sans' },
    colors: { cream: '#FFF1D2', brown: '#342B24' },
    title: { text: 'Pet Educa', x: 640, y: 48, size: 104 },
    dog: { x: 940, y: 364 },
    intro: {
        panel: { x: 128, y: 192 },
        body: { x: 164, width: 680, size: 30, lineSpacing: 0 },
        blocks: [
            { y: 222, text: 'Pet Educa é um jogo educativo\ndesenvolvido em colaboração entre o projeto\nFeevalePet, da Universidade Feevale,\ne a aluna Laíssa Dornelles Salles.' },
            { y: 382, text: 'Criado sem fins lucrativos, convida todos\na aprender sobre os animais brincando.' },
            { y: 462, text: 'Boa diversão!' }
        ],
        button: { x: 364, y: 516, width: 280, height: 96, text: 'Menu', size: 46 }
    },
    menu: {
        x: 156, width: 704, height: 128, iconX: 176, labelX: 300, size: 42,
        cards: [
            { y: 194, label: 'Jogo da Alimentação', icon: 'food', scene: 'FoodGame' },
            // WalkGame é o protótipo comentado; esta é a versão funcional atual.
            { y: 344, label: 'Passeio Consciente', icon: 'walk', scene: 'WalkGameLearning' },
            { y: 494, label: 'Quiz do Saci', icon: 'saci', scene: 'SaciGame' }
        ],
        unavailable: 'Indisponível'
    }
};

export const petEducaTexture = (name) => 'pet-educa-ui-' + name;
let fontLoading;

export function loadPetEducaFonts() {
    if (!fontLoading) {
        fontLoading = (async () => {
            if (!document.fonts) throw new Error('Este navegador não suporta fontes locais.');
            let timeout;
            const specs = ['400 104px "Lilita One"', '700 30px "Nunito Sans"'];
            try {
                const loaded = await Promise.race([
                    Promise.all(specs.map(spec => document.fonts.load(spec, 'Pet Educa Laíssa colaboração diversão'))),
                    new Promise((_, reject) => {
                        timeout = window.setTimeout(() => reject(new Error('Tempo esgotado ao carregar as fontes locais.')), 10000);
                    })
                ]);
                if (loaded.some(faces => !faces.length) || specs.some(spec => !document.fonts.check(spec))) {
                    throw new Error('As fontes Lilita One e Nunito Sans não foram carregadas.');
                }
            } finally {
                window.clearTimeout(timeout);
            }
        })().catch(error => {
            fontLoading = undefined;
            throw error;
        });
    }
    return fontLoading;
}

export function preloadPetEducaUI(scene) {
    for (const [name, file] of Object.entries(PET_EDUCA_UI.images)) {
        const key = petEducaTexture(name);
        if (!scene.textures.exists(key)) scene.load.image(key, PET_EDUCA_UI.assetPath + file);
    }
    // Começa junto com as imagens. A rejeição fica registrada para o create().
    return loadPetEducaFonts().then(() => ({ ready: true }), error => ({ error }));
}

// O Preloader continua visível até as fontes estarem prontas. Rotas de dev
// podem seguir diretamente para o passeio/editor, sem depender destas fontes.
export async function openPetEducaScene(scene, key, fonts, data) {
    let cancelled = false;
    const onShutdown = () => { cancelled = true; };
    scene.events.once('shutdown', onShutdown);
    try {
        const result = await fonts;
        if (cancelled) return;
        if (result.error) throw result.error;
        assertPetEducaTextures(scene);
        scene.scene.start(key, data);
    } catch (error) {
        if (!cancelled) showPetEducaError(scene, error);
    } finally {
        scene.events.off('shutdown', onShutdown);
    }
}

function assertPetEducaTextures(scene) {
    const missing = Object.keys(PET_EDUCA_UI.images).filter(name => !scene.textures.exists(petEducaTexture(name)));
    if (missing.length) throw new Error('Imagens ausentes: ' + missing.join(', '));
}

function showPetEducaError(scene, error) {
    console.error('Falha ao carregar a interface do Pet Educa:', error);
    scene.add.rectangle(640, 360, 1150, 280, 0x342b24);
    scene.add.text(640, 360, 'Não foi possível carregar as telas do Pet Educa.\n' + error.message + '\nRecarregue a página para tentar novamente.', {
        fontFamily: 'Arial', fontSize: 28, color: '#FFF1D2', align: 'center', wordWrap: { width: 1050 }
    }).setOrigin(0.5);
}

// Protege também entradas vindas dos minigames e reaberturas das cenas.
export async function createPetEducaScreen(scene, build) {
    let cancelled = false;
    const onShutdown = () => { cancelled = true; };
    scene.events.once('shutdown', onShutdown);
    try {
        await loadPetEducaFonts();
        if (cancelled) return;
        assertPetEducaTextures(scene);
        scene.uiNavigating = false;
        build();
    } catch (error) {
        if (!cancelled) showPetEducaError(scene, error);
    } finally {
        scene.events.off('shutdown', onShutdown);
    }
}

export function addPetEducaImage(scene, name, x, y) {
    const key = petEducaTexture(name);
    scene.textures.get(key).setFilter(Textures.FilterMode.NEAREST);
    return scene.add.image(x, y, key).setOrigin(0);
}

export function addPetEducaBackdrop(scene) {
    const { title, dog, fonts, colors } = PET_EDUCA_UI;
    addPetEducaImage(scene, 'park', 0, 0);
    addPetEducaImage(scene, 'dog', dog.x, dog.y);
    scene.add.text(title.x, title.y, title.text, {
        fontFamily: fonts.heading, fontSize: title.size, color: colors.cream,
        stroke: colors.brown, strokeThickness: 5,
        shadow: { offsetX: 4, offsetY: 6, color: colors.brown, blur: 0, fill: true, stroke: true }
    }).setOrigin(0.5, 0);
}

export function addPetEducaControl(scene, image, target) {
    const available = Boolean(target && scene.scene.manager.keys[target]);
    const activate = () => {
        if (!available || scene.uiNavigating) return;
        scene.uiNavigating = true;
        scene.scene.start(target);
    };
    // O retângulo padrão cobre o PNG inteiro, incluindo bordas transparentes.
    // Textos e ícones ficam sem input: não interceptam mouse ou toque.
    if (available) image.setInteractive({ useHandCursor: true }).on('pointerdown', activate);
    return { image, available, activate };
}

export function bindPetEducaKeyboard(scene, controls) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) return;
    const enabled = controls.filter(control => control.available);
    if (!enabled.length) return;
    let selected = 0;
    const focus = scene.add.graphics();
    const onKeyDown = (event) => {
        if (event.repeat || scene.uiNavigating) return;
        if (event.code === 'ArrowDown' || event.code === 'ArrowUp') {
            event.preventDefault();
            selected = (selected + (event.code === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length;
            const { x, y, width, height } = enabled[selected].image;
            focus.clear().lineStyle(3, 0x342b24).strokeRect(x - 4, y - 4, width + 8, height + 8);
        } else if (['Enter', 'NumpadEnter', 'Space'].includes(event.code)) {
            event.preventDefault();
            enabled[selected].activate();
        }
    };
    keyboard.on('keydown', onKeyDown);
    scene.events.once('shutdown', () => keyboard.off('keydown', onKeyDown));
}
