// Bühnen-Gruppe (Paket 10 Task 7): mehrere Story-Sektionen teilen sich EINE sticky
// D3-Instanz. Scrollama wendet beim Kartenwechsel steps[i].apply() auf den GEMEINSAMEN
// (gesperrten) Store an - die Layer faden/morphen dann per Klassen-/Positions-Transition,
// statt dass eine zweite eingefrorene Instanz hart schneidet. Reduced Motion: Zustände
// springen (CSS deaktiviert die Transitions), Sticky-Layout bleibt.
import scrollama from 'scrollama';
import { createStore } from '../core/state.js';
import { makeInitialState } from '../core/initialState.js';

export function createStageGroup(groupEl, { ctx, steps, members, buildComponents }) {
  const first = members[0].sec;
  const store = createStore({ ...makeInitialState(), ...steps[first.step].apply() });
  const groupCtx = { ...ctx, bus: store };

  const components = buildComponents(groupEl, groupCtx);
  store.subscribe((state, patch) => { for (const c of components) c.update(state, patch); });
  const state = store.get();
  for (const c of components) c.update(state, undefined);

  // Scrollama auf den Textkarten: Kartenwechsel = Step-Patch auf den gemeinsamen Store.
  const scroller = scrollama();
  scroller
    .setup({ step: members.map((m) => m.textEl), offset: 0.55 })
    .onStepEnter(({ index }) => {
      groupEl.dataset.activeStep = String(members[index].sec.step);
      store.set(steps[members[index].sec.step].apply());
    });
  const onResize = () => scroller.resize();
  window.addEventListener('resize', onResize);

  return {
    store, // für Text-Link-Verdrahtung in main.js
    destroy() {
      scroller.destroy();
      window.removeEventListener('resize', onResize);
      for (const c of components) c.destroy?.();
    },
  };
}
