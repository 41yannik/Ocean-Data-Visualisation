import { THEME_PALETTES, applyCssVars } from './config.js';

export const DEFAULT_THEME = 'light';
export const THEME_STORAGE_KEY = 'track-to-toll-theme';
export const THEME_CHANGE_EVENT = 'track-to-toll:themechange';
export const THEME_NAMES = Object.freeze(Object.keys(THEME_PALETTES));

export function isThemeName(value) {
  return typeof value === 'string' && Object.hasOwn(THEME_PALETTES, value);
}

function browserStorage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function getInitialTheme(storage = browserStorage()) {
  try {
    const stored = storage?.getItem(THEME_STORAGE_KEY);
    return isThemeName(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function getActiveTheme(root = document.documentElement) {
  return isThemeName(root?.dataset?.theme) ? root.dataset.theme : DEFAULT_THEME;
}

export function getActivePalette(root = document.documentElement) {
  return THEME_PALETTES[getActiveTheme(root)];
}

export function applyTheme(theme, {
  persist = true,
  dispatch = true,
  root = document.documentElement,
  storage = browserStorage(),
  eventTarget = typeof window === 'undefined' ? null : window,
} = {}) {
  const nextTheme = isThemeName(theme) ? theme : DEFAULT_THEME;
  const previousTheme = getActiveTheme(root);
  const palette = applyCssVars(nextTheme, root);
  root.dataset.theme = nextTheme;
  root.style.colorScheme = nextTheme === 'ocean' ? 'dark' : 'light';

  if (persist) {
    try {
      storage?.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Privacy-Modi können localStorage blockieren; der aktive Modus bleibt nutzbar.
    }
  }

  if (dispatch && eventTarget?.dispatchEvent && previousTheme !== nextTheme) {
    const EventConstructor = eventTarget.CustomEvent ?? globalThis.CustomEvent;
    const event = EventConstructor
      ? new EventConstructor(THEME_CHANGE_EVENT, { detail: { theme: nextTheme, palette } })
      : { type: THEME_CHANGE_EVENT, detail: { theme: nextTheme, palette } };
    eventTarget.dispatchEvent(event);
  }
  return nextTheme;
}

export function onThemeChange(handler, eventTarget = typeof window === 'undefined' ? null : window) {
  if (!eventTarget?.addEventListener) return () => {};
  eventTarget.addEventListener(THEME_CHANGE_EVENT, handler);
  return () => eventTarget.removeEventListener(THEME_CHANGE_EVENT, handler);
}
