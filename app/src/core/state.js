// Pub/Sub-Store — einziger Kommunikationskanal aller Komponenten (docs/plan/09 §2).
// Nur main.js/Harness subscriben; Komponenten erhalten update(state, patch) vom Kompositor
// und senden ausschließlich bus.set(patch).
//
// Konventionen:
// - Shallow-Merge; Object.is-Guard je Key → No-Op-Patches lösen kein Notify aus.
// - Sets/Objekte (selectedEventIds, hover, filters) IMMER ersetzen, nie mutieren,
//   sonst greift der Guard falsch und Layer sehen keine Änderung.

export function createStore(initial) {
  let state = { ...initial };
  const listeners = new Set();

  return {
    get: () => state,

    set(patch) {
      const changed = {};
      let any = false;
      for (const [key, value] of Object.entries(patch)) {
        if (!Object.is(state[key], value)) {
          changed[key] = value;
          any = true;
        }
      }
      if (!any) return;
      state = { ...state, ...changed };
      for (const fn of listeners) fn(state, changed);
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
