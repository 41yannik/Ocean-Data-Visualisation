#!/usr/bin/env python3
"""Cross-browser production-preview audit for Track to Toll."""

from __future__ import annotations

import contextlib
import json
import os
from pathlib import Path
import signal
import subprocess
import time
from urllib.error import URLError
from urllib.request import urlopen

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / "app"
OUT = ROOT / "docs" / "audit" / "evidence" / "browser-matrix.json"
BASE_URL = os.environ.get("AUDIT_BASE_URL", "http://127.0.0.1:4173")
VIEWPORTS = (
    {"name": "wide", "width": 2048, "height": 1152},
    {"name": "desktop", "width": 1440, "height": 900},
    {"name": "tablet", "width": 1024, "height": 768},
    {"name": "mobile", "width": 390, "height": 844},
    # 1440×900 physical pixels at 200% browser zoom expose about this CSS viewport.
    {"name": "zoom200", "width": 720, "height": 450, "zoom_emulation": "200% of 1440×900"},
)


def ready():
    try:
        with urlopen(BASE_URL, timeout=1) as response:
            return response.status == 200
    except (OSError, URLError):
        return False


@contextlib.contextmanager
def preview_server():
    if ready():
        yield
        return
    process = subprocess.Popen(
        ["npm", "run", "preview", "--", "--host", "127.0.0.1", "--port", "4173"],
        cwd=APP, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT, start_new_session=True,
    )
    try:
        for _ in range(100):
            if process.poll() is not None:
                raise RuntimeError("Vite preview exited before the audit")
            if ready():
                break
            time.sleep(0.1)
        else:
            raise RuntimeError("Vite preview did not become ready")
        yield
    finally:
        os.killpg(process.pid, signal.SIGTERM)
        process.wait(timeout=5)


PERF_INIT = """
window.__auditPerf = {lcp: 0, cls: 0, longTasks: [], events: []};
try { new PerformanceObserver(list => { for (const e of list.getEntries()) window.__auditPerf.lcp = e.startTime; })
  .observe({type:'largest-contentful-paint', buffered:true}); } catch (_) {}
try { new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__auditPerf.cls += e.value; })
  .observe({type:'layout-shift', buffered:true}); } catch (_) {}
try { new PerformanceObserver(list => { for (const e of list.getEntries()) window.__auditPerf.longTasks.push(e.duration); })
  .observe({type:'longtask', buffered:true}); } catch (_) {}
try { new PerformanceObserver(list => { for (const e of list.getEntries()) if (e.interactionId) window.__auditPerf.events.push(e.duration); })
  .observe({type:'event', buffered:true, durationThreshold:16}); } catch (_) {}
"""


def rounded_box(box):
    return {key: round(float(box[key]), 2) for key in ("x", "y", "width", "height")}


