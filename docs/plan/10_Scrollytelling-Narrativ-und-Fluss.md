# Paket 10 — Scrollytelling: Gesamterzählung & Fluss

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Story trägt sich nach dem Wegfall der Schrittzähler selbst: thematische Kapitel statt Nummern, ein Mensch-→-Makro-→-Mensch-Bogen, strenge Akzentfarben-Disziplin und fließende Punkt-Morphs beim Kapitelwechsel.

**Architecture:** Layout v5 (nativer linearer One-Pager, `main.js` rendert Sektionen aus `SECTIONS`, jede Sektion hat EIGENE eingefrorene D3-Instanzen) bleibt die Grundlage. Neu kommen hinzu: (a) Kapitel-Metadaten in `sections.js` statt „Step N of 8", (b) eine Scroll-Spy-Kapitelnavigation, (c) redaktionelle Textänderungen ausschließlich über den `resolveRefs`-Mechanismus (keine getippten Zahlen), (d) zwei „Bühnen-Gruppen": aufeinanderfolgende Sektionen teilen sich EINE sticky D3-Instanz, Scrollama triggert `steps[i].apply()` auf den gemeinsamen (weiter gesperrten) Store — die Punkte morphen dann per Objektkonstanz (`data-key = id`) von Formation zu Formation.

**Tech Stack:** D3 v7 (Transitions + Objektkonstanz), Scrollama 3.2 (bereits Dependency, wird reaktiviert), CSS Scroll-Driven Animations (`animation-timeline: view()`) als Progressive Enhancement, Vite 6.

## Global Constraints

- **Keine getippte Datenzahl in Story-Texten** — alle Zahlen via `{{ns:pfad[:fmt]}}` durch `resolveRefs` (Paket-06-DoD; der Resolver wirft bei unbekannter Referenz).
- **Akzentfarbe `#e4572e` exklusiv** für Hover/Brush/Story-Highlight (config.js E2); als Text `--accent-text: #c2461f` (5,0:1). Diese Werte NICHT ändern (CVD-Nachweis in `docs/evaluation/cvd/` gilt nur für sie).
- **`prefers-reduced-motion` respektieren:** jede neue Animation braucht den Reduced-Motion-Pfad (Repo-Konvention: `state.reducedMotion` in D3, `@media (prefers-reduced-motion: reduce)` in CSS).
- **Story-Gate bleibt zu:** `exploreUnlocked: false` in allen Story-Sektionen; nur die Explore-Sektion entsperrt.
- **Kein Framework-Wechsel, keine neue Runtime-Dependency** außer der Reaktivierung von Scrollama (ist bereits in `package.json`).
- **Commits OHNE `Co-Authored-By: Claude`-Trailer** (Nutzer-Regel, überschreibt Harness-Default); Commit-Sprache Deutsch wie im Repo üblich.
- **Arbeitsverzeichnis:** `~/dev/pacific-dataviz` (Klon), NICHT das OneDrive-Verzeichnis.
- Verifizierte Referenzzahlen aus `docs/plan/README.md` gelten unverändert (u. a. 99 Sturm-Land-Paare, 78 scatter-fähig, Heta ASM 23.060 vs. NIU 702 — im Frontend aber immer via Refs).

---

## Teil A — Tools-Analyse (aus `Tools.md`)

Die Kurs-Werkzeugliste (`Tools.md`) wurde vollständig gegen die vier Verbesserungsstrategien geprüft:

