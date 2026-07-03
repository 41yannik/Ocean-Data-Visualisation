// Zentrale Konstanten — einzige Quelle für Farben/Dauern/Maße.
// Paket 07 (finale Palette) tauscht NUR diese Datei; styles.css nutzt die CSS-Variablen,
// die applyCssVars() einmalig aus COLORS auf :root setzt.

// Finale Palette „Pazifik hell" (Paket 07, Nutzer-Entscheidung 2026-07-03):
// kühles Papierweiß, Ozeanblau mit Kontrast ≥ 3:1, Koralle exklusiv als Highlight.
// Blau ↔ Koralle bleibt unter Deuteranopie/Protanopie unterscheidbar (CVD-Nachweis
// in docs/evaluation/cvd/); WCAG-Ratios siehe Paket-07-Umsetzungsstand.
export const COLORS = {
  bg: '#f6f8f9',
  land: '#e8e4d8',
  graticule: '#e1e7eb',
  track: '#7a8ea0',
  point: '#2e5f8a',
  trend: '#22303c',
  band: '#93a7b5',
  accent: '#e4572e',     // exklusiv für Hover-/Brush-/Story-Highlight (E2); Grafik ≥ 3:1
  accentText: '#c2461f', // Akzent ALS TEXT (refit-hint): 5,0:1 auf Weiß statt 3,7:1
  text: '#22303c',
  muted: '#55636f',
  dimOpacity: 0.07,
};

export const DUR_MODE = 750;   // benannte Transition 'mode' (Toggle)
export const DUR_DRAW = 2000;  // Track-/Korridor-Einzeichnen (Story-Hook)
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

// Residuen-Reveal (Story Step 3): leuchtend = mind. 10× mehr Betroffene als die
// Erwartungslinie vorhersagt (residual_pc ist log10-Abstand → 1.0 = Faktor 10).
export const REVEAL_RESIDUAL_MIN = 1.0;

export function applyCssVars(root = document.documentElement) {
  const map = {
    '--bg': COLORS.bg, '--land': COLORS.land, '--graticule': COLORS.graticule,
    '--track': COLORS.track, '--point': COLORS.point, '--trend': COLORS.trend,
    '--band': COLORS.band, '--accent': COLORS.accent, '--accent-text': COLORS.accentText,
    '--text': COLORS.text,
    '--muted': COLORS.muted, '--dim-opacity': String(COLORS.dimOpacity),
  };
  for (const [k, v] of Object.entries(map)) root.style.setProperty(k, v);
}
