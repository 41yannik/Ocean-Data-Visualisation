// Expand-to-Focus der Dashboard-Kacheln (Explore, 2x2-Grid): der Expand-Button
// verschiebt die KACHEL-DOM-NODE in ein zentriertes Modal - kein Re-Mount, denn
// feste viewBox + width:100% rendern verlustfrei in jeder Größe und der Node-Move
// erhält alle D3-Listener, die laufende Store-Subscription, Brush-Zustand und
// Hover-Klassen. Ein Platzhalter mit gemessener Höhe hält den Grid-Slot (kein Reflow).
// Reine DOM-Chrome-Komponente wie exploreChrome - kein Store-Verkehr nötig.
export function createTileExpander(sectionEl, ctx) {
  let backdrop = null;
  let modal = null;
  let frame = null;
  let openTile = null;
  let placeholder = null;
  let returnBtn = null;

  function ensureModal() {
    if (modal) return;
    backdrop = document.createElement('div');
    backdrop.className = 'tile-modal-backdrop';
    backdrop.hidden = true;
    modal = document.createElement('div');
    modal.className = 'tile-modal';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    frame = document.createElement('div');
    frame.className = 'tile-modal-frame';
    frame.innerHTML = '<button type="button" class="tile-modal-close" aria-label="Close expanded view">×</button>';
    modal.appendChild(frame);
    document.body.append(backdrop, modal);

    frame.querySelector('.tile-modal-close').addEventListener('click', close);
    backdrop.addEventListener('click', close);
    // Klick neben den Frame (das Modal füllt den Viewport) schließt ebenfalls
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  }

  function open(tile, btn) {
    ensureModal();
    placeholder = document.createElement('div');
    placeholder.className = 'tile tile--placeholder';
    placeholder.style.height = `${tile.offsetHeight}px`;
    tile.before(placeholder);

    frame.appendChild(tile);
    tile.classList.add('tile--expanded');
    btn.setAttribute('aria-expanded', 'true');
    openTile = tile;
    returnBtn = btn;

    backdrop.hidden = false;
    modal.hidden = false;
    requestAnimationFrame(() => {
      backdrop.classList.add('show');
      modal.classList.add('show');
    });
    document.body.style.overflow = 'hidden';
    frame.querySelector('.tile-modal-close').focus();
  }

  function close() {
    if (!openTile) return;
    openTile.classList.remove('tile--expanded');
    placeholder.replaceWith(openTile);
    returnBtn.setAttribute('aria-expanded', 'false');
    returnBtn.focus();
    openTile = null;
    placeholder = null;

    backdrop.classList.remove('show');
    modal.classList.remove('show');
    backdrop.hidden = true;
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  const buttons = [...sectionEl.querySelectorAll('.tile-expand')];
  for (const btn of buttons) {
    btn.addEventListener('click', () => open(btn.closest('.tile'), btn));
  }
  // Koexistiert mit Sidebar-/DetailPanel-Escape: no-op, solange kein Modal offen ist.
  const onEsc = (e) => { if (e.key === 'Escape' && openTile) close(); };
  document.addEventListener('keydown', onEsc);

  return {
    update() {}, // reines DOM-Chrome
    destroy() {
      document.removeEventListener('keydown', onEsc);
      close();
      backdrop?.remove();
      modal?.remove();
    },
  };
}