| Tool (Tools.md) | Eignung für dieses Paket | Entscheidung |
|---|---|---|
| **D3** | Einziges Toolkit der Liste mit voller Kontrolle über Objektkonstanz (`selection.data(events, d => d.id)`), benannte Transitions und `d3.geo*` — exakt das, was „Punkte fließen von Formation zu Formation" technisch bedeutet. Bereits Kern der App. | **Gesetzt** — trägt alle Morphs (Tasks 7–8). |
| **HTML/CSS/JavaScript (Standard-Web)** | State of the Art 2026: **CSS Scroll-Driven Animations** (`animation-timeline: view()`, Baseline seit Chrome 115/Safari 26/Firefox 144) erlauben scrollgekoppelte Einblendungen OHNE JavaScript und OHNE Scroll-Listener — perfekt für sanfte Sektions-Entrées. **Scrollama 3.2** (IntersectionObserver-basiert, De-facto-Standard für Scrollytelling, z. B. The Pudding) ist bereits Dependency und toter Code in `storyRunner.js` — wird für die Bühnen-Gruppen reaktiviert. | **Nutzen** — Task 6 (CSS, Progressive Enhancement mit `@supports`) und Tasks 7–8 (Scrollama). |
| **View Transitions API** (Standard-Web, geprüft als Alternative) | Snapshot-basierter Crossfade zwischen DOM-Zuständen — kann einzelne SVG-Kreise NICHT positionsecht morphen (keine Objektkonstanz pro Datenpunkt). | **Verworfen** für Punkt-Morphs; D3-Transitions sind hier überlegen. |
| **Vega / Vega-Lite / Observable Plot / Altair** | Deklarative Grammatiken; keine feingranulare Kontrolle über gestaffelte Formations-Übergänge (Plot hat gar kein Transition-System). Ein Umbau würde die gesamte CMV-Architektur (Paket 09) ersetzen. | **Verworfen.** |
| **p5.js / Processing** | Imperatives Canvas: Punkt-Morphs wären machbar, aber alle SVG-Barrierefreiheit (`aria-label` je Punkt, `tabindex`, `:focus-visible`) ginge verloren — Paket 07 wäre rückabzuwickeln. | **Verworfen.** |
| **Leaflet / Google Maps API** | Tile-basierte Slippy-Maps; die Dateline-Zentrierung über `rotate([-192,0])` und der R34-Korridor sind in `d3.geo` bereits gelöst und besser kontrollierbar. | **Verworfen** — Karte bleibt D3. |
| **React / Vue / Svelte** | Der handgerollte Store (`core/state.js`) + Komponenten-Vertrag (`update(state, patch)`) leistet reaktive Updates bereits; ein Framework brächte für Scroll-Morphs nichts und kostete einen Rewrite. | **Verworfen** (YAGNI). |
| **Arquero / Falcon / crossfilter** | In-Memory-DBs lohnen ab ~10⁵ Zeilen; wir haben 99. | **Verworfen.** |
| **Color Brewer / Adobe Color / Viz Palette** | Für Task 5 (Akzent-Disziplin) werden KEINE Farbwerte geändert, nur Zuordnungen — der bestehende CVD-Nachweis bleibt gültig. Viz Palette dient als Prüfwerkzeug, FALLS eine Demotion einen neuen Farbwert bräuchte (soll nicht vorkommen). | **Referenz-Werkzeug**, kein Code. |
| **eslint** (Tools.md „Debugging") | Sinnvoll, aber orthogonal zu diesem Paket. | Außerhalb des Scopes. |
| **Sass / Bootstrap** | CSS-Variablen aus `config.js` sind die einzige Farbquelle (eine Quelle der Wahrheit); ein Präprozessor würde das aufweichen. | **Verworfen.** |
| Tableau / ggplot2 / Seaborn / Netzwerk-Tools (Gephi …) | Nicht webfähig bzw. themenfremd (keine Netzwerkdaten). | **Verworfen.** |

**Kernentscheidung:** D3-Transitions mit Objektkonstanz + Scrollama-Trigger + CSS Scroll-Driven Animations als Enhancement. Keine neue Dependency.

## Teil B — Die vier Strategien, ausformuliert

1. **Thematische Kapitel statt Schrittzähler.** Der Kicker „Step N of 8" (in `main.js` erzeugt) wird durch **Akt-Wegweiser** ersetzt: drei erzählerische Akte („The question" → „The evidence" → „The people") plus „Your turn" für die Exploration. Die bestehenden `h2`-Titel („A warming ocean", „One storm, two societies", …) bleiben unverändert als Kapitelnamen — sie tragen bereits. Da mit den Nummern auch die Orientierung „wo bin ich?" entfällt, kommt eine dezente Scroll-Spy-Kapitelnavigation hinzu (Task 2) — sie erfüllt zugleich die E3-Robustheitsregel (Kapitel ohne Scrollen erreichbar), die der tote `progressNav` abdecken sollte.
2. **Der narrative Bogen (Mensch → Makro → Mensch).** Der Hero verrät aktuell die Antwort („say: **no**") bevor die Frage erlebt wurde. Neu: Der Hero stellt nur die Frage und deutet die eine Nacht im Januar 2004 an; das Heta-Kapitel erzählt sie konkret (mit Pro-Kopf-Maßstab: „ein Drittel aller Menschen auf der Insel" — via Ref, nie getippt); erst Kapitel „The line is almost flat" liefert die Antwort als verdienten Reveal. Am Ende schlägt eine **Coda** die Brücke zurück: die Gesamtzahl betroffener Menschen hinter allen Punkten (neue Ref `stat:totalAffected`), unmittelbar vor der Einladung zur eigenen Exploration. **Wichtig (Daten-Ehrlichkeit):** keine erfundenen Einzelschicksale — die menschliche Nähe entsteht aus belegten Zahlen in menschlichem Maßstab, nicht aus fiktiven Personen.
3. **Akzentfarben-Disziplin.** Regel: **pro Sektion trägt genau EIN visuelles Element die Akzentfarbe — das Element der Kernaussage.** Transientes Interaktions-Feedback (Hover, Fokus-Ringe) bleibt akzentfarben (es ist per Definition flüchtig und einzeln). Dauerhaft akzentfarbene Chrome-Elemente (aktive Toggle-Buttons, Selection-Chip, Windkorridor-Fläche) werden auf `--point`/`--track` demotet, damit der Akzent die Daten-Pointe markiert (Inventar + Fixes in Task 5).
4. **Fließende Datenanimationen.** Architektur-Befund: v5 mountet pro Sektion SEPARATE Instanzen mit eingefrorenem Zustand — zwischen Sektionen kann nichts morphen. Lösung: **Bühnen-Gruppen.** Aufeinanderfolgende Sektionen mit `stage`-Schlüssel teilen sich EINE sticky Grafik-Instanz; die Textkarten scrollen darüber, Scrollama wendet beim Kartenwechsel `steps[i].apply()` auf den gemeinsamen Store an, die Layer transitionieren (CSS-Transitions für Klassen-Fades, D3-Transitions für Positionen). Zwei Gruppen: **Stufe 1** „expectation → reveal" (Punkte bleiben, Trend/Residuen morphen ein — reine Klassen-Fades, geringes Risiko) und **Stufe 2** „patterns → honesty" (Flaggschiff: 78 Scatter-Punkte fliegen in das 99er-Unit-Raster, 21 Ghost-Punkte erscheinen — echte Formations-Morphs). Der Harold-Abschnitt zwischen beiden Gruppen bleibt eigenständig: `haroldMorph` IST bereits ein filmischer Morph. `prefers-reduced-motion` ⇒ Sticky bleibt, Übergänge springen.

**Empfohlene Reihenfolge = Task-Reihenfolge** (jeder Task einzeln shipbar, aufsteigendes Risiko): 1 Kapitel-Kicker → 2 Kapitel-Nav → 3 Einstieg → 4 Coda → 5 Akzent → 6 CSS-Entrées → 7 Bühne Stufe 1 → 8 Formations-Morph.

---

### Task 1: Kapitel-Kicker statt Schrittzähler

**Files:**
- Modify: `app/src/story/sections.js` (Akt-Feld je Sektion)
- Modify: `app/src/main.js:109` (Kicker-Rendering)

**Interfaces:**
- Produces: `SECTIONS[i].act: string` — von `main.js` gerendert; Task 2 liest zusätzlich `steps[sec.step].title` für Nav-Labels.

- [ ] **Step 1: Akt-Wegweiser in `sections.js` ergänzen**

In `app/src/story/sections.js` jedem Eintrag ein `act`-Feld geben (Einfügung jeweils direkt nach `step:`):

```js
// Drei erzählerische Akte statt Schrittzähler (Paket 10 §B1) - der Kicker ist
// Wegweiser, der h2-Titel der Kapitelname.
export const SECTIONS = [
  { step: 0, act: 'The question', views: ['sst'], aria: { sst: ARIA.sst } },
  {
    step: 1, act: 'The question', views: ['map', 'bars'],
    // …bestehende Felder unverändert…
  },
  { step: 2, act: 'The evidence', /* … */ },
  { step: 3, act: 'The evidence', /* … */ },
  { step: 4, act: 'The evidence', /* … */ },
  { step: 5, act: 'The evidence', /* … */ },
  { step: 6, act: 'The people', /* … */ },
  { step: 7, act: 'Your turn', views: ['map', 'scatter'], explore: true, /* … */ },
];
```

- [ ] **Step 2: Kicker-Rendering in `main.js` umstellen**

In `app/src/main.js` die Zeile

```js
<p class="kicker">${sec.explore ? 'Explore the data' : `Step ${sec.step + 1} of ${SECTIONS.length}`}</p>
```

ersetzen durch

```js
<p class="kicker">${sec.act}</p>
```

- [ ] **Step 3: Verifizieren**

Run: `cd ~/dev/pacific-dataviz/app && npm run dev`, dann `http://localhost:5173/` öffnen.
Expected: Kein „Step N of 8" mehr auf der Seite; Sektion 1 zeigt Kicker „The question", die Explore-Sektion „Your turn". Konsole ohne Fehler.

- [ ] **Step 4: Commit**

```bash
git add app/src/story/sections.js app/src/main.js
git commit -m "Story: thematische Akt-Kicker statt Schrittzaehler (Paket 10 Task 1)"
```

