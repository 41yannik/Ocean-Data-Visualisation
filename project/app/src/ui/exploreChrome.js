// Workbench-Chrome der Explore-Sektion (Step 8) - reine DOM-Interaktion, keine Viz-Logik.
// Zwei Controller in einer Datei:
//   • Sidebar       → Off-Canvas-Filter links (FAB öffnet; Close/Backdrop/Escape schließt).
//   • Selection-Chip  → zeigt „N storms selected" bei aktiver Brush-Auswahl; „clear" löscht sie.
// (Der View-Toggle entfiel mit dem 2x2-Grid-Umbau: Hero-Map ist immer vollbreit,
// der Scatter lebt als Kachel im Grid - Vergrößern übernimmt der tileExpander.)
// Nur der Chip liest den Store (selectedEventIds); alles andere ist rein lokal.
export function createExploreChrome(sectionEl, ctx) {
  const { bus } = ctx;
  const stage = sectionEl.querySelector('.viz-stage');
  const fab = sectionEl.querySelector('.filter-fab');
  const sidebar = sectionEl.querySelector('.explore-sidebar');
  const backdrop = sectionEl.querySelector('.sidebar-backdrop');
  const chip = sectionEl.querySelector('.selection-chip');
  const chipN = chip.querySelector('.sc-count');

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

  // Der FAB ist fixed und würde nach dem Lazy-Mount sonst über frühere Story-Sektionen
  // schweben. Nur zeigen, solange die Explore-Sektion den Viewport tatsächlich schneidet.
  fab.hidden = true;
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    fab.hidden = !entry.isIntersecting;
    if (!entry.isIntersecting) openSidebar(false);
  }, { threshold: 0.05 });
  visibilityObserver.observe(sectionEl);

  // --- Selection-Chip ---
  chip.querySelector('.sc-clear').addEventListener('click', () => bus.set({ selectedEventIds: null }));

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
    destroy() {
      visibilityObserver.disconnect();
      document.removeEventListener('keydown', onEsc);
    },
  };
}
