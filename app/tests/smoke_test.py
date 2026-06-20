"""
Playwright-Smoke-Test für den 5D-Bubble-Plot-Explorer.

Voraussetzung: App läuft lokal, z. B.:
    cd app && npm run build && npm run preview   # -> http://localhost:4173/Ocean-Data-Visualisation/

Dann:
    pip install playwright && python -m playwright install chromium
    python app/tests/smoke_test.py

Prüft: Bubbles rendern, Jahr-Slider aktualisiert, Tabelle füllt sich, Suche filtert, keine JS-Fehler.
"""
from playwright.sync_api import sync_playwright

URL = "http://localhost:4173/Ocean-Data-Visualisation/"


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 860})
        errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))

        page.goto(URL)
        page.wait_for_load_state("networkidle")
        page.wait_for_selector(".dots circle", timeout=8000)

        bubbles = page.locator(".dots circle").count()
        rows = page.locator(".data-table tbody tr").count()

        page.locator(".year-slider").evaluate(
            "el => { el.value = 1998; el.dispatchEvent(new Event('input', {bubbles:true})); }"
        )
        page.wait_for_timeout(900)
        year_after = page.locator(".year-out").inner_text()

        page.fill("#search", "fiji")
        page.wait_for_timeout(300)
        rows_search = page.locator(".data-table tbody tr").count()

        assert bubbles >= 18, f"zu wenige Bubbles: {bubbles}"
        assert rows >= 20, f"Tabelle nicht gefüllt: {rows}"
        assert year_after == "1998", f"Slider hat Jahr nicht geändert: {year_after}"
        assert rows_search == 1, f"Suche 'fiji' erwartet 1 Zeile, war {rows_search}"
        assert not errors, f"JS-Fehler: {errors}"

        print(f"OK — bubbles={bubbles}, rows={rows}, year→{year_after}, fiji-rows={rows_search}, errors=none")
        browser.close()


if __name__ == "__main__":
    main()
