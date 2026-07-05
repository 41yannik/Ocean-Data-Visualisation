// Workbench-Chrome der Explore-Sektion (Step 8) - reine DOM-Interaktion, keine Viz-Logik.
// Drei Controller in einer Datei:
//   • View-Toggle   → setzt data-view-mode auf der .viz-row (CSS regelt 80/20 · 50/50 · 20/80;
//                     die Vizzes haben feste viewBox → skalieren ohne Redraw).
//   • Sidebar       → Off-Canvas-Filter links (FAB öffnet; Close/Backdrop/Escape schließt).
//   • Selection-Chip  → zeigt „N storms selected" bei aktiver Brush-Auswahl; „clear" löscht sie.
// (Die Floating-Legende entfiel: die Legende ist eine statische Zeile UNTER den Charts.)
// Nur der Chip liest den Store (selectedEventIds); alles andere ist rein lokal.
export function createExploreChrome(sectionEl, ctx) {
  const { bus } = ctx;
  const row = sectionEl.querySelector('.viz-row');
  const stage = sectionEl.querySelector('.viz-stage');
  const toggleBtns = [...sectionEl.querySelectorAll('.view-toggle button')];
  const fab = sectionEl.querySelector('.filter-fab');
  const sidebar = sectionEl.querySelector('.explore-sidebar');
  const backdrop = sectionEl.querySelector('.sidebar-backdrop');
  const chip = sectionEl.querySelector('.selection-chip');
  const chipN = chip.querySelector('.sc-count');

  // --- View-Toggle (reines CSS via data-view-mode) ---
  const setMode = (m) => {
    row.dataset.viewMode = m;
    toggleBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setMode === m)));
  };
  toggleBtns.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.setMode)));

  // --- Off-Canvas-Sidebar ---
  const openSidebar = (open) => {
    sidebar.dataset.open = String(open);
    sidebar.setAttribute('aria-hidden', String(!open));
    fab.setAttribute('aria-expanded', String(open));
    backdrop.hidden = !open;
    requestAnimationFrame(() => backdrop.classList.toggle('show', open));
  };
  fab.addEventListener('click', () => openSidebar(true));
  sidebar.querySelector('.sb-close').addEventListener('click', () => openSidebar(false));
  backdrop.addEventListener('click', () => openSidebar(false));
  const onEsc = (e) => { if (e.key === 'Escape') openSidebar(false); };
  document.addEventListener('keydown', onEsc);

  // --- Selection-Chip ---
  chip.querySelector('.sc-clear').addEventListener('click', () => bus.set({ selectedEventIds: null }));

  setMode('split');

  return {
    update(state, patch) {
      if (patch && !('selectedEventIds' in patch)) return;
      const ids = state.selectedEventIds;
      if (ids && ids.size) {
        chipN.textContent = `${ids.size} storm${ids.size > 1 ? 's' : ''} selected`;
        chip.hidden = false;
        stage.classList.add('has-selection');
      } else {
        chip.hidden = true;
        stage.classList.remove('has-selection');
      }
    },
    destroy() { document.removeEventListener('keydown', onEsc); },
  };
}
