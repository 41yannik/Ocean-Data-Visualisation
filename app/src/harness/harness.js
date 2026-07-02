// Dev-Harness — wird in C3 implementiert (Registry, Fixtures, Patch-Button-Leiste).
export function runHarness(mountKey, fixtureKey) {
  document.body.innerHTML =
    `<div class="harness-container"><p class="harness-summary">Harness-Stub — Implementierung folgt in C3 (mount=${mountKey}, fixture=${fixtureKey ?? '–'}).</p></div>`;
}
