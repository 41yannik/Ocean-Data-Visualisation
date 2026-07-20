// Global fullscreen toggle: a single pill button (bottom left) that enters and
// leaves browser fullscreen. Label follows `fullscreenchange` so it stays
// correct when the user exits via Esc. Not rendered where the Fullscreen API
// is unavailable (e.g. iPhone Safari).
export function createFullscreenToggle(container = document.body) {
  if (!document.fullscreenEnabled) return null;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'fullscreen-toggle';

  const render = () => {
    const active = Boolean(document.fullscreenElement);
    button.setAttribute('aria-pressed', String(active));
    button.innerHTML = `
      <span class="fullscreen-toggle__mark" aria-hidden="true"></span>
      <span>${active ? 'Exit full screen' : 'Full screen'}</span>`;
  };

  button.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  });

  document.addEventListener('fullscreenchange', render);
  render();
  container.appendChild(button);

  return {
    destroy() {
      document.removeEventListener('fullscreenchange', render);
      button.remove();
    },
  };
}
