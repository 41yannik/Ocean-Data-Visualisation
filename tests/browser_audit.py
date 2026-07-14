"""Browser smoke/audit checks for the local Track-to-Toll Vite app."""

import contextlib
import os
from pathlib import Path
import re
import signal
import subprocess
import time
from urllib.error import URLError
from urllib.request import urlopen

from playwright.sync_api import sync_playwright


BASE_URL = "http://127.0.0.1:5173"
VIEWPORTS = (
    {"name": "desktop", "width": 1440, "height": 900},
    {"name": "compact-desktop", "width": 1280, "height": 800},
    {"name": "mobile", "width": 390, "height": 844},
)
HARNESS_MOUNTS = (
    "tooltip", "detail", "toggle", "legend", "filters", "scatter.axes",
    "scatter.points", "scatter.trend", "scatter", "map.basemap", "map.tracks",
    "map.centroids", "map", "data", "sst", "story", "profileBars", "trend",
    "residualLab", "tollMap",
    "chartControls", "conclusionSynthesis", "chapterNav", "nav", "layout", "story.text", "map.smoke",
)


def server_is_ready():
    try:
        with urlopen(BASE_URL, timeout=1) as response:
            return response.status == 200
    except (OSError, URLError):
        return False


@contextlib.contextmanager
def vite_server():
    """Reuse an existing dev server, or own one for this test run."""
    if server_is_ready():
        yield
        return

    root = Path(__file__).resolve().parents[1]
    process = subprocess.Popen(
        ["npm", "run", "dev", "--", "--host", "127.0.0.1"],
        cwd=root / "app",
        stdout=subprocess.DEVNULL,
        stderr=subprocess.STDOUT,
        start_new_session=True,
    )
    try:
        for _ in range(100):
            if process.poll() is not None:
                raise RuntimeError("Vite exited before the browser audit started")
            if server_is_ready():
                break
            time.sleep(0.1)
        else:
            raise RuntimeError("Vite did not become ready within 10 seconds")
        yield
    finally:
        os.killpg(process.pid, signal.SIGTERM)
        process.wait(timeout=5)


