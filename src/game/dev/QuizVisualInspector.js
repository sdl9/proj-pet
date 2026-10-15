import { QUIZ_SACI_MANIFEST } from '../data/quizSaciAssets';

// Chamado somente com import.meta.env.DEV. Não escolhe ou valida uma resposta.
export function addQuizVisualInspector(scene, ui) {
    const inspector = document.createElement('details');
    inspector.id = 'quiz-visual-inspector';
    inspector.style.cssText = 'position:fixed;bottom:4px;left:8px;z-index:10;max-width:calc(100vw - 32px);padding:4px 8px;background:#fff1d2;color:#342b24;border:2px solid #342b24;border-radius:4px;font:14px "Nunito Sans",sans-serif;';
    const summary = document.createElement('summary');
    summary.textContent = 'Estados visuais (dev)';
    inspector.append(summary);
    const controls = document.createElement('div');
    controls.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding-top:8px;';
    const addSelect = (labelText, options) => {
        const label = document.createElement('label');
        label.textContent = labelText + ' ';
        const select = document.createElement('select');
        select.setAttribute('aria-label', labelText);
        options.forEach(([value, text]) => select.add(new Option(text, value)));
        label.append(select);
        controls.append(label);
        return select;
    };
    const target = addSelect('Alternativa', [['all', 'Todas'], ['0', 'A'], ['1', 'B'], ['2', 'C']]);
    const labels = ['Normal', 'Hover / foco', 'Pressionado / selecionado', 'Correto (manual)', 'Incorreto (manual)', 'Desabilitado'];
    const state = addSelect('Estado', QUIZ_SACI_MANIFEST.states.map((value, index) => [value, labels[index]]));
    const apply = () => ui.answers.forEach((answer, index) => {
        if (target.value === 'all' || Number(target.value) === index) answer.setState(state.value);
    });
    state.addEventListener('change', apply);
    target.addEventListener('change', apply);
    const menu = document.createElement('button');
    menu.textContent = 'Menu';
    menu.addEventListener('click', () => scene.scene.start('MainMenu'));
    controls.append(menu);
    inspector.append(controls);
    document.body.append(inspector);
    scene.events.once('shutdown', () => inspector.remove());
}