---

### Task 2: Scroll-Spy-Kapitelnavigation

**Files:**
- Create: `app/src/story/chapterNav.js`
- Modify: `app/src/main.js` (Mount nach dem Sektions-Rendering)
- Modify: `app/src/styles.css` (Nav-Styles)
- Modify: `app/src/harness/registry.js` (Harness-Eintrag)

**Interfaces:**
- Consumes: gerenderte `.section`-Elemente mit `id="step-N"`, `SECTIONS[i].act`, `steps[i].title` (aus Task 1 / bestehend).
- Produces: `createChapterNav(container, { sections, steps })` → `{ destroy() }`. Kein Store-Zugriff (v5 hat keinen globalen `step`-State) — reine DOM-Navigation.

- [ ] **Step 1: Komponente schreiben**

`app/src/story/chapterNav.js` anlegen:

```js
// Kapitel-Navigation (Paket 10 Task 2): fixe Punktleiste rechts, ein Punkt je Sektion.
// Scroll-Spy per IntersectionObserver (Mittelband des Viewports), Klick scrollt zur
// Sektion. Ersetzt den v4-progressNav funktional (E3: Kapitel ohne Scrollen erreichbar);
// KEIN Store - v5 hat keinen globalen step-State, Navigation ist reines DOM.
export function createChapterNav(container, { sections, steps }) {
  const nav = document.createElement('nav');
  nav.className = 'chapter-nav';
  nav.setAttribute('aria-label', 'Chapters');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const buttons = sections.map((sec) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cn-dot';
    const title = steps[sec.step].title;
    b.setAttribute('aria-label', `${sec.act}: ${title}`);
    b.innerHTML = `<span class="cn-label">${title}</span>`;
    b.addEventListener('click', () => {
      document.querySelector(`#step-${sec.step}`)
        ?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    });
    nav.appendChild(b);
    return b;
  });
  container.appendChild(nav);

  // Scroll-Spy: aktiv ist die Sektion, die das Mittelband (45-55 % Viewport) schneidet.
  const byEl = new Map(sections.map((sec, i) => [document.querySelector(`#step-${sec.step}`), i]));
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const i = byEl.get(e.target);
      buttons.forEach((b, j) => {
        b.classList.toggle('active', j === i);
        if (j === i) b.setAttribute('aria-current', 'true');
        else b.removeAttribute('aria-current');
      });
    }
  }, { rootMargin: '-45% 0px -45% 0px' });
  for (const el of byEl.keys()) if (el) io.observe(el);

  return { destroy() { io.disconnect(); nav.remove(); } };
}
```

- [ ] **Step 2: In `main.js` mounten**

In `runApp()` nach dem `main.innerHTML = …`-Block (also direkt vor `function mountSection`) einfügen; Import oben ergänzen:

```js
import { createChapterNav } from './story/chapterNav.js';
```

```js
    // Kapitel-Nav (Paket 10 Task 2): erst nach dem Sektions-Rendering, braucht die IDs.
    if (!storyOff) createChapterNav(document.body, { sections, steps });
```

- [ ] **Step 3: Styles ergänzen**

In `app/src/styles.css` (unter dem `.pn-dot`-Block):

```css
/* ----- Kapitel-Navigation (Paket 10 Task 2) ----- */
.chapter-nav {
  position: fixed; right: 18px; top: 50%; transform: translateY(-50%);
  display: flex; flex-direction: column; gap: 12px; z-index: 30;
}
.cn-dot {
  width: 10px; height: 10px; border-radius: 50%; padding: 0;
  border: 1.5px solid var(--muted); background: transparent; cursor: pointer;
  position: relative;
}
.cn-dot.active { background: var(--point); border-color: var(--point); }
.cn-dot:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.cn-label {
  position: absolute; right: 20px; top: 50%; transform: translateY(-50%);
  white-space: nowrap; font-size: 12px; color: var(--text);
  background: #fff; padding: 3px 9px; border-radius: 6px;
  box-shadow: 0 1px 6px rgba(34, 48, 60, 0.14);
  opacity: 0; pointer-events: none; transition: opacity 0.2s;
}
.cn-dot:hover .cn-label, .cn-dot:focus-visible .cn-label { opacity: 1; }
@media (max-width: 1099px) { .chapter-nav { display: none; } }
```

Beachte: Der aktive Punkt ist bewusst `--point` (Blau), nicht Akzent — Navigation ist Chrome, kein Daten-Highlight (Regel aus Teil B3; der alte `.pn-dot.active` in Akzent war eine Verletzung).

- [ ] **Step 4: Harness-Eintrag**

In `app/src/harness/registry.js` einen Eintrag nach dem Muster der bestehenden ergänzen (Signatur beachten — `chapterNav` braucht gerenderte Sektionen, daher genügt ein Minimal-DOM im Harness):

```js
  chapterNav: {
    async mount(root) {
      root.innerHTML = ['A', 'B', 'C'].map((t, i) =>
        `<section id="step-${i}" style="min-height:100vh"><h2>${t}</h2></section>`).join('');
      const { createChapterNav } = await import('../story/chapterNav.js');
      createChapterNav(root, {
        sections: [{ step: 0, act: 'The question' }, { step: 1, act: 'The evidence' }, { step: 2, act: 'Your turn' }],
        steps: [{ title: 'Alpha' }, { title: 'Beta' }, { title: 'Gamma' }],
      });
    },
  },
```

(Exakte Registry-Form an die bestehenden Einträge in `registry.js` angleichen — sie ist dort etabliert; obiges zeigt die nötigen Daten.)

- [ ] **Step 5: Verifizieren**

Run: `http://localhost:5173/?mount=chapterNav` und danach die App selbst.
Expected: Rechts eine Punktleiste; beim Scrollen wandert der aktive (blaue) Punkt; Hover zeigt den Kapiteltitel; Klick springt zur Sektion; unter 1100 px Breite ausgeblendet; `?story=off` zeigt keine Nav.

- [ ] **Step 6: Commit**

```bash
git add app/src/story/chapterNav.js app/src/main.js app/src/styles.css app/src/harness/registry.js
git commit -m "Story: Scroll-Spy-Kapitelnavigation (Paket 10 Task 2)"
```

---

### Task 3: Narrativer Einstieg — Frage statt Antwort, menschlicher Maßstab

**Files:**
- Modify: `app/index.html:19-22` (Hero)
- Modify: `app/src/story/steps.js` (Steps `hook-heta` und `expectation`)

**Interfaces:**
- Consumes: bestehende Refs `{{event:2004-0004-NIU.affected_pc:pct}}`, `{{event:2004-0004-ASM.affected_pc:pct}}` (Feld `affected_pc` existiert, `:pct` via `fmtPct`).

- [ ] **Step 1: Hero hält die Antwort zurück**

