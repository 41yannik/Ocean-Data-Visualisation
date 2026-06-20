"""
Playwright-Smoke-Test für die 3D-Globus-Scrollytelling-Visualisierung.

Voraussetzung: App läuft lokal, z. B.:
    cd app && npm run build && npm run preview   # -> http://localhost:4173/Ocean-Data-Visualisation/

Dann:
    pip install playwright && python -m playwright install chromium
    python app/tests/smoke_test.py

Prüft: Globus-Canvas rendert (nicht leer), Scroll-Steps werden aktiv, Step-Karten zeigen
Betroffenen-Zahlen, keine JS-Fehler. Erzeugt Screenshots je Station.
"""
from playwright.sync_api import sync_playwright

URL = "http://localhost:4173/Ocean-Data-Visualisation/"


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1366, "height": 900})
        errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))

        page.goto(URL)
        page.wait_for_load_state("networkidle")
        page.wait_for_selector("#globe", timeout=8000)
        page.wait_for_timeout(1500)  # Globus zeichnen lassen

        steps = page.locator(".step").count()
        figures = page.locator(".card .figure strong").count()

        # Canvas darf nicht komplett leer sein (irgendetwas wurde gezeichnet)
        non_empty = page.evaluate(
            """() => {
                const c = document.getElementById('globe');
                const ctx = c.getContext('2d');
                const {width, height} = c;
                const d = ctx.getImageData(0, 0, width, height).data;
                let painted = 0;
                for (let i = 3; i < d.length; i += 4000) if (d[i] > 0) painted++;
                return painted;
            }"""
        )

        # durch die Steps scrollen und je Station screenshoten
        n = steps
        for i in range(n):
            page.evaluate(
                "(i) => document.querySelectorAll('.step')[i].scrollIntoView({behavior:'instant', block:'center'})",
                i,
            )
            page.wait_for_timeout(2600)  # Flug + Track-Animation abwarten
            page.screenshot(path=f"/tmp/globe_step_{i}.png")
        active_after = page.locator(".step.is-active").count()

        assert steps == 5, f"erwartet 5 Steps, war {steps}"
        assert figures >= 3, f"erwartet >=3 Betroffenen-Zahlen, war {figures}"
        assert non_empty > 50, f"Globus-Canvas wirkt leer (painted={non_empty})"
        assert active_after >= 1, "kein aktiver Step nach Scrollen"
        assert not errors, f"JS-Fehler: {errors}"

        print(f"OK — steps={steps}, figures={figures}, canvas_painted={non_empty}, errors=none")
        browser.close()


if __name__ == "__main__":
    main()