def audit_page(browser, viewport):
    errors = []
    page = browser.new_page(viewport=viewport)
    page.on("pageerror", lambda exc: errors.append(f"pageerror: {exc}"))
    page.on(
        "console",
        lambda msg: errors.append(f"console.{msg.type}: {msg.text}")
        if msg.type == "error"
        else None,
    )
    page.goto(BASE_URL, wait_until="networkidle")

    assert page.locator("h1").inner_text() == "From Track to Toll"
    assert page.locator("#step-0").count() == 1
    assert page.locator("#step-8").count() == 1
    assert page.locator("#step-9").count() == 1
    assert page.locator("#methods").count() == 1
    assert page.locator(".chapter-nav .cn-dot").count() == 10

    duplicate_ids = page.evaluate(
        """() => [...document.querySelectorAll('[id]')]
          .map(el => el.id)
          .filter((id, i, ids) => ids.indexOf(id) !== i)"""
    )
    assert duplicate_ids == [], f"duplicate IDs: {duplicate_ids}"

    # Trigger every lazy-mounted story section and collect runtime errors.
    for target in page.locator("#sections > .section, #sections > .stage-group").all():
        target.scroll_into_view_if_needed()
        page.wait_for_timeout(250)

    # Die dots2-Morph-Choreografie ist nur in der Desktop-Sticky-Bühne aktiv; unter
    # 1400 px stellt das CSS dieselben Kapitel bewusst als lineare Folge dar.
    if viewport["name"] == "desktop":
        page.locator("#step-5").evaluate("el => el.scrollIntoView({block: 'center'})")
        page.wait_for_function("document.querySelectorAll('.g-formation circle.story-focus').length === 8")
        assert page.locator(".g-formation circle.story-focus").count() == 8
        assert page.locator(".fm-stems .residual-line").count() == 8
        page.locator("#step-6").evaluate("el => el.scrollIntoView({block: 'center'})")
        page.wait_for_function("document.querySelector('.g-formation.fm-residual') !== null")
        page.wait_for_timeout(1000)  # Formations-Morph 900 ms
        assert page.locator(".g-formation.fm-residual").count() == 1
        assert page.locator(".rr-chrome .rr-row-label").count() == 8
        above = page.locator(".g-formation circle.rr-above").count()
        below = page.locator(".g-formation circle.rr-below").count()
        assert above + below == 78, f"residual dots: {above} above + {below} below"
        assert above >= 30  # grobe Plausibilität der Divergenz-Färbung

    page.locator("#step-8").scroll_into_view_if_needed()
    page.wait_for_timeout(700)
    assert page.locator("#step-8[data-mounted=true]").count() == 1
    assert page.locator("#step-8 .conclusion-synthesis").count() == 1
    assert page.locator("#step-8 .viz-frame").count() == 1
    assert page.locator("#step-8 .conclusion-factors li").count() == 4
    assert page.locator("#step-8 .conclusion-answer__question").inner_text() == "Does wind speed explain who is affected?"
    assert page.locator("#step-8 .conclusion-answer h3").inner_text() == "No. Stronger winds do not automatically mean greater human impact."
    assert "wind alone is insufficient" in page.locator("#step-8 .conclusion-answer > p").last.inner_text()
    assert page.locator("#step-8 .conclusion-outro").inner_text() == "Wind measures the hazard. It does not measure who was exposed, prepared or able to recover."
    assert page.locator("#step-8 .factor-card__num").all_inner_texts() == ["01", "02", "03", "04"]
    card_tops = page.locator("#step-8 .factor-card").evaluate_all(
        "els => els.map(el => el.getBoundingClientRect().top)")
    if viewport["name"] in ("desktop", "compact-desktop"):
        assert max(card_tops) - min(card_tops) <= 2, "factor cards should sit in one row"
    else:
        assert card_tops == sorted(card_tops) and card_tops[0] < card_tops[-1]  # stacked on mobile
    assert page.locator("#step-8 .cs-rank-row").count() == 10
    assert page.locator("#step-8 .cs-summary, #step-8 .cs-reading, #step-8 .cs-legend").count() == 0
    assert page.locator("#step-8 .cs-controls, #step-8 select, #step-8 input").count() == 0
    assert page.locator("#step-8 .cs-focus-card, #step-8 .cs-ghost, #step-8 .cs-links").count() == 0

    if viewport["name"] == "desktop":
        layout = page.evaluate("""() => {
          const box = selector => document.querySelector(selector).getBoundingClientRect();
          const wind = box('#step-8 .cs-rank-list--wind');
          const impact = box('#step-8 .cs-rank-list--impact');
          const thermo = box('#step-8 .cs-ribbons');
          return {wind, impact, thermo};
        }""")
        list_gap = layout["impact"]["x"] - (layout["wind"]["x"] + layout["wind"]["width"])
        assert 18 <= list_gap <= 45, f"top-five lists too far apart: {list_gap}"
        assert abs(layout["wind"]["y"] - layout["impact"]["y"]) <= 2
        assert layout["thermo"]["x"] > layout["impact"]["x"] + layout["impact"]["width"]
        assert abs(layout["thermo"]["height"] - layout["wind"]["height"]) <= 55
        assert 0.9 <= layout["thermo"]["width"] / layout["wind"]["width"] <= 1.4

    thermometers = page.locator("#step-8 .cs-thermo-row")
    assert thermometers.count() == 78
    assert page.locator("#step-8 .cs-thermo-cell").count() == 156
    wind_values = thermometers.evaluate_all("els => els.map(el => Number(el.dataset.wind))")
    assert wind_values == sorted(wind_values, reverse=True)  # high at top, low at bottom
    assert page.locator('#step-8 [data-order="wind"]').get_attribute("aria-pressed") == "true"
    page.locator('#step-8 [data-order="impact"]').click()
    page.wait_for_timeout(100)
    impact_values = thermometers.evaluate_all("els => els.map(el => Number(el.dataset.impact))")
    assert impact_values == sorted(impact_values, reverse=True)
    assert page.locator('#step-8 [data-order="impact"]').get_attribute("aria-pressed") == "true"

    # No horizontal rules frame the comparison, lists, rows or thermometer.
    framed = page.locator("#step-8 .cs-board, #step-8 .cs-rank-list > header, #step-8 .cs-rank-row, #step-8 .cs-ribbons > header")
    assert framed.evaluate_all("els => els.every(el => ['0px', ''].includes(getComputedStyle(el).borderTopWidth) && ['0px', ''].includes(getComputedStyle(el).borderBottomWidth))")

    # Hovering one list name reveals the same record in both vertical thermometers.
    mawar = page.locator('#step-8 .cs-rank-row[data-record-id="2023-0300-GUM"]').first
    mawar.hover()
    page.wait_for_timeout(100)
    assert page.locator('#step-8 .cs-rank-row[data-record-id="2023-0300-GUM"].active').count() == 2
    assert page.locator('#step-8 .cs-thermo-row[data-record-id="2023-0300-GUM"].active').count() == 1
    page.locator("#step-8 .cs-head h3").hover()
    page.wait_for_timeout(100)
    assert page.locator("#step-8 .cs-thermo-row.active").count() == 0

    # A non-overlapping top-five record still resolves to one paired thermometer row.
    ssc = page.locator('#step-8 .cs-rank-row[data-record-id="2015-0339-MNP"][data-side="wind"]')
    ssc.hover()
    page.wait_for_timeout(100)
    assert page.locator('#step-8 .cs-thermo-row[data-record-id="2015-0339-MNP"].active').count() == 1
    page.evaluate("document.activeElement?.blur()")
    page.locator("#step-8 .cs-head h3").hover()
    page.wait_for_timeout(100)
    assert page.locator("#step-8 .cs-thermo-row.active").count() == 0

    # Clicking a rank row must NOT pin the highlight (hover-only interaction).
    mawar.click()
    page.locator("#step-8 .cs-head h3").hover()
    page.wait_for_timeout(100)
    assert page.locator("#step-8 [data-record-id].active").count() == 0
    page.evaluate("document.activeElement?.blur()")
    assert page.locator(".filter-fab").is_hidden()
    page.locator("#step-8").screenshot(path=f"/tmp/track-to-toll-conclusion-{viewport['name']}.png")

    page.locator("#step-9").scroll_into_view_if_needed()
    page.wait_for_timeout(700)
    assert page.locator("#step-9[data-mounted=true]").count() == 1
    assert page.locator("#step-9 [role=tab]").count() == 4
    assert page.locator("#step-9 [role=tab]").all_inner_texts() == [
        "Wind outliers", "Beyond the wind line", "Repeated impacts", "Track geography"
    ]
    # Every tab carries a live mini preview of its view (no text inside the minis).
    assert page.locator("#step-9 .evidence-questions .thumb-viz svg").count() == 4
    assert page.locator('#step-9 [data-thumb="outliers"] circle').count() > 0
    assert page.locator('#step-9 [data-thumb="residuals"] circle').count() > 0
    assert page.locator('#step-9 [data-thumb="countries"] circle').count() > 0
    assert page.locator('#step-9 [data-thumb="geography"] .thumb-track').count() > 0
    assert page.locator("#step-9 .thumb-viz text").count() == 0
    assert page.locator('#step-9 [data-panel="outliers"]').is_visible()
    assert page.locator('#step-9 [data-panel="countries"]').is_hidden()
    assert page.locator("#step-9 #evidence-filter-region").is_hidden()
    assert page.locator("#step-9 .evidence-refine").get_attribute("aria-expanded") == "false"
    assert page.locator("#step-9 #evidence-filter-summary").inner_text() == "All records"
    assert page.locator("#step-9 .tile-grid, #step-9 .tile-expand, #step-9 #tile-profile, #step-9 #tile-trend").count() == 0
    assert page.locator("#step-9 .outlier-layout svg").count() == 1
    assert page.locator(
        "#step-9 #country-recurrence svg, #step-9 #hot-zone-map svg, "
        "#step-9 #residual-lab svg, #step-9 #human-toll-map svg"
    ).count() == 0
    assert "Distance from the line" in page.locator("#selection-summary").inner_text()
    # Explore-lab scatter uses uniform dots (no size legend exists in the lab).
    assert page.locator("#step-9 .g-points .point").first.get_attribute("r") == "4"
    assert page.locator('#step-9 .g-points .point[r="4"]').count() == page.locator("#step-9 .g-points .point").count()

    explore_geometry = page.evaluate("""() => {
      const box = selector => document.querySelector(selector).getBoundingClientRect();
      const lab = box('#step-9 .evidence-lab');
      const switcher = box('#step-9 .evidence-switcher');
      const panel = box('#step-9 [data-panel="outliers"]');
      const chapterH2 = parseFloat(getComputedStyle(document.querySelector('#step-9 .section-text h2')).fontSize);
      const questionH3 = parseFloat(getComputedStyle(document.querySelector('#question-outliers')).fontSize);
      return {labWidth: lab.width, workspaceHeight: panel.bottom - switcher.top, chapterH2, questionH3};
    }""")
    assert explore_geometry["labWidth"] <= 1081
    assert explore_geometry["questionH3"] <= explore_geometry["chapterH2"]
    if viewport["name"] in ("desktop", "compact-desktop"):
        assert explore_geometry["workspaceHeight"] <= viewport["height"]

    # Roving tab focus and query-string deep link work without losing state.
    page.get_by_role("tab", name="Wind outliers", exact=True).focus()
    page.keyboard.press("ArrowRight")
    assert page.get_by_role("tab", name="Beyond the wind line", exact=True).get_attribute("aria-selected") == "true"
    assert "view=residuals" in page.url
    page.keyboard.press("ArrowRight")
    assert page.get_by_role("tab", name="Repeated impacts", exact=True).get_attribute("aria-selected") == "true"
    assert "view=countries" in page.url
    page.keyboard.press("ArrowLeft")
    page.keyboard.press("ArrowLeft")
    assert page.get_by_role("tab", name="Wind outliers", exact=True).get_attribute("aria-selected") == "true"
    page.locator('#step-9 [data-panel="outliers"]').screenshot(path=f"/tmp/evidence-outliers-{viewport['name']}.png")

    # "Beyond the wind line": one row per country, records placed by residual, medians marked.
    page.get_by_role("tab", name="Beyond the wind line", exact=True).click()
    assert page.locator('#step-9 [data-panel="residuals"]').is_visible()
    assert page.locator("#step-9 .rlab-row-label").count() == 19
    assert page.locator("#step-9 .rlab-mark").count() == 78
    assert (page.locator("#step-9 .rlab-mark.rlab-above").count()
            + page.locator("#step-9 .rlab-mark.rlab-below").count()) == 78
    assert page.locator("#step-9 .rlab-median").count() == 19
    page.locator('#step-9 [data-panel="residuals"]').screenshot(path=f"/tmp/evidence-residuals-{viewport['name']}.png")
    page.locator("#step-9 .evidence-refine").click()
    page.locator('#step-9 #filters input[name="country"][value="VUT"]').check()
    assert page.locator("#step-9 .rlab-row-label").count() == 1
    assert page.locator("#step-9 .rlab-mark").count() == 10
    assert page.locator("#step-9 .rlab-mark.rlab-above").count() == 8
    expected_row_count = "8/10" if viewport["name"] == "mobile" else "8 of 10 hit harder"
    assert expected_row_count in page.locator("#step-9 .rlab-row-count").text_content()
    page.locator("#step-9 .rlab-mark").first.click()
    assert page.locator("#detail.open").count() == 1
    page.locator("#detail .dp-close").click()
    page.locator('#step-9 [data-clear-filter="country"]').click()
    assert page.locator("#step-9 .rlab-row-label").count() == 19
    page.locator("#step-9 .evidence-refine").click()
    page.get_by_role("tab", name="Wind outliers", exact=True).click()

    page.locator("#step-9 .evidence-refine").click()
    assert page.locator("#step-9 #evidence-filter-region").is_visible()
    assert page.locator("#step-9 .evidence-refine").get_attribute("aria-expanded") == "true"
    thumb_dots_all = page.locator('#step-9 [data-thumb="countries"] circle').count()
    page.locator('#step-9 #filters input[name="country"][value="VUT"]').check()
    assert "Vanuatu" in page.locator("#step-9 #evidence-filter-summary").inner_text()
    # The tab previews follow the shared filters across all three views.
    assert page.locator('#step-9 [data-thumb="countries"] circle').count() < thumb_dots_all
    assert page.locator('#step-9 [data-thumb="geography"] .thumb-track.off').count() > 0
    page.locator('#step-9 [data-clear-filter="country"]').click()
    assert page.locator("#step-9 #evidence-filter-summary").inner_text() == "All records"
    page.locator('#step-9 #filters input[name="country"][value="VUT"]').check()
    page.get_by_role("tab", name="Repeated impacts", exact=True).click()
    assert page.locator('#step-9 [data-panel="countries"]').is_visible()
    assert page.locator("#step-9 .cr-row").count() == 1
    assert page.locator("#step-9 .cr-mark").count() > 0

    # Multi-select: a second country adds a chip and a row; its chip removes only itself.
    page.locator('#step-9 #filters input[name="country"][value="TON"]').check()
    assert page.locator('#step-9 .evidence-filter-chip[data-iso3]').count() == 2
    assert page.locator("#step-9 .cr-row").count() == 2
    page.locator('#step-9 .evidence-filter-chip[data-iso3="TON"]').click()
    assert page.locator("#step-9 .cr-row").count() == 1
    assert page.locator('#step-9 #filters input[name="country"][value="VUT"]').is_checked()

    # An impossible filter combination gets a directional empty state.
    page.locator('#step-9 #filters input[name="country"][value="VUT"]').uncheck()
    page.locator('#step-9 #filters input[name="country"][value="PYF"]').check()
    page.locator('#step-9 #filters select[name="cat"]').select_option("5")
    assert page.locator('#step-9 [data-panel="countries"] .evidence-empty').is_visible()
    assert page.locator('#step-9 [data-panel="countries"] .evidence-panel-content').is_hidden()
    page.locator('#step-9 [data-panel="countries"] [data-clear-filters]').click()
    assert page.locator("#step-9 .cr-row").count() == 20
    assert page.locator("#step-9 .cr-mark.missing").count() == 20
    assert page.locator("#step-9 #evidence-filter-summary").inner_text() == "All records"
    page.locator("#step-9 .evidence-refine").click()
    assert page.locator("#step-9 #evidence-filter-region").is_hidden()
    # Dot-fill ramp has a legend, the 2025 gap is annotated, and counts use singular grammar.
    legend_swatches = 12 if viewport["name"] != "mobile" else 10
    assert page.locator("#step-9 .cr-legend rect").count() == legend_swatches
    assert page.locator("#step-9 .cr-gap-note").count() == 1
    for text in page.locator("#step-9 .cr-count").all_text_contents():
        assert re.search(r"\b1 records\b", text) is None, f"plural glitch: {text}"
    assert "share" in page.locator("#step-9 .cr-legend").text_content()
    page.locator('#step-9 [data-mode="absolute"]').click()
    assert "people affected" in page.locator("#step-9 .cr-legend").text_content()
    page.locator('#step-9 [data-mode="perCapita"]').click()
    page.locator('#step-9 [data-panel="countries"]').screenshot(path=f"/tmp/evidence-countries-{viewport['name']}.png")

    # A matrix record opens the existing storm detail drawer.
    page.locator("#step-9 .cr-mark").first.click()
    assert page.locator("#detail.open").count() == 1
    page.locator("#detail .dp-close").click()

    page.get_by_role("tab", name="Track geography", exact=True).click()
    assert page.locator('#step-9 [data-panel="geography"]').is_visible()
    assert page.locator('#step-9 [data-geo-layer="tracks"]').is_visible()
    if viewport["name"] in ("desktop", "compact-desktop"):
        geography_height = page.evaluate("""() => {
          const switcher = document.querySelector('#step-9 .evidence-switcher').getBoundingClientRect();
          const panel = document.querySelector('#step-9 [data-panel="geography"]').getBoundingClientRect();
          return panel.bottom - switcher.top;
        }""")
        assert geography_height <= viewport["height"], f"geography workspace too tall: {geography_height}px"
    page.locator('#step-9 [data-panel="geography"]').screenshot(path=f"/tmp/evidence-tracks-{viewport['name']}.png")
    tick_labels = page.locator("#step-9 .mt-tick--major b").all()
    tick_boxes = [label.bounding_box() for label in tick_labels]
    for left, right in zip(tick_boxes, tick_boxes[1:]):
        assert left["x"] + left["width"] <= right["x"], "timeline labels overlap"
    # "Human toll" layer: one circle per country, sized by the impact measure.
    assert page.locator("#step-9 .evidence-metric").is_hidden()
    page.locator('#step-9 [data-map-layer="toll"]').click()
    assert page.locator('#step-9 [data-geo-layer="toll"]').is_visible()
    assert page.locator('#step-9 [data-geo-layer="tracks"]').is_hidden()
    assert page.locator("#step-9 .toll-circles circle").count() == 20
    assert page.locator("#step-9 .evidence-metric").is_visible()
    assert page.locator("#step-9 .hot-metric-control").is_hidden()
    fji_share_r = page.locator('#step-9 [data-iso3="FJI"]').get_attribute("r")
    page.locator('#step-9 [data-mode="absolute"]').click()
    assert page.locator('#step-9 [data-iso3="FJI"]').get_attribute("r") != fji_share_r
    page.locator('#step-9 [data-mode="perCapita"]').click()
    page.locator('#step-9 [data-panel="geography"]').screenshot(path=f"/tmp/evidence-toll-{viewport['name']}.png")
    page.locator('#step-9 [data-iso3="FJI"]').click()
    assert page.evaluate("window.store.get().selectedEventIds?.size ?? 0") == 21
    page.evaluate("window.store.set({ selectedEventIds: null })")

    page.locator('#step-9 [data-map-layer="hotzones"]').click()
    assert page.locator('#step-9 [data-geo-layer="hotzones"]').is_visible()
    assert page.locator('#step-9 [data-geo-layer="toll"]').is_hidden()
    assert page.locator("#step-9 .evidence-metric").is_hidden()
    assert page.locator("#step-9 .heat-cell").count() > 0
    page.locator('#step-9 [data-hot-metric="averageWind"]').click()
    assert page.locator('#step-9 [data-hot-metric="averageWind"]').get_attribute("aria-pressed") == "true"
    page.locator('#step-9 [data-panel="geography"]').screenshot(path=f"/tmp/evidence-hotzones-{viewport['name']}.png")
    page.locator("#step-9 .heat-cell").first.click()
    page.get_by_role("tab", name="Wind outliers", exact=True).click()
    assert "records across" in page.locator("#selection-summary").inner_text()
    assert page.evaluate("window.store.get().hotZoneMetric") == "averageWind"

    # Filters keep matching selections and prune records that leave the result set.
    assert page.evaluate("window.store.get().selectedEventIds?.size ?? 0") > 0
    page.locator("#step-9 .evidence-refine").click()
    page.locator('#step-9 #filters input[name="country"][value="PYF"]').check()
    page.locator('#step-9 #filters select[name="cat"]').select_option("5")
    assert page.evaluate("window.store.get().selectedEventIds") is None
    assert page.locator('#step-9 [data-panel="outliers"] .evidence-empty').is_visible()
    page.locator('#step-9 [data-panel="outliers"] [data-clear-filters]').click()
    page.locator("#step-9 .evidence-refine").click()

    body_widths = page.evaluate(
        "() => ({scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth})"
    )
    assert body_widths["scroll"] <= body_widths["client"] + 1, f"horizontal overflow: {body_widths}"
    assert errors == [], f"browser errors: {errors}"
    page.screenshot(path=f"/tmp/track-to-toll-{viewport['name']}.png", full_page=False)
    page.close()


