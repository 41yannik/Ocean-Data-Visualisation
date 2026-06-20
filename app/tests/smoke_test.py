"""
Playwright-Smoke-Test für den 3D-Tag-Globus (Drag, Dichte, Zeit-Slider, Legende).

Voraussetzung: App läuft lokal, z. B.:
    cd app && npm run build && npm run preview   # -> http://localhost:4173/Ocean-Data-Visualisation/
Dann:
    pip install playwright && python -m playwright install chromium
    python app/tests/smoke_test.py

Prüft: Legende (o.r.) + Zeit-Controls vorhanden, Tag-Palette (blaue/grüne Pixel), Slider setzt Jahr,
Drag dreht den Globus (Canvas ändert sich), Hero-Step rendert, keine JS-Fehler. Screenshots je Station.
"""
from playwright.sync_api import sync_playwright

URL = "http://localhost:4173/Ocean-Data-Visualisation/"

SIGNATURE_JS = """() => {
  const c = document.getElementById('globe');
  const ctx = c.getContext('2d');
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let sig = 0, blue = 0, green = 0;
  for (let i = 0; i < d.length; i += 4000) {
    const r = d[i], g = d[i+1], b = d[i+2];
    sig = (sig + r * 3 + g * 5 + b * 7) % 1000000007;
    if (b > 120 && b > r && b > g) blue++;
    if (g > 90 && g > r && g > b) green++;
  }
  return { sig, blue, green };
}"""


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1366, "height": 900})
        errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))

        page.goto(URL)
        page.wait_for_load_state("networkidle")
        page.wait_for_selector("#globe")
        page.wait_for_timeout(1500)
        page.screenshot(path="/tmp/globe_step_0.png")

        legend_txt = page.locator("#legend").inner_text()
        has_slider = page.locator(".year-slider").count()
        has_play = page.locator(".play-btn").count()
        has_all = page.locator(".all-btn").count()

        sig0 = page.evaluate(SIGNATURE_JS)  # day palette (ocean blue + land green)

        # Slider → Jahr 2016
        page.locator(".year-slider").evaluate(
            "el => { el.value = 2016; el.dispatchEvent(new Event('input', {bubbles:true})); }"
        )
        page.wait_for_timeout(700)
        year_out = page.locator(".year-out").inner_text()

        # Drag rotiert den Globus (Maus = Pointer)
        page.mouse.move(700, 450); page.mouse.down()
        page.mouse.move(950, 480, steps=8); page.mouse.move(1050, 520, steps=8)
        page.mouse.up()
        page.wait_for_timeout(400)
        sig1 = page.evaluate(SIGNATURE_JS)

        # Hero-Step (Winston/Fiji)
        page.evaluate("() => document.querySelectorAll('.step')[1].scrollIntoView({block:'center'})")
        page.wait_for_timeout(3000)
        page.screenshot(path="/tmp/globe_step_1.png")
        figures = page.locator(".card .figure strong").count()

        # Outro für Density-Übersicht
        page.evaluate("() => document.querySelectorAll('.step')[4].scrollIntoView({block:'center'})")
        page.wait_for_timeout(2600)
        page.screenshot(path="/tmp/globe_step_4.png")

        assert "Storm strength" in legend_txt and "Storm density" in legend_txt, "Legende unvollständig"
        assert has_slider and has_play and has_all, "Zeit-Controls fehlen"
        assert sig0["blue"] > 40, f"zu wenig Ozeanblau ({sig0['blue']})"
        assert sig0["green"] > 8, f"zu wenig Landgrün ({sig0['green']})"
        assert year_out == "2016", f"Slider hat Jahr nicht gesetzt: {year_out}"
        assert sig0["sig"] != sig1["sig"], "Drag hat den Globus nicht gedreht"
        assert figures >= 3, f"erwartet >=3 Betroffenen-Zahlen, war {figures}"
        assert not errors, f"JS-Fehler: {errors}"

        print(f"OK — legend✓ controls✓ blue={sig0['blue']} green={sig0['green']} "
              f"year={year_out} drag✓ figures={figures} errors=none")
        browser.close()


if __name__ == "__main__":
    main()
