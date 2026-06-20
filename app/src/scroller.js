// Scrollama: aktiver Scroll-Step → Callback (Globus fliegt zum Zielgebiet).
import scrollama from "scrollama";

export function createScroller(onStep) {
  const scroller = scrollama();
  scroller
    .setup({ step: ".step", offset: 0.6 })
    .onStepEnter(({ index, element }) => {
      element.classList.add("is-active");
      onStep(index);
    })
    .onStepExit(({ element }) => element.classList.remove("is-active"));

  window.addEventListener("resize", scroller.resize);
  return scroller;
}
