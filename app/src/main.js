// Router + einziger Kompositionspunkt (docs/plan/09 §5).
// ?mount=<key>[&fixture=<key>] → Dev-Harness mit genau einer Komponente; sonst volle App.
const params = new URLSearchParams(location.search);

(async () => {
  if (params.get('mount')) {
    const { runHarness } = await import('./harness/harness.js');
    runHarness(params.get('mount'), params.get('fixture'));
  } else {
    runApp();
  }
})();

async function runApp() {
  // C10 füllt die Komposition (Karte, Scatter, UI) — bis dahin Platzhalter,
  // damit jeder Zwischen-Commit lauffähig bleibt.
  document.querySelector('#map').innerHTML = placeholder('Map — folgt in C4–C6');
  document.querySelector('#scatter').innerHTML = placeholder('Scatter — folgt in C7–C9');
}

function placeholder(label) {
  return `<div style="border:1px dashed #ccc;padding:40px;text-align:center;color:#999">${label}</div>`;
}
