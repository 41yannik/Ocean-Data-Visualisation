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
