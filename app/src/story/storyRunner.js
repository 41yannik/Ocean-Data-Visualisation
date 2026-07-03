// Story-Runner: rendert die Steps als Textkarten in den Scroll-Container, verdrahtet
// Scrollama (IntersectionObserver, natives Scrollen bleibt erhalten) und wendet je
// Step dessen apply()-Patch an. Zusätzliche Wege (E3-Robustheit): Pfeiltasten/PageUp/
// PageDown und externe step-Patches (Progress-Nav, Deep-Link) — dann wird der Step
// sofort angewandt und die passende Karte herangescrollt.
//
// Gate-Besitz: beim Start sperrt der Runner die Exploration (exploreUnlocked: false);
// Schritt 7 schaltet über sein apply() frei, Rückwärts-Scrollen sperrt wieder (base()).
import scrollama from 'scrollama';
import { buildSteps } from './steps.js';

export function createStoryRunner(container, ctx, opts = {}) {
  const bus = ctx.bus;
  const steps = buildSteps(ctx);

  // Papier-Bänder + Viz-Fenster (Layout-Revision 2026-07-03): je Step ein solides
  // Textband ÜBER seinem transparenten Fenster; Scroll-Trigger ist das FENSTER —
  // der Step ist aktiv, wenn die Viz frei sichtbar in der Bildschirmmitte steht.
  container.innerHTML = steps.map((s, i) => `
    <section class="step-band" data-step="${i}" data-step-id="${s.id}">
      <div class="step-text">
        <p class="kicker">Step ${i + 1} of ${steps.length}</p>
        <h2>${s.title}</h2>
        <p>${s.html}</p>
        ${s.source ? `<p class="source">${s.source}</p>` : ''}
      </div>
    </section>
    <div class="step-window" data-step="${i}" aria-hidden="true"></div>`).join('');
  const sections = [...container.querySelectorAll('.step-window')];

  let internalStep = null;       // zuletzt von UNS angewandter Step (Loop-Guard)
  let programmaticTarget = null; // Ziel eines programmatischen Scrolls (Zwischensteps ignorieren)
  let programmaticTimer = null;

  function applyStep(i) {
    internalStep = i;
    bus.set({ step: i, ...steps[i].apply() });
  }

  const scroller = scrollama();
  scroller
    .setup({ step: sections, offset: 0.55 })
    .onStepEnter(({ index }) => {
      if (programmaticTarget != null) {
        if (index !== programmaticTarget) return; // Durchflug beim smooth-scroll
        programmaticTarget = null;
        clearTimeout(programmaticTimer);
        return; // Ziel-Step wurde beim externen Patch bereits angewandt
      }
      applyStep(index);
    });

  function scrollToStep(i, instant) {
    if (!sections[i]) return;
    programmaticTarget = i;
    clearTimeout(programmaticTimer);
    // Fallback: falls onStepEnter nicht feuert (Karte schon im Viewport)
    programmaticTimer = setTimeout(() => { programmaticTarget = null; }, 1800);
    sections[i].scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'center' });
  }

  const onResize = () => scroller.resize();
  window.addEventListener('resize', onResize);

  // Pfeiltasten/PageDown = Schritt vor/zurück (nur solange die Story aktiv ist)
  const onKey = (event) => {
    const state = bus.get();
    if (state.step < 0) return;
    if (event.target.closest('input, select, textarea')) return;
    let target = null;
    if (event.key === 'ArrowDown' || event.key === 'PageDown') {
      target = Math.min(steps.length - 1, state.step + 1);
    } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      target = Math.max(0, state.step - 1);
    }
    if (target == null || target === state.step) return;
    event.preventDefault();
    bus.set({ step: target }); // Anwenden + Scrollen übernimmt update()
  };
  window.addEventListener('keydown', onKey);

  // Startzustand: Story sperrt die Exploration; Deep-Link ?step=N springt direkt.
  const initialStep = Number.isInteger(opts.initialStep)
    ? Math.max(0, Math.min(steps.length - 1, opts.initialStep))
    : 0;
  applyStep(initialStep);
  if (initialStep > 0) {
    requestAnimationFrame(() => scrollToStep(initialStep, true));
  }

  return {
    update(state, patch) {
      if (!patch || !('step' in patch)) return;
      if (state.step < 0 || state.step === internalStep) return;
      // Externer step-Patch (Progress-Nav, Tastatur, Konsole): sofort anwenden + hinscrollen
      applyStep(state.step);
      scrollToStep(state.step, state.reducedMotion);
    },
    destroy() {
      scroller.destroy();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
      clearTimeout(programmaticTimer);
      container.innerHTML = '';
    },
  };
}