def audit_routes(browser):
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    errors = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))

    page.goto(f"{BASE_URL}/?story=off", wait_until="networkidle")
    page.locator("#step-9").scroll_into_view_if_needed()
    page.wait_for_timeout(500)
    assert page.locator("#hero").is_hidden()
    assert page.locator("#step-8").count() == 0
    assert page.locator("#step-9[data-mounted=true]").count() == 1
    assert page.locator("#sections > .section").count() == 2  # explore + methods

    page.goto(f"{BASE_URL}/?step=3", wait_until="networkidle")
    page.wait_for_timeout(500)
    assert page.locator("#step-3[data-mounted=true]").count() == 1

    page.goto(f"{BASE_URL}/?step=8", wait_until="networkidle")
    page.wait_for_timeout(500)
    assert page.locator("#step-8[data-mounted=true]").count() == 1

    page.goto(f"{BASE_URL}/?step=9", wait_until="networkidle")
    page.wait_for_timeout(500)
    assert page.locator("#step-9[data-mounted=true]").count() == 1

    page.goto(f"{BASE_URL}/?step=9&view=countries", wait_until="networkidle")
    page.wait_for_timeout(500)
    assert page.locator('#step-9 [data-panel="countries"]').is_visible()
    assert page.locator('#step-9 [role=tab][data-explore-view="countries"]').get_attribute("aria-selected") == "true"

    page.goto(f"{BASE_URL}/?step=9&view=residuals", wait_until="networkidle")
    page.wait_for_timeout(500)
    assert page.locator('#step-9 [data-panel="residuals"]').is_visible()
    assert page.locator('#step-9 [role=tab][data-explore-view="residuals"]').get_attribute("aria-selected") == "true"
    assert page.locator("#step-9 .rlab-mark").count() == 78

    for mount in HARNESS_MOUNTS:
        page.goto(f"{BASE_URL}/?mount={mount}", wait_until="networkidle")
        assert page.locator(".error-banner").count() == 0, f"harness failed: {mount}"
        for button in page.locator("#hb button").all():
            button.click()
        assert page.locator(".hb-title").inner_text() == f"HARNESS · mount={mount}"

    page.goto(f"{BASE_URL}/?step=1e%2B21", wait_until="networkidle")
    assert page.locator(".error-banner").count() == 0

    page.goto(f"{BASE_URL}/?mount=%3Cimg%20src=x%20onerror=alert(1)%3E", wait_until="networkidle")
    assert page.locator("#hc img").count() == 0
    assert "<img src=x" in page.locator("#hc").inner_text()
    assert errors == [], f"route errors: {errors}"
    page.close()


def main():
    with vite_server():
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            for viewport in VIEWPORTS:
                audit_page(browser, viewport)
                print(f"browser audit ({viewport['name']}): OK")
            audit_routes(browser)
            print("browser routes/harness: OK")
            browser.close()


if __name__ == "__main__":
    main()