def audit_page(browser_type, browser_name, viewport):
    browser = browser_type.launch(headless=True)
    context = browser.new_context(
        viewport={"width": viewport["width"], "height": viewport["height"]},
        reduced_motion="reduce",
    )
    page = context.new_page()
    page.add_init_script(PERF_INIT)
    errors = []
    page.on("pageerror", lambda error: errors.append(f"pageerror: {error}"))
    page.on("console", lambda message: errors.append(f"console.{message.type}: {message.text}")
            if message.type == "error" else None)
    page.goto(BASE_URL, wait_until="networkidle")

    assert page.locator("h1").inner_text() == "From Track to Toll"
    assert page.locator("#sections > .section, #sections > .stage-group").count() > 0
    assert page.locator(".chapter-nav .cn-dot").count() == 11
    assert page.locator("#methods .method-card").count() == 11
    assert page.locator("#step-9").count() == 1
    assert page.locator("#step-10").count() == 1
    assert page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1")

    # Both themes must be operative and retain their semantic pressed state.
    for theme in ("ocean", "light"):
        choice = page.locator(f'[data-theme-choice="{theme}"]')
        choice.click()
        assert page.locator("html").get_attribute("data-theme") == theme
        assert choice.get_attribute("aria-pressed") == "true"

    page.locator("#step-9").scroll_into_view_if_needed()
    page.locator("#step-9 .viz-row").scroll_into_view_if_needed()
    page.wait_for_function("document.querySelector('#step-9')?.dataset.mounted === 'true'")
    page.wait_for_timeout(250)
    assert page.locator("#step-9 .cs-rank-row").count() == 10
    assert page.locator("#step-9 .cs-thermo-row").count() == 71
    assert page.locator("#step-9 .cs-record-detail").get_attribute("aria-live") == "polite"
    assert page.locator("#step-9 [role=listbox]").get_attribute("aria-label")
    assert page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1")

    geometry = page.evaluate("""() => {
      const box = selector => document.querySelector(selector).getBoundingClientRect();
      return {lists: box('#step-9 .cs-lists'), ribbons: box('#step-9 .cs-ribbons'),
        detail: box('#step-9 .cs-record-detail')};
    }""")
    if viewport["width"] > 1100:
        assert abs(geometry["lists"]["width"] - geometry["ribbons"]["width"]) <= 3
        assert abs(geometry["lists"]["y"] - geometry["ribbons"]["y"]) <= 2
        assert abs(geometry["lists"]["height"] - geometry["ribbons"]["height"]) <= 2
    else:
        assert geometry["ribbons"]["y"] >= geometry["lists"]["y"] + geometry["lists"]["height"]

    # Repeated hover/focus must not change any geometry (the former wobble regression).
    row = page.locator("#step-9 .cs-thermo-row").nth(20)
    before_row = row.bounding_box()
    before_ribbons = page.locator("#step-9 .cs-ribbons").bounding_box()
    before_detail = page.locator("#step-9 .cs-record-detail").bounding_box()
    page.evaluate("""() => {
      const row = document.querySelectorAll('#step-9 .cs-thermo-row')[20];
      const neutral = document.querySelector('#step-9 .cs-ribbons h4');
      for (let i = 0; i < 8; i += 1) {
        row.dispatchEvent(new PointerEvent('pointerover', {bubbles:true, relatedTarget:neutral}));
        row.dispatchEvent(new PointerEvent('pointerout', {bubbles:true, relatedTarget:neutral}));
      }
    }""")
    after_row = row.bounding_box()
    after_ribbons = page.locator("#step-9 .cs-ribbons").bounding_box()
    after_detail = page.locator("#step-9 .cs-record-detail").bounding_box()
    for before, after in ((before_row, after_row), (before_ribbons, after_ribbons), (before_detail, after_detail)):
        assert max(abs(before[key] - after[key]) for key in ("x", "y", "width", "height")) <= 0.5

    row.focus()
    page.keyboard.press("ArrowDown")
    assert page.locator("#step-9 .cs-thermo-row:focus").count() == 1
    assert page.locator("#step-9 .cs-thermo-row.active").count() == 1
    assert page.locator("#step-9 .cs-rank-row").first.evaluate(
        "el => getComputedStyle(el).transitionDuration") in ("0s", "")

    # Exercise an actual interaction for Event Timing / INP where supported.
    page.locator('#step-9 [data-order="impact"]').click()
    page.wait_for_timeout(150)
    perf = page.evaluate("""() => {
      const nav = performance.getEntriesByType('navigation')[0];
      return {...window.__auditPerf, domContentLoaded: nav?.domContentLoadedEventEnd ?? null,
        load: nav?.loadEventEnd ?? null};
    }""")
    if browser_name == "chromium" and viewport["name"] == "desktop":
        assert perf["lcp"] <= 2500, perf
        assert perf["cls"] <= 0.1, perf
        assert max(perf["events"] or [0]) <= 200, perf
        assert not [duration for duration in perf["longTasks"] if duration > 200], perf

    result = {
        "browser": browser_name, "browser_version": browser.version,
        "viewport": viewport, "errors": errors,
        "horizontal_overflow": False,
        "geometry": {key: rounded_box(value) for key, value in geometry.items()},
        "hover_geometry_shift_px": max(
            abs(before_ribbons[key] - after_ribbons[key]) for key in ("x", "y", "width", "height")
        ),
        "reduced_motion": True, "themes": ["light", "ocean"], "performance": perf,
        "status": "pass" if not errors else "fail",
    }
    assert not errors, errors
    context.close()
    browser.close()
    return result


def create_cvd_evidence(playwright):
    """Render structural review images; matrices are standard approximations."""
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto(BASE_URL, wait_until="networkidle")
    page.locator("#step-9").scroll_into_view_if_needed()
    page.wait_for_timeout(250)
    matrices = {
        "protanopia": "0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0",
        "deuteranopia": "0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0",
        "grayscale": "0.333 0.333 0.333 0 0  0.333 0.333 0.333 0 0  0.333 0.333 0.333 0 0  0 0 0 1 0",
    }
    paths = {}
    for name, matrix in matrices.items():
        page.evaluate("""({name, matrix}) => {
          document.querySelector('#audit-cvd-filter')?.remove();
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.id = 'audit-cvd-filter'; svg.style.cssText = 'position:fixed;width:0;height:0';
          svg.innerHTML = `<filter id="audit-${name}"><feColorMatrix type="matrix" values="${matrix}"/></filter>`;
          document.body.prepend(svg); document.documentElement.style.filter = `url(#audit-${name})`;
        }""", {"name": name, "matrix": matrix})
        path = Path("/tmp") / f"track-to-toll-{name}.png"
        page.locator("#step-9").screenshot(path=str(path))
        assert page.locator("#step-9 .cs-thermo-row").count() == 71
        assert page.locator("#step-9 .cs-rank-row").count() == 10
        paths[name] = str(path)
    browser.close()
    return paths


def main():
    results = []
    with preview_server(), sync_playwright() as playwright:
        for browser_name in ("chromium", "firefox", "webkit"):
            browser_type = getattr(playwright, browser_name)
            for viewport in VIEWPORTS:
                result = audit_page(browser_type, browser_name, viewport)
                results.append(result)
                print(f"{browser_name:8s} {viewport['name']:8s}: PASS")
        cvd = create_cvd_evidence(playwright)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "base_url": BASE_URL, "production_preview": True,
        "matrix": results, "cvd_review_images": cvd,
        "status": "pass" if all(row["status"] == "pass" for row in results) else "fail",
    }, indent=2) + "\n", encoding="utf-8")
    print(f"Evidence: {OUT}")


if __name__ == "__main__":
    main()
