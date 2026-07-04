// Workbench-Chrome der Explore-Sektion (Step 8) - reine DOM-Interaktion, keine Viz-Logik.
// Vier Controller in einer Datei:
//   • View-Toggle   → setzt data-view-mode auf der .viz-row (CSS regelt 80/20 · 50/50 · 20/80;
//                     die Vizzes haben feste viewBox → skalieren ohne Redraw).
//   • Sidebar       → Off-Canvas-Filter links (FAB öffnet; Close/Backdrop/Escape schließt).
//   • Floating Legend → einklappbar + per Drag (Pointer-Events) verschiebbar.
//   • Selection-Chip  → zeigt „N storms selected" bei aktiver Brush-Auswahl; „clear" löscht sie.
// Nur der Chip liest den Store (selectedEventIds); alles andere ist rein lokal.
export function createExploreChrome(sectionEl, ctx) {
  const { bus } = ctx;
  const row = sectionEl.querySelector('.viz-row');
  const stage = sectionEl.querySelector('.viz-stage');
  const toggleBtns = [...sectionEl.querySelectorAll('.view-toggle button')];
  const fab = sectionEl.querySelector('.filter-fab');
  const sidebar = sectionEl.querySelector('.explore-sidebar');
  const backdrop = sectionEl.querySelector('.sidebar-backdrop');
  const legendEl = sectionEl.querySelector('.floating-legend');
  const head = legendEl.querySelector('.fl-head');
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

  // --- Floating Legend: einklappen + draggen ---
  legendEl.querySelector('.fl-toggle').addEventListener('click', () => {
    legendEl.dataset.collapsed = String(legendEl.dataset.collapsed !== 'true');
  });
  let drag = null;
  head.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.fl-toggle')) return;
    const r = legendEl.getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, s };
    legendEl.style.right = 'auto'; // von right/bottom auf left/top umstellen
    legendEl.style.bottom = 'auto';
    head.setPointerCapture(e.pointerId);
  });
  head.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const left = Math.max(0, Math.min(e.clientX - drag.s.left - drag.dx, drag.s.width - legendEl.offsetWidth));
    const top = Math.max(0, Math.min(e.clientY - drag.s.top - drag.dy, drag.s.height - legendEl.offsetHeight));
    legendEl.style.left = `${left}px`;
    legendEl.style.top = `${top}px`;
  });
  const endDrag = () => { drag = null; };
  head.addEventListener('pointerup', endDrag);
  head.addEventListener('pointercancel', endDrag);

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
