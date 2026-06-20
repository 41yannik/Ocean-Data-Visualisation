// Zeit-/Saison-Steuerung: Play/Pause · „All years" · Jahr-Slider. null = Alle (nur Dichte).
export function createControls(container, { minYear, maxYear }, { onYear, onTogglePlay }) {
  container.innerHTML = "";

  const play = el(container, "button", "play-btn");
  play.type = "button"; play.textContent = "▶"; play.setAttribute("aria-label", "Play / pause years");

  const allBtn = el(container, "button", "all-btn");
  allBtn.type = "button"; allBtn.textContent = "All years";

  const slider = el(container, "input", "year-slider");
  Object.assign(slider, { type: "range", min: minYear, max: maxYear, step: 1, value: maxYear });
  slider.setAttribute("aria-label", "Season / year");

  const out = el(container, "output", "year-out");
  out.textContent = "All";

  play.addEventListener("click", () => onTogglePlay());
  allBtn.addEventListener("click", () => onYear(null));
  slider.addEventListener("input", () => onYear(+slider.value));

  function setYear(y) {
    const isAll = y == null;
    out.textContent = isAll ? "All" : String(y);
    allBtn.classList.toggle("is-active", isAll);
    slider.classList.toggle("is-muted", isAll);
    if (!isAll) slider.value = y;
  }
  function setPlaying(p) {
    play.classList.toggle("is-playing", p);
    play.textContent = p ? "⏸" : "▶";
  }
  return { setYear, setPlaying };
}

function el(parent, tag, cls) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  parent.appendChild(n);
  return n;
}
