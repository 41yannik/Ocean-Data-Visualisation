import {
  applyTheme,
  getActiveTheme,
  onThemeChange,
} from '../core/theme.js';

const OPTIONS = [
  { theme: 'light', label: 'Light' },
  { theme: 'ocean', label: 'Ocean' },
];

export function createThemeToggle(container = document.body) {
  const control = document.createElement('div');
  control.className = 'theme-toggle';
  control.setAttribute('role', 'group');
  control.setAttribute('aria-label', 'Color theme');
  control.innerHTML = OPTIONS.map(({ theme, label }) => `
    <button type="button" data-theme-choice="${theme}" aria-pressed="false">
      <span class="theme-toggle__mark" aria-hidden="true"></span>
      <span>${label}</span>
    </button>`).join('');

  const buttons = [...control.querySelectorAll('button')];
  const render = (theme) => {
    for (const button of buttons) {
      const active = button.dataset.themeChoice === theme;
      button.setAttribute('aria-pressed', String(active));
      button.tabIndex = active ? 0 : -1;
    }
  };

  for (const [index, button] of buttons.entries()) {
    button.addEventListener('click', () => applyTheme(button.dataset.themeChoice));
    button.addEventListener('keydown', (event) => {
      let targetIndex = null;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') targetIndex = (index - 1 + buttons.length) % buttons.length;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') targetIndex = (index + 1) % buttons.length;
      if (event.key === 'Home') targetIndex = 0;
      if (event.key === 'End') targetIndex = buttons.length - 1;
      if (targetIndex == null) return;
      event.preventDefault();
      const target = buttons[targetIndex];
      applyTheme(target.dataset.themeChoice);
      target.focus();
    });
  }

  const unsubscribe = onThemeChange((event) => render(event.detail.theme));
  render(getActiveTheme());
  container.appendChild(control);

  return {
    update: render,
    destroy() {
      unsubscribe();
      control.remove();
    },
  };
}
