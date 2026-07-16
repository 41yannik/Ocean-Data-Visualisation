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
    theme_toggle = page.locator(".theme-toggle")
    light_button = theme_toggle.locator('[data-theme-choice="light"]')
    ocean_button = theme_toggle.locator('[data-theme-choice="ocean"]')
    assert theme_toggle.get_attribute("aria-label") == "Color theme"
    assert light_button.get_attribute("aria-pressed") == "true"
    assert ocean_button.get_attribute("aria-pressed") == "false"
    assert page.locator("html").get_attribute("data-theme") == "light"
    page.screenshot(path=f"/tmp/track-to-toll-theme-light-{viewport['name']}.png", full_page=False)

    # Der beschriftete Theme-Schalter ist per Pfeiltasten bedienbar, setzt alle
    # semantischen Tokens und überlebt einen Reload ohne auf Light zurückzufallen.
    ocean_button.click()
    assert page.locator("html").get_attribute("data-theme") == "ocean"
    assert ocean_button.get_attribute("aria-pressed") == "true"
    assert page.evaluate("localStorage.getItem('track-to-toll-theme')") == "ocean"
    page.wait_for_function("getComputedStyle(document.body).backgroundColor === 'rgb(7, 26, 43)'")
    ocean_button.focus()
    page.keyboard.press("ArrowLeft")
    assert page.locator("html").get_attribute("data-theme") == "light"
    page.keyboard.press("ArrowRight")
    assert page.locator("html").get_attribute("data-theme") == "ocean"
    page.reload(wait_until="networkidle")
    assert page.locator("html").get_attribute("data-theme") == "ocean"
    assert page.locator('.theme-toggle [data-theme-choice="ocean"]').get_attribute("aria-pressed") == "true"
    assert page.locator("#step-0").count() == 1
    assert page.locator("#step-9").count() == 1
    assert page.locator("#step-10").count() == 1
    assert page.locator("#methods").count() == 1
    assert page.locator(".chapter-nav .cn-dot").count() == 11

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

    # Heta comparison: map and the two right-hand counting views form one centered,
    # equal-height stage on desktop; the stacked mobile frames share one center line.
    page.locator("#step-2").scroll_into_view_if_needed()
    page.wait_for_timeout(700)
    heta_geometry = page.evaluate("""() => {
      const box = selector => document.querySelector(selector).getBoundingClientRect();
      const section = box('#step-2');
      const row = box('#step-2 .viz-row--dual');
      const map = box('#step-2 .viz-frame--map');
      const bars = box('#step-2 .viz-frame--bars');
      return {section, row, map, bars};
    }""")
    row_center = heta_geometry["row"]["x"] + heta_geometry["row"]["width"] / 2
    section_center = heta_geometry["section"]["x"] + heta_geometry["section"]["width"] / 2
    assert abs(row_center - section_center) <= 2, f"Heta stage off-center: {heta_geometry}"
    if viewport["name"] in ("desktop", "compact-desktop"):
        assert abs(heta_geometry["map"]["height"] - heta_geometry["bars"]["height"]) <= 4
        map_mid = heta_geometry["map"]["y"] + heta_geometry["map"]["height"] / 2
        bars_mid = heta_geometry["bars"]["y"] + heta_geometry["bars"]["height"] / 2
        assert abs(map_mid - bars_mid) <= 2
    else:
        map_mid = heta_geometry["map"]["x"] + heta_geometry["map"]["width"] / 2
        bars_mid = heta_geometry["bars"]["x"] + heta_geometry["bars"]["width"] / 2
        assert abs(map_mid - bars_mid) <= 2

    # Evidence scatter: a transient storm-group hover must disappear again even when
    # the pointer leaves the whole SVG quickly (the former sticky-tooltip regression).
    page.locator("#step-3").scroll_into_view_if_needed()
    page.wait_for_timeout(550)
    grouped_point_id = page.evaluate("""() => {
      const points = [...document.querySelectorAll('#step-3 .point')];
      const first = points.find(point => point.__data__?.sid
        && points.filter(other => other.__data__?.sid === point.__data__.sid).length > 1);
      return first ? points.filter(point => point.__data__?.sid === first.__data__.sid).at(-1)?.dataset.key : null;
    }""")
    assert grouped_point_id
    grouped_point = page.locator(f'#step-3 .point[data-key="{grouped_point_id}"]')
    grouped_point.hover()
    page.wait_for_timeout(80)
    assert page.locator(".tooltip.visible").count() == 1
    assert page.locator("#step-3 .storm-spine").evaluate(
        "el => getComputedStyle(el).display !== 'none'")
    page.mouse.move(4, 4)
    page.wait_for_timeout(80)
    assert page.locator(".tooltip.visible").count() == 0
    assert page.locator("#step-3 .storm-spine").evaluate(
        "el => getComputedStyle(el).display === 'none'")
    assert page.locator("#step-3 .point.hovered, #step-3 .point.hover-dim").count() == 0

    # Die dots2-Morph-Choreografie ist nur in der Desktop-Sticky-Bühne aktiv; unter
    # 1400 px stellt das CSS dieselben Kapitel bewusst als lineare Folge dar.
    if viewport["name"] == "desktop":
        page.locator("#step-5").evaluate("el => el.scrollIntoView({block: 'center'})")
        page.wait_for_function("document.querySelectorAll('.g-formation circle.story-focus').length === 8")
        assert page.locator(".g-formation circle.story-focus").count() == 8
        assert page.locator(".fm-stems .residual-line").count() == 8
        visible_radii = page.locator(".g-formation > circle.fm-dot").evaluate_all(
            "els => els.map(el => Number(el.getAttribute('r'))).filter(r => r > 0)")
        assert len(visible_radii) == 78
        assert set(visible_radii) == {6}, f"repeat-victim radii still encode deaths: {set(visible_radii)}"
        page.locator("#step-6").evaluate("el => el.scrollIntoView({block: 'center'})")
        page.wait_for_function("document.querySelector('.g-formation.fm-residual') !== null")
        page.wait_for_timeout(1000)  # Formations-Morph 900 ms
        assert page.locator(".g-formation.fm-residual").count() == 1
        assert page.locator(".rr-chrome:not(.rr-chrome--sub) .rr-row-label").count() == 8
        above = page.locator(".g-formation circle.rr-above").count()
        below = page.locator(".g-formation circle.rr-below").count()
        assert above + below == 78, f"residual dots: {above} above + {below} below"
        assert above >= 30  # grobe Plausibilität der Divergenz-Färbung
        # Subregion-Beat (Step 7): drei Zeilen mit Median-Tick, Divergenz bleibt 78.
        page.locator("#step-7").evaluate("el => el.scrollIntoView({block: 'center'})")
        page.wait_for_timeout(1200)  # Formations-Morph 900 ms + Chrome-Fade
        assert page.locator(".rr-chrome--sub .rr-row-label").count() == 3
        assert page.locator(".rr-chrome--sub .rr-median").count() == 3
        sub_above = page.locator(".g-formation circle.rr-above").count()
        sub_below = page.locator(".g-formation circle.rr-below").count()
        assert sub_above + sub_below == 78, f"subregion dots: {sub_above} + {sub_below}"

        # The completeness legend is a compact 2×2 key centered under, and no wider
        # than, the 99-dot matrix it explains.
        page.locator("#step-8").evaluate("el => el.scrollIntoView({block: 'center'})")
        page.wait_for_function("document.querySelector('.g-formation.fm-unit') !== null")
        page.wait_for_timeout(1100)
        assert page.locator(".g-formation > .uc-legend .uc-legend-item").count() == 4
        legend_geometry = page.evaluate("""() => {
          const legend = document.querySelector('.g-formation > .uc-legend').getBoundingClientRect();
          const dots = [...document.querySelectorAll('.g-formation > circle.fm-dot')]
            .map(el => el.getBoundingClientRect());
          const left = Math.min(...dots.map(box => box.left));
          const right = Math.max(...dots.map(box => box.right));
          const rows = new Set([...document.querySelectorAll('.g-formation > .uc-legend .uc-legend-item')]
            .map(el => Math.round(el.getBoundingClientRect().top)));
          return {legend, dots: {left, right, width: right - left}, rows: rows.size};
        }""")
        assert legend_geometry["rows"] == 2
        assert legend_geometry["legend"]["width"] <= legend_geometry["dots"]["width"] + 4, legend_geometry
        legend_mid = legend_geometry["legend"]["x"] + legend_geometry["legend"]["width"] / 2
        dots_mid = (legend_geometry["dots"]["left"] + legend_geometry["dots"]["right"]) / 2
        assert abs(legend_mid - dots_mid) <= 3

    page.locator("#step-9").scroll_into_view_if_needed()
    page.wait_for_timeout(700)
    assert page.locator("#step-9[data-mounted=true]").count() == 1
    assert page.locator("#step-9 .conclusion-synthesis").count() == 1
    assert page.locator("#step-9 .viz-frame").count() == 1
    assert page.locator("#step-9 .conclusion-factors li").count() == 4
    assert page.locator("#step-9 .conclusion-answer__question").inner_text() == "Does wind speed explain who is affected?"
    assert page.locator("#step-9 .conclusion-answer h3").inner_text() == "No. Stronger winds do not automatically mean greater human impact."
    assert "wind alone is insufficient" in page.locator("#step-9 .conclusion-answer > p").last.inner_text()
    assert page.locator("#step-9 .conclusion-outro").inner_text() == "Wind measures the hazard. It does not measure who was exposed, prepared or able to recover."
    assert page.locator("#step-9 .factor-card__num").all_inner_texts() == ["01", "02", "03", "04"]
    card_tops = page.locator("#step-9 .factor-card").evaluate_all(
        "els => els.map(el => el.getBoundingClientRect().top)")
    if viewport["name"] in ("desktop", "compact-desktop"):
        assert max(card_tops) - min(card_tops) <= 2, "factor cards should sit in one row"
    else:
        assert card_tops == sorted(card_tops) and card_tops[0] < card_tops[-1]  # stacked on mobile
    assert page.locator("#step-9 .cs-rank-row").count() == 10
    assert page.locator("#step-9 .cs-summary, #step-9 .cs-reading, #step-9 .cs-legend").count() == 0
    assert page.locator("#step-9 .cs-controls, #step-9 select, #step-9 input").count() == 0
    assert page.locator("#step-9 .cs-focus-card, #step-9 .cs-ghost, #step-9 .cs-links").count() == 0

    if viewport["name"] == "desktop":
        layout = page.evaluate("""() => {
          const box = selector => document.querySelector(selector).getBoundingClientRect();
          const wind = box('#step-9 .cs-rank-list--wind');
          const impact = box('#step-9 .cs-rank-list--impact');
          const thermo = box('#step-9 .cs-ribbons');
          return {wind, impact, thermo};
        }""")
        list_gap = layout["impact"]["x"] - (layout["wind"]["x"] + layout["wind"]["width"])
        assert 18 <= list_gap <= 45, f"top-five lists too far apart: {list_gap}"
        assert abs(layout["wind"]["y"] - layout["impact"]["y"]) <= 2
        assert layout["thermo"]["x"] > layout["impact"]["x"] + layout["impact"]["width"]
        assert abs(layout["thermo"]["height"] - layout["wind"]["height"]) <= 55
        assert 0.9 <= layout["thermo"]["width"] / layout["wind"]["width"] <= 1.4

    conclusion_alignment = page.evaluate("""() => {
      const box = selector => document.querySelector(selector).getBoundingClientRect();
      const section = box('#step-9');
      const intro = box('#step-9 > .section-text');
      const synthesis = box('#step-9 .conclusion-synthesis');
      const head = box('#step-9 .cs-head');
      const board = box('#step-9 .cs-board');
      return {
        section, intro, synthesis, head, board,
        introAlign: getComputedStyle(document.querySelector('#step-9 > .section-text')).textAlign,
        headAlign: getComputedStyle(document.querySelector('#step-9 .cs-head')).textAlign,
        listHeadAlign: getComputedStyle(document.querySelector('#step-9 .cs-rank-list > header')).textAlign,
      };
    }""")
    section_mid = conclusion_alignment["section"]["x"] + conclusion_alignment["section"]["width"] / 2
    for key in ("intro", "head", "board"):
        box = conclusion_alignment[key]
        assert abs(box["x"] + box["width"] / 2 - section_mid) <= 3, f"conclusion {key} off-center: {conclusion_alignment}"
    assert conclusion_alignment["introAlign"] == "center"
    assert conclusion_alignment["headAlign"] == "center"
    assert conclusion_alignment["listHeadAlign"] == "center"

    thermometers = page.locator("#step-9 .cs-thermo-row")
    assert thermometers.count() == 78
    assert page.locator("#step-9 .cs-thermo-cell").count() == 156
    wind_values = thermometers.evaluate_all("els => els.map(el => Number(el.dataset.wind))")
    assert wind_values == sorted(wind_values, reverse=True)  # high at top, low at bottom
    assert page.locator('#step-9 [data-order="wind"]').get_attribute("aria-pressed") == "true"
    page.locator('#step-9 [data-order="impact"]').click()
    page.wait_for_timeout(100)
    impact_values = thermometers.evaluate_all("els => els.map(el => Number(el.dataset.impact))")
    assert impact_values == sorted(impact_values, reverse=True)
    assert page.locator('#step-9 [data-order="impact"]').get_attribute("aria-pressed") == "true"

    # No horizontal rules frame the comparison, lists, rows or thermometer.
    framed = page.locator("#step-9 .cs-board, #step-9 .cs-rank-list > header, #step-9 .cs-rank-row, #step-9 .cs-ribbons > header")
    assert framed.evaluate_all("els => els.every(el => ['0px', ''].includes(getComputedStyle(el).borderTopWidth) && ['0px', ''].includes(getComputedStyle(el).borderBottomWidth))")

    # Hovering one list name reveals the same record in both vertical thermometers.
    mawar = page.locator('#step-9 .cs-rank-row[data-record-id="2023-0300-GUM"]').first
    mawar.hover()
    page.wait_for_timeout(100)
    assert page.locator('#step-9 .cs-rank-row[data-record-id="2023-0300-GUM"].active').count() == 2
    assert page.locator('#step-9 .cs-thermo-row[data-record-id="2023-0300-GUM"].active').count() == 1
    page.locator("#step-9 .cs-head h3").hover()
    page.wait_for_timeout(100)
    assert page.locator("#step-9 .cs-thermo-row.active").count() == 0

    # A non-overlapping top-five record still resolves to one paired thermometer row.
    ssc = page.locator('#step-9 .cs-rank-row[data-record-id="2015-0339-MNP"][data-side="wind"]')
    ssc.hover()
    page.wait_for_timeout(100)
    assert page.locator('#step-9 .cs-thermo-row[data-record-id="2015-0339-MNP"].active').count() == 1
    page.evaluate("document.activeElement?.blur()")
    page.locator("#step-9 .cs-head h3").hover()
    page.wait_for_timeout(100)
    assert page.locator("#step-9 .cs-thermo-row.active").count() == 0

    # Clicking a rank row must NOT pin the highlight (hover-only interaction).
    mawar.click()
    page.locator("#step-9 .cs-head h3").hover()
    page.wait_for_timeout(100)
    assert page.locator("#step-9 [data-record-id].active").count() == 0
    page.evaluate("document.activeElement?.blur()")

    # The paired ribbons are themselves readable: hover and keyboard focus expose
    # the storm, country, wind, affected share and the difference between both ranks.
    ribbon_pair = page.locator("#step-9 .cs-thermo-row").nth(9)
    ribbon_id = ribbon_pair.get_attribute("data-record-id")
    ribbon_pair.hover()
    page.wait_for_timeout(80)
    ribbon_detail = page.locator("#step-9 .cs-record-detail").inner_text()
    assert "storm-country pair" in ribbon_detail.lower()
    assert "kt wind" in ribbon_detail
    assert "reported affected" in ribbon_detail
    assert "Wind #" in ribbon_detail and "affected share #" in ribbon_detail
    assert page.locator(
        f'#step-9 .cs-thermo-row[data-record-id="{ribbon_id}"].active').count() == 1
    page.locator("#step-9 .cs-head h3").hover()
    page.wait_for_timeout(80)
    assert "Hover or focus any stripe pair" in page.locator("#step-9 .cs-record-detail").inner_text()
    assert page.locator("#step-9 .cs-thermo-row.active").count() == 0
    ribbon_pair.focus()
    page.keyboard.press("ArrowDown")
    assert page.locator("#step-9 .cs-thermo-row:focus").count() == 1
    assert page.locator("#step-9 .cs-thermo-row.active").count() == 1
    page.evaluate("document.activeElement?.blur()")
    page.locator("#step-9 .cs-head h3").hover()
    assert page.locator("#step-9 .cs-thermo-row.active").count() == 0
    assert page.locator(".filter-fab").is_hidden()
    page.locator("#step-9").screenshot(path=f"/tmp/track-to-toll-conclusion-{viewport['name']}.png")

    page.locator("#step-10").scroll_into_view_if_needed()
    page.wait_for_timeout(700)
    assert page.locator("#step-10[data-mounted=true]").count() == 1
    assert page.locator("#step-10 [role=tab]").count() == 4
    assert page.locator("#step-10 [role=tab]").all_inner_texts() == [
        "Wind outliers", "Beyond the wind line", "Repeated impacts", "Track geography"
    ]
    # Every tab carries a live mini preview of its view (no text inside the minis).
    assert page.locator("#step-10 .evidence-questions .thumb-viz svg").count() == 4
    assert page.locator('#step-10 [data-thumb="outliers"] circle').count() > 0
    assert page.locator('#step-10 [data-thumb="residuals"] circle').count() > 0
    assert page.locator('#step-10 [data-thumb="countries"] circle').count() > 0
    assert page.locator('#step-10 [data-thumb="geography"] .thumb-track').count() > 0
    assert page.locator("#step-10 .thumb-viz text").count() == 0
    assert page.locator('#step-10 [data-panel="outliers"]').is_visible()
    assert page.locator('#step-10 [data-panel="countries"]').is_hidden()
    assert page.locator("#step-10 #evidence-filter-region").is_hidden()
    assert page.locator("#step-10 .evidence-refine").get_attribute("aria-expanded") == "false"
    assert page.locator("#step-10 #evidence-filter-summary").inner_text() == "All records"
    assert page.locator("#step-10 .tile-grid, #step-10 .tile-expand, #step-10 #tile-profile, #step-10 #tile-trend").count() == 0
    assert page.locator("#step-10 .outlier-layout svg").count() == 1
    assert page.locator(
        "#step-10 #country-recurrence svg, #step-10 #hot-zone-map svg, "
        "#step-10 #residual-lab svg, #step-10 #human-toll-map svg"
    ).count() == 0
    assert "Distance from the line" in page.locator("#selection-summary").inner_text()
    # Explore-lab scatter uses uniform dots (no size legend exists in the lab).
    assert page.locator("#step-10 .g-points .point").first.get_attribute("r") == "4"
    assert page.locator('#step-10 .g-points .point[r="4"]').count() == page.locator("#step-10 .g-points .point").count()

    explore_geometry = page.evaluate("""() => {
      const box = selector => document.querySelector(selector).getBoundingClientRect();
      const lab = box('#step-10 .evidence-lab');
      const switcher = box('#step-10 .evidence-switcher');
      const panel = box('#step-10 [data-panel="outliers"]');
      const chapterH2 = parseFloat(getComputedStyle(document.querySelector('#step-10 .section-text h2')).fontSize);
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
    page.locator('#step-10 [data-panel="outliers"]').screenshot(path=f"/tmp/evidence-outliers-{viewport['name']}.png")

    # "Beyond the wind line": one row per country, records placed by residual, medians marked.
    page.get_by_role("tab", name="Beyond the wind line", exact=True).click()
    assert page.locator('#step-10 [data-panel="residuals"]').is_visible()
    assert page.locator("#step-10 .rlab-row-label").count() == 19
    assert page.locator("#step-10 .rlab-mark").count() == 78
    assert (page.locator("#step-10 .rlab-mark.rlab-above").count()
            + page.locator("#step-10 .rlab-mark.rlab-below").count()) == 78
    assert page.locator("#step-10 .rlab-median").count() == 19
    page.locator('#step-10 [data-panel="residuals"]').screenshot(path=f"/tmp/evidence-residuals-{viewport['name']}.png")
    page.locator("#step-10 .evidence-refine").click()
    page.locator('#step-10 #filters input[name="country"][value="VUT"]').check()
    assert page.locator("#step-10 .rlab-row-label").count() == 1
    assert page.locator("#step-10 .rlab-mark").count() == 10
    assert page.locator("#step-10 .rlab-mark.rlab-above").count() == 8
    expected_row_count = "8/10" if viewport["name"] == "mobile" else "8 of 10 hit harder"
    assert expected_row_count in page.locator("#step-10 .rlab-row-count").text_content()
    page.locator("#step-10 .rlab-mark").first.click()
    assert page.locator("#detail.open").count() == 1
    page.locator("#detail .dp-close").click()
    page.locator('#step-10 [data-clear-filter="country"]').click()
    assert page.locator("#step-10 .rlab-row-label").count() == 19
    page.locator("#step-10 .evidence-refine").click()
    page.get_by_role("tab", name="Wind outliers", exact=True).click()

    page.locator("#step-10 .evidence-refine").click()
    assert page.locator("#step-10 #evidence-filter-region").is_visible()
    assert page.locator("#step-10 .evidence-refine").get_attribute("aria-expanded") == "true"
    thumb_dots_all = page.locator('#step-10 [data-thumb="countries"] circle').count()
    page.locator('#step-10 #filters input[name="country"][value="VUT"]').check()
    assert "Vanuatu" in page.locator("#step-10 #evidence-filter-summary").inner_text()
    # The tab previews follow the shared filters across all three views.
    assert page.locator('#step-10 [data-thumb="countries"] circle').count() < thumb_dots_all
    assert page.locator('#step-10 [data-thumb="geography"] .thumb-track.off').count() > 0
    page.locator('#step-10 [data-clear-filter="country"]').click()
    assert page.locator("#step-10 #evidence-filter-summary").inner_text() == "All records"
    page.locator('#step-10 #filters input[name="country"][value="VUT"]').check()
    page.get_by_role("tab", name="Repeated impacts", exact=True).click()
    assert page.locator('#step-10 [data-panel="countries"]').is_visible()
    assert page.locator("#step-10 .cr-row").count() == 1
    assert page.locator("#step-10 .cr-mark").count() > 0

    # Multi-select: a second country adds a chip and a row; its chip removes only itself.
    page.locator('#step-10 #filters input[name="country"][value="TON"]').check()
    assert page.locator('#step-10 .evidence-filter-chip[data-iso3]').count() == 2
    assert page.locator("#step-10 .cr-row").count() == 2
    page.locator('#step-10 .evidence-filter-chip[data-iso3="TON"]').click()
    assert page.locator("#step-10 .cr-row").count() == 1
    assert page.locator('#step-10 #filters input[name="country"][value="VUT"]').is_checked()

    # An impossible filter combination gets a directional empty state.
    page.locator('#step-10 #filters input[name="country"][value="VUT"]').uncheck()
    page.locator('#step-10 #filters input[name="country"][value="PYF"]').check()
    page.locator('#step-10 #filters select[name="cat"]').select_option("5")
    assert page.locator('#step-10 [data-panel="countries"] .evidence-empty').is_visible()
    assert page.locator('#step-10 [data-panel="countries"] .evidence-panel-content').is_hidden()
    page.locator('#step-10 [data-panel="countries"] [data-clear-filters]').click()
    assert page.locator("#step-10 .cr-row").count() == 20
    assert page.locator("#step-10 .cr-mark.missing").count() == 20
    assert page.locator("#step-10 #evidence-filter-summary").inner_text() == "All records"
    page.locator("#step-10 .evidence-refine").click()
    assert page.locator("#step-10 #evidence-filter-region").is_hidden()
    # Dot-fill ramp has a legend, the 2025 gap is annotated, and counts use singular grammar.
    legend_swatches = 12 if viewport["name"] != "mobile" else 10
    assert page.locator("#step-10 .cr-legend rect").count() == legend_swatches
    assert page.locator("#step-10 .cr-gap-note").count() == 1
    for text in page.locator("#step-10 .cr-count").all_text_contents():
        assert re.search(r"\b1 records\b", text) is None, f"plural glitch: {text}"
    assert "share" in page.locator("#step-10 .cr-legend").text_content()
    ocean_country_fill = page.locator("#step-10 .cr-mark").first.get_attribute("style")
    page.locator('.theme-toggle [data-theme-choice="light"]').click()
    light_country_fill = page.locator("#step-10 .cr-mark").first.get_attribute("style")
    assert light_country_fill != ocean_country_fill, "country color scale did not react to themechange"
    page.locator('.theme-toggle [data-theme-choice="ocean"]').click()
    page.locator('#step-10 [data-mode="absolute"]').click()
    assert "people affected" in page.locator("#step-10 .cr-legend").text_content()
    page.locator('#step-10 [data-mode="perCapita"]').click()
    page.locator('#step-10 [data-panel="countries"]').screenshot(path=f"/tmp/evidence-countries-{viewport['name']}.png")

    # A matrix record opens the existing storm detail drawer.
    page.locator("#step-10 .cr-mark").first.click()
    assert page.locator("#detail.open").count() == 1
    page.locator("#detail .dp-close").click()

    page.get_by_role("tab", name="Track geography", exact=True).click()
    assert page.locator('#step-10 [data-panel="geography"]').is_visible()
    assert page.locator('#step-10 [data-geo-layer="tracks"]').is_visible()
    if viewport["name"] in ("desktop", "compact-desktop"):
        geography_height = page.evaluate("""() => {
          const switcher = document.querySelector('#step-10 .evidence-switcher').getBoundingClientRect();
          const panel = document.querySelector('#step-10 [data-panel="geography"]').getBoundingClientRect();
          return panel.bottom - switcher.top;
        }""")
        assert geography_height <= viewport["height"], f"geography workspace too tall: {geography_height}px"
    page.locator('#step-10 [data-panel="geography"]').screenshot(path=f"/tmp/evidence-tracks-{viewport['name']}.png")
    tick_labels = page.locator("#step-10 .mt-tick--major b").all()
    tick_boxes = [label.bounding_box() for label in tick_labels]
    for left, right in zip(tick_boxes, tick_boxes[1:]):
        assert left["x"] + left["width"] <= right["x"], "timeline labels overlap"

    # A selected/playing year is a hard visual focus: matching tracks stay vivid and
    # interactive, every other year becomes near-invisible and cannot intercept clicks.
    timeline = page.locator("#step-10 .map-timeline")
    timeline.locator(".mt-range").fill("2002")
    page.wait_for_timeout(420)  # 350 ms track crossfade + one paint
    assert timeline.locator(".mt-readout").inner_text().startswith("2002 · ")
    active_tracks = page.locator("#step-10 .geo-stage .track.year-active")
    context_tracks = page.locator("#step-10 .geo-stage .track.year-context")
    assert active_tracks.count() > 0
    assert context_tracks.count() > active_tracks.count()
    track_focus_styles = page.evaluate("""() => ({
      activeOpacity: Number(getComputedStyle(document.querySelector('#step-10 .geo-stage .track.year-active')).strokeOpacity),
      contextOpacity: Number(getComputedStyle(document.querySelector('#step-10 .geo-stage .track.year-context')).strokeOpacity),
      activePointer: getComputedStyle(document.querySelector('#step-10 .geo-stage .track.year-active')).pointerEvents,
      contextPointer: getComputedStyle(document.querySelector('#step-10 .geo-stage .track.year-context')).pointerEvents,
    })""")
    assert track_focus_styles["activeOpacity"] >= .95
    assert track_focus_styles["contextOpacity"] <= .02
    assert track_focus_styles["activePointer"] == "stroke"
    assert track_focus_styles["contextPointer"] == "none"

    timeline.locator(".mt-play").click()
    page.wait_for_timeout(780)
    assert page.evaluate("window.store.get().activeYear") == 2003
    assert timeline.locator(".mt-play").get_attribute("aria-pressed") == "true"
    timeline.locator(".mt-play").click()
    assert page.evaluate("window.store.get().playing") is False

    # Opening one of the current year's tracks fills the drawer with a larger track,
    # four summary values, the country table, a comparison profile and a reading note.
    active_tracks = page.locator("#step-10 .geo-stage .track.year-active")
    assert active_tracks.count() > 0
    # SVG paths have sparse bounding boxes; dispatch on the actual stroke element so
    # the test does not accidentally click empty map space inside that box.
    active_tracks.first.dispatch_event("click")
    assert page.locator("#detail.open").count() == 1
    assert page.locator("#detail .dp-stats > div").count() == 4
    assert page.locator("#detail .dp-map svg").count() == 1
    assert page.locator("#detail .dp-records tbody tr").count() > 0
    assert page.locator("#detail .dp-country-profile li").count() > 0
    assert "storm-country pair" in page.locator("#detail .dp-reading").inner_text().lower()
    drawer_geometry = page.evaluate("""() => {
      const drawer = document.querySelector('#detail').getBoundingClientRect();
      const table = document.querySelector('#detail .dp-records').getBoundingClientRect();
      const reading = document.querySelector('#detail .dp-reading').getBoundingClientRect();
      return {drawer, table, reading};
    }""")
    expected_drawer_width = 470 if viewport["name"] != "mobile" else 350
    assert drawer_geometry["drawer"]["width"] >= expected_drawer_width
    assert drawer_geometry["reading"]["top"] > drawer_geometry["table"]["bottom"]
    page.locator("#detail .dp-close").click()
    timeline.locator(".mt-all").click()
    assert page.locator("#step-10 .geo-stage .track.year-active, #step-10 .geo-stage .track.year-context").count() == 0

    # "Human toll" layer: one circle per country, sized by the impact measure.
    assert page.locator("#step-10 .evidence-metric").is_hidden()
    page.locator('#step-10 [data-map-layer="toll"]').click()
    assert page.locator('#step-10 [data-geo-layer="toll"]').is_visible()
    assert page.locator('#step-10 [data-geo-layer="tracks"]').is_hidden()
    toll_circle_count = page.locator("#step-10 .toll-circles circle").count()
    assert toll_circle_count == 20, f"toll circles after theme switches: {toll_circle_count}"
    assert page.locator("#step-10 .evidence-metric").is_visible()
    assert page.locator("#step-10 .hot-metric-control").is_hidden()
    fji_share_r = page.locator('#step-10 [data-iso3="FJI"]').get_attribute("r")
    page.locator('#step-10 [data-mode="absolute"]').click()
    assert page.locator('#step-10 [data-iso3="FJI"]').get_attribute("r") != fji_share_r
    page.locator('#step-10 [data-mode="perCapita"]').click()
    page.locator('#step-10 [data-panel="geography"]').screenshot(path=f"/tmp/evidence-toll-{viewport['name']}.png")
    page.locator('#step-10 [data-iso3="FJI"]').click()
    assert page.evaluate("window.store.get().selectedEventIds?.size ?? 0") == 21
    page.evaluate("window.store.set({ selectedEventIds: null })")

    page.locator('#step-10 [data-map-layer="hotzones"]').click()
    assert page.locator('#step-10 [data-geo-layer="hotzones"]').is_visible()
    assert page.locator('#step-10 [data-geo-layer="toll"]').is_hidden()
    assert page.locator("#step-10 .evidence-metric").is_hidden()
    assert page.locator("#step-10 .heat-cell").count() > 0
    page.locator('#step-10 [data-hot-metric="averageWind"]').click()
    assert page.locator('#step-10 [data-hot-metric="averageWind"]').get_attribute("aria-pressed") == "true"
    ocean_heat_fill = page.locator("#step-10 .heat-cell").first.get_attribute("fill")
    page.locator('.theme-toggle [data-theme-choice="light"]').click()
    light_heat_fill = page.locator("#step-10 .heat-cell").first.get_attribute("fill")
    assert light_heat_fill != ocean_heat_fill, "hot-zone color scale did not react to themechange"
    page.locator('.theme-toggle [data-theme-choice="ocean"]').click()
    page.locator('#step-10 [data-panel="geography"]').screenshot(path=f"/tmp/evidence-hotzones-{viewport['name']}.png")
    page.locator("#step-10 .heat-cell").first.click()
    page.get_by_role("tab", name="Wind outliers", exact=True).click()
    assert "records across" in page.locator("#selection-summary").inner_text()
    assert page.evaluate("window.store.get().hotZoneMetric") == "averageWind"

    # Filters keep matching selections and prune records that leave the result set.
    assert page.evaluate("window.store.get().selectedEventIds?.size ?? 0") > 0
    page.locator("#step-10 .evidence-refine").click()
    page.locator('#step-10 #filters input[name="country"][value="PYF"]').check()
    page.locator('#step-10 #filters select[name="cat"]').select_option("5")
    assert page.evaluate("window.store.get().selectedEventIds") is None
    assert page.locator('#step-10 [data-panel="outliers"] .evidence-empty').is_visible()
    page.locator('#step-10 [data-panel="outliers"] [data-clear-filters]').click()
    page.locator("#step-10 .evidence-refine").click()

    # Kompakter Data-&-Methods-Abschluss: zunächst nur eine Zeile; der erste Klick
    # öffnet den Überblick, technische Ebenen bleiben unabhängig geschlossen.
    page.locator("#methods").scroll_into_view_if_needed()
    page.wait_for_timeout(250)
    assert page.locator("#methods-root > summary").text_content().strip() == "Data & methods"
    assert page.locator("#methods-root").get_attribute("open") is None
    assert page.locator("#methods .methods-facts").is_hidden()
    page.locator("#methods-root > summary").click()
    assert page.locator("#methods-root").get_attribute("open") is not None
    assert page.locator("#methods .methods-facts").is_visible()
    assert page.locator("#methods .methods-facts > div").count() == 4
    assert page.locator("#methods .methods-block").count() == 5
    assert page.locator("#methods-sources").get_attribute("open") is None
    page.locator("#methods-sources > summary").click()
    assert page.locator("#methods .methods-source").count() == 7
    assert page.locator("#methods .methods-downloads a").count() == 5
    assert page.locator("#methods .methods-publication").inner_text().startswith("Publication gate active")
    page.locator("#methods-visuals > summary").click()
    assert page.locator("#methods .method-card").count() == 11
    page.locator("#step-0 .source-method-link").click()
    page.wait_for_timeout(300)
    assert "#method-sst" in page.url
    assert page.locator("#methods-visuals").get_attribute("open") is not None
    assert page.locator("#method-sst").evaluate("el => document.activeElement === el")
    page.locator("#methods").screenshot(path=f"/tmp/data-methods-{viewport['name']}.png")

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
    page.locator("#step-10").scroll_into_view_if_needed()
    page.wait_for_timeout(500)
    assert page.locator("#hero").is_hidden()
    assert page.locator("#step-9").count() == 0
    assert page.locator("#step-10[data-mounted=true]").count() == 1
    assert page.locator("#sections > .section").count() == 2  # explore + methods

    page.goto(f"{BASE_URL}/?step=3", wait_until="networkidle")
    page.wait_for_timeout(500)
    assert page.locator("#step-3[data-mounted=true]").count() == 1

    page.goto(f"{BASE_URL}/?step=9", wait_until="networkidle")
    page.wait_for_timeout(500)
    assert page.locator("#step-9[data-mounted=true]").count() == 1

    page.goto(f"{BASE_URL}/?step=10", wait_until="networkidle")
    page.wait_for_timeout(500)
    assert page.locator("#step-10[data-mounted=true]").count() == 1

    page.goto(f"{BASE_URL}/?step=10&view=countries", wait_until="networkidle")
    page.wait_for_timeout(500)
    assert page.locator('#step-10 [data-panel="countries"]').is_visible()
    assert page.locator('#step-10 [role=tab][data-explore-view="countries"]').get_attribute("aria-selected") == "true"

    page.goto(f"{BASE_URL}/?step=10&view=residuals", wait_until="networkidle")
    page.wait_for_timeout(500)
    assert page.locator('#step-10 [data-panel="residuals"]').is_visible()
    assert page.locator('#step-10 [role=tab][data-explore-view="residuals"]').get_attribute("aria-selected") == "true"
    assert page.locator("#step-10 .rlab-mark").count() == 78

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
