// Zentrale Konstanten — einzige Quelle für Farben/Dauern/Maße.
// Paket 07 (finale Palette) tauscht NUR diese Datei; styles.css nutzt die CSS-Variablen,
// die applyCssVars() einmalig aus COLORS auf :root setzt.

export const COLORS = {
  bg: '#fdfdfb',
  land: '#e3e1d8',
  graticule: '#ecebe3',
  track: '#7b8a9a',
  point: '#46688c',
  trend: '#2f3640',
  band: '#8a93a0',
  accent: '#e4572e', // exklusiv für Hover-/Brush-/Story-Highlight (E2)
  text: '#333333',
  muted: '#777777',
  dimOpacity: 0.07,
};

export const DUR_MODE = 750;   // benannte Transition 'mode' (Toggle)
export const BREAKPOINT = 1000;

export const MAP = { width: 960, height: 480, pad: 10 };
export const SCATTER = {
  width: 640, height: 520,
  margin: { top: 28, right: 20, bottom: 76, left: 58 },
};
export const R_MIN = 2.5;      // Punktradius (Tote fehlend/0)
export const R_MAX = 12;

// Nur Story-relevante Inseln beschriften — Clutter-Regel
export const LABELED_ISO3 = ['FJI', 'VUT', 'NIU', 'GUM', 'TON', 'WSM', 'TUV'];

export function applyCssVars(root = document.documentElement) {
  const map = {
    '--bg': COLORS.bg, '--land': COLORS.land, '--graticule': COLORS.graticule,
    '--track': COLORS.track, '--point': COLORS.point, '--trend': COLORS.trend,
    '--band': COLORS.band, '--accent': COLORS.accent, '--text': COLORS.text,
    '--muted': COLORS.muted, '--dim-opacity': String(COLORS.dimOpacity),
  };
  for (const [k, v] of Object.entries(map)) root.style.setProperty(k, v);
}
