// Zentrale Konstanten - einzige Quelle für Farben/Dauern/Maße.
// styles.css spiegelt beide Paletten als FOUC-Fallback; zur Laufzeit setzt
// applyCssVars() die aktive Palette auf :root.

// Finale Palette „Pazifik hell" (Paket 07, Nutzer-Entscheidung 2026-07-03):
// kühles Papierweiß, Ozeanblau mit Kontrast ≥ 3:1, Koralle exklusiv als Highlight.
// Blau ↔ Koralle bleibt unter Deuteranopie/Protanopie unterscheidbar (CVD-Nachweis
// in docs/evaluation/cvd/); WCAG-Ratios siehe Paket-07-Umsetzungsstand.
const LIGHT = {
  bg: '#f6f8f9',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  surfaceSoft: '#eef2f4',
  land: '#e8e4d8',
  graticule: '#e1e7eb',
  track: '#7a8ea0',
  point: '#2e5f8a',
  trend: '#22303c',
  band: '#93a7b5',
  accent: '#e4572e',     // exklusiv für Hover-/Brush-/Story-Highlight (E2); Grafik ≥ 3:1
  accentText: '#c2461f', // Akzent ALS TEXT (refit-hint): 5,0:1 auf Weiß statt 3,7:1
  accentControl: '#c2461f',
  onAccent: '#ffffff',
  controlActive: '#2e5f8a',
  onSolid: '#ffffff',
  text: '#22303c',
  muted: '#55636f',
  halo: '#ffffff',
  markOutline: '#ffffff',
  scaleLow: '#d7e3ec',
  overlay: 'rgba(255, 255, 255, 0.82)',
  selection: 'rgba(255, 255, 255, 0.72)',
  chipOverlay: 'rgba(255, 255, 255, 0.25)',
  chipOverlayHover: 'rgba(255, 255, 255, 0.40)',
  shadow: 'rgba(34, 48, 60, 0.14)',
  warningBg: '#fff6f2',
  wave: 'rgba(46, 95, 138, 0)',
  dimOpacity: 0.07,
};

// „Deep Ocean": nächtliches Pazifik-Navy, helle Messlinien und das bestehende
// Korallen-Signal. Text-/Akzentkontraste auf bg liegen jeweils deutlich über 4,5:1.
const OCEAN = {
  bg: '#071a2b',
  surface: '#0d263b',
  surfaceElevated: '#13334b',
  surfaceSoft: '#102c42',
  land: '#17364b',
  graticule: '#2a475c',
  track: '#89a9be',
  point: '#68a9d6',
  trend: '#f3f8fc',
  band: '#5a7890',
  accent: '#ff8060',
  accentText: '#ff8060',
  accentControl: '#ff8060',
  onAccent: '#071a2b',
  controlActive: '#2e5f8a',
  onSolid: '#ffffff',
  text: '#f3f8fc',
  muted: '#b7cad9',
  halo: '#071a2b',
  markOutline: '#f3f8fc',
  scaleLow: '#17364b',
  overlay: 'rgba(13, 38, 59, 0.86)',
  selection: 'rgba(19, 51, 75, 0.84)',
  chipOverlay: 'rgba(255, 255, 255, 0.14)',
  chipOverlayHover: 'rgba(255, 255, 255, 0.24)',
  shadow: 'rgba(0, 0, 0, 0.36)',
  warningBg: '#3a2230',
  wave: 'rgba(104, 169, 214, 0.12)',
  dimOpacity: 0.13,
};

export const THEME_PALETTES = Object.freeze({
  light: Object.freeze(LIGHT),
  ocean: Object.freeze(OCEAN),
});

// Rückwärtskompatibler Alias für statische, theme-unabhängige Imports. Neue
// dynamische Farbskalen verwenden getActivePalette() aus core/theme.js.
export const COLORS = THEME_PALETTES.light;

export const DUR_MODE = 750;   // benannte Transition 'mode' (Toggle)
export const DUR_DRAW = 2000;  // Track-/Korridor-Einzeichnen (Story-Hook)
export const BREAKPOINT = 1000;

export const MAP = { width: 960, height: 480, pad: 10 };
export const SCATTER = {
  width: 640, height: 520,
  margin: { top: 28, right: 20, bottom: 76, left: 58 },
};
export const UNIFORM_POINT_R = 4;

// Nur Story-relevante Inseln beschriften - Clutter-Regel
export const LABELED_ISO3 = ['FJI', 'VUT', 'NIU', 'GUM', 'TON', 'WSM', 'TUV'];

// Residuen-Reveal (Story Step 3): leuchtend = mind. 10× mehr Betroffene als die
// Erwartungslinie vorhersagt (residual_pc ist log10-Abstand → 1.0 = Faktor 10).
export const REVEAL_RESIDUAL_MIN = 1.0;

export function applyCssVars(theme = 'light', root = document.documentElement) {
  const palette = THEME_PALETTES[theme] ?? THEME_PALETTES.light;
  const map = {
    '--bg': palette.bg,
    '--surface': palette.surface,
    '--surface-elevated': palette.surfaceElevated,
    '--surface-soft': palette.surfaceSoft,
    '--land': palette.land,
    '--graticule': palette.graticule,
    '--track': palette.track,
    '--point': palette.point,
    '--trend': palette.trend,
    '--band': palette.band,
    '--accent': palette.accent,
    '--accent-text': palette.accentText,
    '--accent-control': palette.accentControl,
    '--on-accent': palette.onAccent,
    '--control-active': palette.controlActive,
    '--on-solid': palette.onSolid,
    '--text': palette.text,
    '--muted': palette.muted,
    '--halo': palette.halo,
    '--mark-outline': palette.markOutline,
    '--scale-low': palette.scaleLow,
    '--overlay': palette.overlay,
    '--selection': palette.selection,
    '--chip-overlay': palette.chipOverlay,
    '--chip-overlay-hover': palette.chipOverlayHover,
    '--shadow': palette.shadow,
    '--warning-bg': palette.warningBg,
    '--wave': palette.wave,
    '--dim-opacity': String(palette.dimOpacity),
  };
  for (const [k, v] of Object.entries(map)) root.style.setProperty(k, v);
  return palette;
}