In `app/index.html` die drei `hero-lead`-Absätze ersetzen (der Hero ist statisches HTML ohne Ref-Resolver — deshalb hier bewusst KEINE Zahlen):

```html
      <p class="hero-lead">One question: does a stronger storm hurt more people?</p>
      <p class="hero-lead">In January 2004, one cyclone swept past two island nations
        on the same night &mdash; and left two very different stories behind.</p>
      <p class="hero-lead">Twenty-five years of Pacific cyclones hold the answer,
        and it is not the one the forecast suggests.</p>
```

- [ ] **Step 2: Heta-Kapitel menschlicher erzählen (Step `hook-heta`)**

In `app/src/story/steps.js` das `html` von `hook-heta` ersetzen (nur Refs, keine getippten Zahlen; `affected_pc` liefert den menschlichen Maßstab):

```js
      html: r(`This is that night. Cyclone Heta ({{event:2004-0004-ASM.category:cat}},
        near peak intensity) swept past American Samoa and Niue; its gale-force wind
        field covered both islands. In American Samoa it affected
        <strong>{{event:2004-0004-ASM.affected:int}} people</strong> —
        {{event:2004-0004-ASM.affected_pc:pct}} of everyone living there. On Niue:
        <strong>{{event:2004-0004-NIU.affected:int}} people</strong>, on an island where
        that is {{event:2004-0004-NIU.affected_pc:pct}} of the population.
        <strong>Same storm, same night — different societies.</strong>`),
```

- [ ] **Step 3: Mikro→Makro-Scharnier (Step `expectation`)**

Das `html` von `expectation` beginnt neu mit einem Scharniersatz; Rest unverändert:

```js
      html: r(`Now zoom out from that one night to every recorded strike since
        {{stat:yearMin}}. Each dot is one storm striking one country: {{stat:scatterCount}} of them,
        peak wind speed against the share of the population affected. …`),
```

(„…" = bestehender Text ab „The dashed line is what wind alone would predict" wörtlich übernehmen.)

- [ ] **Step 4: Verifizieren**

Run: `http://localhost:5173/` neu laden.
Expected: Hero ohne „say: no"; Heta-Kapitel zeigt beide Pro-Kopf-Prozente (Werte kommen aus events.json — erscheint ein Fehler-Banner, ist eine Ref falsch geschrieben); Kapitel „What wind speed should predict" beginnt mit „Now zoom out…". Der Reveal „only X % of the variance" fällt weiter erst in „The line is almost flat".

- [ ] **Step 5: Commit**

```bash
git add app/index.html app/src/story/steps.js
git commit -m "Story: Hero stellt die Frage, Heta-Hook in Pro-Kopf-Massstab (Paket 10 Task 3)"
```

---

### Task 4: Narrative Coda — Brücke zurück zum Menschen

**Files:**
- Modify: `app/src/story/refs.js` (neue Statistik `totalAffected`)
- Modify: `app/src/story/steps.js` (Step `explore`)

**Interfaces:**
- Produces: Ref `{{stat:totalAffected}}` — Summe `affected` über alle Events mit Wert, formatiert via `fmtInt`.

- [ ] **Step 1: `stat:totalAffected` implementieren**

In `app/src/story/refs.js`, Funktion `lookupStat`, vor der abschließenden `throw`-Zeile:

```js
  if (name === 'totalAffected') {
    const vals = events.map((e) => e.affected).filter((v) => v != null);
    if (!vals.length) throw new Error(`Story-Referenz: keine affected-Werte (${token})`);
    return fmtInt(vals.reduce((a, b) => a + b, 0));
  }
```

Zusätzlich den Grammatik-Kommentar am Dateikopf (Zeile 10–12) um `totalAffected` ergänzen.

- [ ] **Step 2: Ref im Browser prüfen**

Run: `http://localhost:5173/` mit DevTools-Konsole; auf einer beliebigen Seite prüfen, dass kein Banner erscheint, NACHDEM Step 3 eingebaut ist. (Der Resolver wirft laut Vertrag sofort — ein Tippfehler wird als rotes Fehler-Banner sichtbar, das ist der Test.)

- [ ] **Step 3: Coda in den Explore-Step schreiben**

In `app/src/story/steps.js` das `html` von `explore` ersetzen:

```js
      html: r(`Every dot on this page is a night like Heta's. Since {{stat:yearMin}},
        the storms behind these charts have affected
        <strong>{{stat:totalAffected}} people</strong> across the Pacific island
        countries — and a cyclone's track tells you where it goes, not what it costs
        the people beneath it. Preparedness has to target vulnerability and exposure,
        not just forecast wind speeds. <strong>Now explore for yourself:</strong>
        hover tracks and dots, brush the scatter, filter by year, category and country,
        and switch between per-capita and absolute impact.`),
```

- [ ] **Step 4: Verifizieren**

Run: `http://localhost:5173/?step=7`
Expected: Explore-Sektion beginnt mit „Every dot on this page is a night like Heta's" und einer siebenstelligen formatierten Gesamtzahl; kein Fehler-Banner.

- [ ] **Step 5: Commit**

```bash
git add app/src/story/refs.js app/src/story/steps.js
git commit -m "Story: Coda mit stat:totalAffected schlaegt Bruecke zurueck zum Menschen (Paket 10 Task 4)"
```

---

### Task 5: Akzentfarben-Disziplin — ein Akzent pro Sektion

**Files:**
- Modify: `app/src/styles.css` (gezielte Demotions)

**Interfaces:** keine (reine Style-Änderungen; Farb-WERTE bleiben unverändert → CVD-Nachweis gilt weiter).

**Inventar (erhoben 2026-07-05, `grep -n "accent" styles.css`).** Regel aus Teil B3: Akzent = Kernaussage der Sektion ODER transientes Interaktions-Feedback. Alles andere → `--point`/`--track`.

| Selektor | Rolle | Urteil |
|---|---|---|
| `.point.hovered/.sibling`, `.track.hovered`, `.rug-tick.hovered`, `:focus-visible`-Ringe, `.residual-line` | transientes Feedback | **behalten** |
| `.point.story-reveal`, `.point.set-hi`, `.point.pulse`, `.track.story-focus` | Kernaussage (Reveal/Text-Hover) | **behalten** |
| `.hm-*` (Harold-Track, Bubbles, Bracket) | Kernaussage des Harold-Morphs | **behalten** |
| `.impact-bubble`/`.heta-marker`/`.impact-bar.hl` | Kernaussage des Heta-Hooks | **behalten** |
| `.sst-cursor circle` + SST-Jahreslinien-Akzente (Z. 496–533) | Kernaussage Kapitel 1 (aktuelle Anomalie) | **behalten** |
| `.tooltip .tt-emph`, Fehler-Banner (Z. 623–624) | semantische Warnung | **behalten** |
| **`.swath`** (Z. 455–456, Windkorridor-Fläche+Kontur) | Setup, NICHT Pointe des Hooks — konkurriert mit den Impact-Bubbles | **demoten → `--track`** |
| **`.toggle-btn.active`** (Z. 250) | UI-Chrome (Reveal-Toggles, Unit-Sort, Mode) | **demoten → `--point`** |
| **`.selection-chip`** (Z. 388) | UI-Chrome | **demoten → `--point`** |
| **`.pn-dot.active`** (Z. 154) | toter v4-Code, aber sichtbar im Harness | **demoten → `--point`** (Konsistenz mit Task 2) |
| `.detail-panel` `border-left` (Z. 543) | Panel-Chrome | **demoten → `--point`** |

- [ ] **Step 1: Demotions umsetzen**

In `app/src/styles.css` exakt diese Ersetzungen (nur `var(--accent…)` → `var(--point)` bzw. `var(--track)`, Rest der Deklaration unverändert):

```css
.pn-dot.active { background: var(--point); border-color: var(--point); }

.toggle-btn.active { background: var(--point); border-color: var(--point); color: #fff; }

/* Windkorridor: Setup-Layer in Karten-Blaugrau - der Akzent gehoert den Impact-Bubbles */
.swath {
  fill: var(--track); fill-opacity: 0.16;
  stroke: var(--track); stroke-opacity: 0.8; stroke-width: 1.4;
}

.selection-chip { /* nur die background-Zeile aendern: */
  background: var(--point); color: #fff; padding: 5px 8px 5px 14px; border-radius: 999px;
}

.detail-panel { /* nur die border-left-Zeile aendern: */
  border-left: 3px solid var(--point);
}
```

`:focus-visible`-Outlines bleiben Akzent (transient, immer einzeln, A11y-Signal).

- [ ] **Step 2: Legende gegenprüfen**

`app/src/ui/legend.js:22` beschreibt Akzent als „highlight (hover/selection)" — das stimmt nach den Demotions weiterhin exakt. Keine Änderung nötig; nur verifizieren.

- [ ] **Step 3: Visuell verifizieren (jede Sektion einzeln)**

Run: `http://localhost:5173/?step=N` für N = 1, 3, 7.
Expected: Sektion 1 (Heta): Korridor blaugrau, NUR Bubbles/Balken orange. Sektion 3 (Reveal): nur Outlier-Punkte orange, Toggle-Buttons aktiv = blau. Sektion 7 (Explore): Selection-Chip blau, Hover-Highlights weiter orange. Pro Viewport nie mehr als eine akzentfarbene Aussage-Ebene (Hover ausgenommen).

- [ ] **Step 4: Commit**

```bash
git add app/src/styles.css
git commit -m "Farben: Akzent exklusiv fuer Kernaussagen, Chrome auf Punktblau demotet (Paket 10 Task 5)"
```

---

### Task 6: Sanfte Sektions-Entrées (CSS Scroll-Driven Animations)

**Files:**
- Modify: `app/src/styles.css`

**Interfaces:** keine. Progressive Enhancement: Browser ohne `animation-timeline` zeigen exakt das heutige Verhalten (die D3-Mount-Stagger aus `pointsLayer`/`unitChart` bleiben unberührt und animieren die GRAFIKEN — hier geht es nur um die TEXTBLÖCKE, sonst doppelt es sich).

- [ ] **Step 1: Entrée-Animation ergänzen**

Ans Ende von `app/src/styles.css`:

```css
/* ----- Scrollgekoppelte Text-Entrées (Paket 10 Task 6) -----
   Nur .section-text - die Grafiken haben eigene D3-Mount-Stagger (kein Doppel-Fade).
   Progressive Enhancement: ohne animation-timeline-Support passiert schlicht nichts. */
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .section-text {
      animation: section-rise both;
      animation-timeline: view();
      animation-range: entry 0% entry 55%;
    }
  }
}
@keyframes section-rise {
  from { opacity: 0; transform: translateY(22px); }
  to { opacity: 1; transform: none; }
}
```

- [ ] **Step 2: Verifizieren**

Run: App in Chrome ≥ 115 scrollen; danach mit aktiviertem `prefers-reduced-motion` (macOS: Systemeinstellungen → Bedienungshilfen → Bewegung reduzieren) neu laden.
Expected: Texte gleiten beim Eintritt sanft ein und sind bei 55 % Sichtbarkeit voll da (kein „Nachladen"-Gefühl beim Lesen); mit Reduced Motion keinerlei Bewegung; im Fallback-Browser (z. B. älteres Firefox-Profil) unverändert statisch.

- [ ] **Step 3: Commit**

```bash
git add app/src/styles.css
git commit -m "Story: scrollgekoppelte Text-Entrees als Progressive Enhancement (Paket 10 Task 6)"
```

---

### Task 7: Bühnen-Gruppe Stufe 1 — „expectation → reveal" morpht statt zu schneiden

**Files:**
- Create: `app/src/story/stageGroup.js`
- Modify: `app/src/story/sections.js` (Gruppen-Schlüssel)
- Modify: `app/src/main.js` (Gruppen-Rendering + -Mount)
- Modify: `app/src/styles.css` (Sticky-Layout, weiche Klassen-Fades)

**Interfaces:**
- Consumes: `steps[i].apply() → patch` (bestehender Vertrag), `createScatter(el, ctx, { layers })`, `createStore`, `makeInitialState`, `createRevealToggles`, `createTooltip`; Scrollama 3.2 (`import scrollama from 'scrollama'`).
- Produces: `createStageGroup(groupEl, { ctx, steps, members, buildComponents })` → `{ store, destroy() }`; `SECTIONS[i].stage: string` — aufeinanderfolgende Sektionen mit gleichem `stage` werden zu EINER Gruppe. `members` = `[{ sec, textEl }]`; `buildComponents(groupEl, groupCtx)` → Komponenten-Array (Gruppe-spezifische Komposition, Task 7 vs. Task 8).
- Wichtig: Die Punkte behalten zwischen beiden Steps ihre Position (gleiche Skalen, gleicher Mode) — der „Morph" dieser Stufe ist der weiche Übergang der Klassen-Zustände (Trend-Emphasis, Outlier-Glow, Connector-Fade). Positionsmorphs kommen in Task 8 mit derselben Infrastruktur.

- [ ] **Step 1: Gruppen-Schlüssel in `sections.js`**

Steps 2 und 3 erhalten `stage: 'dots'`:

```js
  {
    step: 2, stage: 'dots', views: ['scatter'],
    aria: { scatter: '…unverändert…' },
  },
  {
    step: 3, stage: 'dots', views: ['scatter'], controls: 'revealToggles',
    aria: { scatter: '…unverändert…' },
  },
```

- [ ] **Step 2: `stageGroup.js` schreiben**

```js
// Bühnen-Gruppe (Paket 10 Task 7): mehrere Story-Sektionen teilen sich EINE sticky
// D3-Instanz. Scrollama wendet beim Kartenwechsel steps[i].apply() auf den GEMEINSAMEN
// (gesperrten) Store an - die Layer faden/morphen dann per Klassen-/Positions-Transition,
// statt dass eine zweite eingefrorene Instanz hart schneidet. Reduced Motion: Zustände
// springen (CSS deaktiviert die Transitions), Sticky-Layout bleibt.
import scrollama from 'scrollama';
import { createStore } from '../core/state.js';
import { makeInitialState } from '../core/initialState.js';

export function createStageGroup(groupEl, { ctx, steps, members, buildComponents }) {
  const first = members[0].sec;
  const store = createStore({ ...makeInitialState(), ...steps[first.step].apply() });
  const groupCtx = { ...ctx, bus: store };

  const components = buildComponents(groupEl, groupCtx);
  store.subscribe((state, patch) => { for (const c of components) c.update(state, patch); });
  const state = store.get();
  for (const c of components) c.update(state, undefined);

  // Scrollama auf den Textkarten: Kartenwechsel = Step-Patch auf den gemeinsamen Store.
  const scroller = scrollama();
  scroller
    .setup({ step: members.map((m) => m.textEl), offset: 0.55 })
    .onStepEnter(({ index }) => {
      groupEl.dataset.activeStep = String(members[index].sec.step);
      store.set(steps[members[index].sec.step].apply());
    });
  const onResize = () => scroller.resize();
  window.addEventListener('resize', onResize);

  return {
    store, // für Text-Link-Verdrahtung in main.js
    destroy() {
      scroller.destroy();
      window.removeEventListener('resize', onResize);
      for (const c of components) c.destroy?.();
    },
  };
}
```

- [ ] **Step 3: Gruppen-Rendering in `main.js`**

(a) Import ergänzen: `import { createStageGroup } from './story/stageGroup.js';`

(b) Im Skelett-Rendering (`main.innerHTML = sections.map(…)`) aufeinanderfolgende Sektionen mit gleichem `stage` zu einem Wrapper zusammenfassen. Dazu VOR dem `map` die Sektionsliste gruppieren:

```js
    // Bühnen-Gruppen (Paket 10): aufeinanderfolgende Sektionen mit gleichem stage-Schlüssel
    // teilen sich eine sticky Grafik; alle anderen rendern wie bisher einzeln.
    const blocks = [];
    for (const sec of sections) {
      const last = blocks[blocks.length - 1];
      if (sec.stage && last?.stage === sec.stage) last.members.push(sec);
      else blocks.push(sec.stage ? { stage: sec.stage, members: [sec] } : { single: sec });
    }
```

(c) Im Template je Block: Einzel-Sektionen rendern EXAKT wie heute; Gruppen so:

```js
      return `
        <div class="stage-group" data-stage="${block.stage}">
          <div class="stage-sticky">
            <figure class="viz-frame viz-frame--scatter" data-view="scatter"
              aria-label="${block.members[0].aria?.scatter ?? ''}"></figure>
          </div>
          <div class="stage-steps">
            ${block.members.map((sec) => {
              const s = steps[sec.step];
              return `
              <div class="stage-step" id="step-${sec.step}" data-step="${sec.step}">
                <div class="section-text">
                  <p class="kicker">${sec.act}</p>
                  <h2>${s.title}</h2>
                  <p>${s.html}</p>
                  ${s.source ? `<p class="source">${s.source}</p>` : ''}
                  ${sec.controls ? '<div class="story-controls"></div>' : ''}
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>`;
```

(d) Mount: Der bestehende IntersectionObserver beobachtet `.viz-row` — zusätzlich `.stage-sticky` beobachten; beim ersten Schnitt (`const groupEl = e.target.closest('.stage-group')`, Block über `groupEl.dataset.stage` nachschlagen, `data-mounted`-Guard wie bei Einzel-Sektionen):

```js
      createStageGroup(groupEl, {
        ctx: { data, meta, bus: null, config: null },
        steps,
        members: block.members.map((sec) => ({
          sec, textEl: groupEl.querySelector(`#step-${sec.step}`),
        })),
        buildComponents: (el, groupCtx) => {
          const comps = [
            createScatter(el.querySelector('[data-view=scatter]'), groupCtx,
              { layers: ['axes', 'rug', 'trend', 'points', 'annotations'] }),
            createTooltip(document.body, groupCtx), // Step 2/3 geben hoverPoints frei
          ];
          const ctrl = el.querySelector('#step-3 .story-controls');
          if (ctrl) comps.push(createRevealToggles(ctrl, groupCtx));
          return comps;
        },
      });
```

(e) Die bestehende Text-Link-Verdrahtung (`.text-link[data-event-id]` / `[data-highlight]`) aus `mountSection` in eine benannte Funktion `wireTextLinks(sectionEl, store, data)` extrahieren und für BEIDE Pfade (Einzel-Sektion und jede Gruppen-Textkarte) aufrufen — identischer Code, ein Aufrufer mehr.

(f) Deep-Link `?step=N` funktioniert unverändert, weil die Gruppen-Textkarten die IDs `step-2`/`step-3` tragen. Die Kapitel-Nav (Task 2) findet sie ebenso.

- [ ] **Step 4: Sticky-Layout + weiche Klassen-Fades in `styles.css`**

```css
/* ----- Bühnen-Gruppe (Paket 10 Task 7): sticky Grafik, Textkarten scrollen darüber ----- */
.stage-group { position: relative; }
.stage-sticky {
  position: sticky; top: 0; height: 100vh;
  display: flex; align-items: center; justify-content: center;
  padding: 0 24px;
}
.stage-sticky .viz-frame--scatter { max-width: 720px; width: 100%; }
.stage-steps { position: relative; margin-top: -100vh; pointer-events: none; }
.stage-step {
  min-height: 100vh; display: flex; align-items: center;
  padding: 0 24px;
}
.stage-step .section-text {
  pointer-events: auto;
  background: rgba(255, 255, 255, 0.94);
  border-radius: 10px; padding: 22px 26px; max-width: 460px;
  margin: 0 auto 0 6vw;
  box-shadow: 0 2px 18px rgba(34, 48, 60, 0.10);
}
@media (max-width: 1099px) {
  /* schmale Viewports: kein Sticky-Overlay - lineare Folge wie im Rest der Seite */
  .stage-sticky { position: static; height: auto; }
  .stage-steps { margin-top: 0; }
  .stage-step { min-height: 0; padding: 6vh 24px; }
  .stage-step .section-text { margin: 0 auto; background: none; box-shadow: none; padding: 0; max-width: 700px; }
}

/* Weiche Zustandswechsel der Punkte/Trends beim Step-Patch (statt hartem Schnitt).
   fill/opacity sind CSS-animierbare SVG-Präsentationsattribute. */
.stage-group .point { transition: fill 0.5s, fill-opacity 0.5s, opacity 0.5s, stroke 0.5s; }
.stage-group .trend-line, .stage-group .trend-band, .stage-group .trend-median,
.stage-group .trend-annotation, .stage-group .connector { transition: opacity 0.5s; }
@media (prefers-reduced-motion: reduce) {
  .stage-group .point, .stage-group .trend-line, .stage-group .trend-band,
  .stage-group .trend-median, .stage-group .trend-annotation,
  .stage-group .connector { transition: none; }
}
```

Voraussetzung prüfen: `.story-hidden` muss über `opacity` wirken (nicht `display:none`), sonst greift die Transition nicht — falls aktuell `display`, auf `opacity: 0; pointer-events: none` umstellen (Selektoren um Z. 205–220 in `styles.css`).

- [ ] **Step 5: Verifizieren (der eigentliche Abnahmetest dieser Stufe)**

Run: `http://localhost:5173/?step=2`, dann langsam weiterscrollen bis „The line is almost flat".
Expected: Die Punktwolke bleibt STEHEN (kein Neuaufbau, kein zweites Einstaggern); beim Kartenwechsel faden Connectors aus, die Trendlinie wird präsenter, die Outlier glühen orange auf — alles über ~0,5 s weich. Rückwärtsscrollen kehrt den Zustand deterministisch um. Toggles in Karte 2 funktionieren. Mit Reduced Motion: gleiche Zustände, harte Wechsel. Unter 1100 px: lineare Folge ohne Sticky.

- [ ] **Step 6: Commit**

```bash
git add app/src/story/stageGroup.js app/src/story/sections.js app/src/main.js app/src/styles.css
git commit -m "Story: Buehnen-Gruppe expectation->reveal mit fliessenden Zustandswechseln (Paket 10 Task 7)"
```

---

### Task 8: Formations-Morph — „patterns → honesty": Scatter fliegt ins Unit-Raster

**Files:**
- Create: `app/src/story/formationLayer.js`
- Modify: `app/src/story/unitChart.js` (Layout-Mathematik exportieren)
- Modify: `app/src/story/sections.js` (Steps 5+6 in Gruppe `dots2`)
- Modify: `app/src/story/steps.js` (Formation je Step in `apply()`)
- Modify: `app/src/main.js` (Gruppen-Mount für `dots2`)
- Modify: `app/src/styles.css` (Unit-Klassen im Bühnen-Kontext)

**Interfaces:**
- Consumes: `createStageGroup` (Task 7), `makeXScale/makeYScale/makeRScale/scatterInner` aus `core/scales.js`, Unit-Layout aus `unitChart.js` (Step 1), `steps[5]/steps[6].apply()`.
- Produces: Store-Feld `formation: 'scatter' | 'unit'` (gesetzt von `apply()` der Steps 5/6); `createFormationLayer(svgRootG, layerCtx)` mit Standard-Vertrag `{ update(state, patch), destroy() }` — es besitzt die 99 Kreise (`data-key = id`) und interpoliert zwischen Formationen; `computeUnitLayout(events)` → `{ chrono(e), quality(e), cat(e), labels }`.

- [ ] **Step 1: Unit-Layout aus `unitChart.js` extrahieren**

Die Layout-Mathematik (Zeilen ~35–68: Sortierung, `chronoPos`, `qualityPos`, `cat`) in eine exportierte Funktion heben, die `unitChart.js` selbst weiterverwendet (kein Verhaltensunterschied):

```js
// unitChart.js - NEU exportiert, damit der Formations-Morph (Paket 10 Task 8)
// exakt dieselben Zielpositionen benutzt wie das eigenständige Unit Chart.
export function computeUnitLayout(rawEvents, { W = 860, H = 560 } = {}) {
  const events = [...rawEvents].sort((a, b) =>
    a.year - b.year || (a.month ?? 0) - (b.month ?? 0) || a.id.localeCompare(b.id));
  // …bestehende Konstanten CELL/COLS/COLS_A/COLS_B/GAP und die Berechnungen
  //   von chronoPos/qualityPos/cat unverändert hierher verschieben…
  return {
    events,
    cat,
    chrono: (e) => chronoPos(events.indexOf(e)),        // bzw. über Index-Map wie bisher
    quality: qualityPos,
    labels: { /* aOx/blockAW/aOy/bOx/blockBW/bOy + Texte wie bisher */ },
  };
}
```

`createUnitChart` ruft `computeUnitLayout(data.events)` auf und verhält sich identisch (Harness-Fixture `?mount=unitChart` als Regressionstest).

- [ ] **Step 2: `formationLayer.js` schreiben**

Ein Layer im Scatter-SVG (ersetzt in DIESER Gruppe den `points`-Layer), der alle 99 Events besitzt und zwischen Formationen morpht:

```js
// Formations-Layer (Paket 10 Task 8): besitzt ALLE 99 Sturm-Land-Kreise (data-key = id).
// formation 'scatter': 78 scatterbare Punkte an x/y der Skalen, 21 Ghosts unsichtbar (r 0).
// formation 'unit':    alle 99 fliegen ins Unit-Raster (chrono bzw. quality je unitSort),
//                      Ghosts faden ein - Scatter-Chrome (Achsen/Trend/Band) fadet aus.
// Objektkonstanz + eine benannte Transition 'formation' - der Kern von Strategie 4.
import { easeCubicInOut } from 'd3';
import { isScatterable } from '../core/filters.js';
import { computeUnitLayout } from './unitChart.js';

const DUR_FORMATION = 900;

export function createFormationLayer(gDots, layerCtx) {
  const { data, bus } = layerCtx;
  const unit = computeUnitLayout(data.events);
  const events = unit.events; // 99, chronologisch

  const circles = gDots.selectAll('circle').data(events, (d) => d.id).join('circle')
    .attr('class', (d) => `fm-dot unit-${unit.cat(d)}`)
    .attr('data-key', (d) => d.id);

  function scatterTarget(d) {
    const { x, y, r } = layerCtx.scales;
    if (!isScatterable(d)) return null; // Ghost: im Scatter unsichtbar
    return { cx: x(d.intensity_kt), cy: y.scale(y.value(d)), r: r(d.deaths ?? 0), o: 1 };
  }
  function unitTarget(d, sort) {
    const [cx, cy] = sort === 'quality' ? unit.quality(d) : unit.chrono(d);
    return { cx, cy, r: 13, o: 1 };
  }

  let last = null;
  function layout(state, animate) {
    const key = `${state.formation ?? 'scatter'}|${state.unitSort ?? 'chrono'}`;
    if (key === last) return;
    last = key;
    const isUnit = (state.formation ?? 'scatter') === 'unit';
    const target = (d) => (isUnit
      ? unitTarget(d, state.unitSort ?? 'chrono')
      : (scatterTarget(d) ?? { ...unitTarget(d, 'chrono'), r: 0, o: 0 }));
    const sel = animate && !state.reducedMotion
      ? circles.transition('formation').duration(DUR_FORMATION)
          .delay((_, i) => i * 3).ease(easeCubicInOut)
      : circles;
    sel
      .attr('cx', (d) => target(d).cx)
      .attr('cy', (d) => target(d).cy)
      .attr('r', (d) => target(d).r)
      .attr('opacity', (d) => target(d).o);
    gDots.classed('fm-unit', isUnit);
  }

  return {
    update(state, patch) {
      if (!patch) { layout(state, false); return; }
      if ('formation' in patch || 'unitSort' in patch) layout(state, true);
    },
    destroy() { gDots.selectAll('*').remove(); },
  };
}
```

(Hover-Tooltips der Unit-Formation: die `tipContent`-Logik aus `unitChart.js` analog Step 1 mit-exportieren und hier auf `mouseenter` verdrahten — Wortlaut identisch. Die Scatter-Formation dieser Gruppe braucht keine Punkt-Interaktion: Steps 5/6 geben `hoverPoints` nicht frei.)

- [ ] **Step 3: Formation in die Steps schreiben**

In `app/src/story/steps.js`: `apply()` von `patterns` erhält zusätzlich `formation: 'scatter'`, `apply()` von `honesty` `formation: 'unit'` sowie `unitSort: 'chrono'` (beides Top-Level neben `storyFx`, analog `mode`). `makeInitialState` in `core/initialState.js` um `formation: 'scatter'` ergänzen, damit das Feld immer definiert ist.

- [ ] **Step 4: Gruppe `dots2` verdrahten**

(a) `sections.js`: Steps 5 und 6 erhalten `stage: 'dots2'`; Step 6 behält `controls: 'unitSort'` (der Umschalter funktioniert unverändert über `state.unitSort` — jetzt gegen den Formations-Layer).

(b) `main.js`, Gruppen-Mount für `dots2`: wie Task 7, aber `buildComponents` komponiert den Scatter OHNE `points`-Layer plus den Formations-Layer im selben SVG (Imports oben ergänzen: `import { select } from 'd3';` und `import { createFormationLayer } from './story/formationLayer.js';`):

```js
        buildComponents: (el, groupCtx) => {
          const scatter = createScatter(el.querySelector('[data-view=scatter]'), groupCtx,
            { layers: ['axes', 'trend', 'annotations'] });
          const svgRoot = el.querySelector('[data-view=scatter] svg g'); // Wurzel-<g> des Scatters
          const gDots = select(svgRoot).append('g').attr('class', 'g-formation');
          const formation = createFormationLayer(gDots, { ...groupCtx, scales: scatter.scales });
          const comps = [scatter, formation];
          const ctrl = el.querySelector('#step-6 .story-controls');
          if (ctrl) comps.push(createUnitSortControl(ctrl, groupCtx));
          return comps;
        },
```

Dazu MUSS `createScatter` seine Skalen exponieren — in `scatter/index.js` dem Rückgabeobjekt `get scales() { return layerCtx.scales; }` hinzufügen (rückwärtskompatibel, kein Aufrufer bricht). Das SVG der Gruppe bekommt die Unit-Maße nicht — die Unit-Zielpositionen aus `computeUnitLayout` werden dafür mit `{ W: 640, H: 520 }` (Scatter-viewBox) berechnet, damit beide Formationen im selben Koordinatensystem liegen; `CELL/R` skalieren dort entsprechend (CELL 30, R 9 statt 42/13 — als Parameter von `computeUnitLayout` durchreichen).

(c) Scatter-Chrome-Fade: Achsen/Trend/Annotationen erhalten im Unit-Zustand `opacity: 0`:

```css
.stage-group[data-stage="dots2"] .g-axes, .stage-group[data-stage="dots2"] .g-trend,
.stage-group[data-stage="dots2"] .g-band, .stage-group[data-stage="dots2"] .g-annotations,
.stage-group[data-stage="dots2"] .g-rug { transition: opacity 0.6s; }
.stage-group[data-stage="dots2"]:has(.g-formation.fm-unit) .g-axes,
.stage-group[data-stage="dots2"]:has(.g-formation.fm-unit) .g-trend,
.stage-group[data-stage="dots2"]:has(.g-formation.fm-unit) .g-band,
.stage-group[data-stage="dots2"]:has(.g-formation.fm-unit) .g-annotations,
.stage-group[data-stage="dots2"]:has(.g-formation.fm-unit) .g-rug { opacity: 0; pointer-events: none; }
```

- [ ] **Step 5: Verifizieren (Flaggschiff-Abnahme)**

Run: `http://localhost:5173/?step=5`, scrollen zu „What the data hides", zurück und wieder vor; Unit-Sort-Umschalter testen; `?mount=unitChart` als Regressionstest der Extraktion.
Expected: Beim Kartenwechsel fliegen die 78 Punkte in ~0,9 s vom Scatter ins Raster (leicht gestaffelt), Achsen/Trend faden aus, 21 Ghost-Punkte wachsen aus r=0 ein; der Qualitäts-Umschalter sortiert das Raster wie bisher; Rückwärtsscrollen fliegt zurück in den Scatter (Ghosts schrumpfen weg); Reduced Motion springt; `?mount=unitChart` sieht aus wie vor dem Refactor; Konsole fehlerfrei; `npm run build` läuft und `dist/` bleibt < 1 MB.

- [ ] **Step 6: Commit**

```bash
git add app/src/story/formationLayer.js app/src/story/unitChart.js app/src/story/sections.js \
  app/src/story/steps.js app/src/core/initialState.js app/src/scatter/index.js app/src/main.js app/src/styles.css
git commit -m "Story: Formations-Morph Scatter->Unit-Raster als Buehnen-Gruppe (Paket 10 Task 8)"
```

---

## Definition of Done (Paket gesamt)

- Kein „Step N of 8" mehr; Akte + Kapiteltitel gliedern die Seite, Kapitel-Nav zeigt Position und springt (E3 erfüllt).
- Bogen: Hero fragt (verrät nichts), Heta trägt den menschlichen Einstieg mit Pro-Kopf-Maßstab, der R²-Reveal fällt erst in „The line is almost flat", die Coda vor der Exploration kehrt mit `stat:totalAffected` zum Menschen zurück — alle Zahlen via Refs.
- Akzent `#e4572e` markiert pro Sektion genau eine Kernaussage (+ transientes Feedback); Chrome ist blau; Farbwerte unverändert (CVD-Nachweis gilt).
- Beide Bühnen-Gruppen morphen fließend (Klassen-Fades Stufe 1, Positions-Morph Stufe 2), deterministisch in beide Scrollrichtungen, mit Reduced-Motion- und Schmal-Viewport-Fallback; `haroldMorph` unverändert dazwischen.
- `npm run build` läuft offline, `dist/` < 1 MB, Konsole fehlerfrei, `?step=N`-Deep-Links und `?story=off` funktionieren weiter.
