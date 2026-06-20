// 3D-Tag-Globus (reines D3): d3-geo Orthographic auf Canvas.
// Frei per versor-Drag drehbar; Scroll fliegt zu Stationen. Encodings:
//   einzelne Stürme = Grau-Skala (Stärke) · verdichtete Regionen = Warm-Heatmap ·
//   Betroffene = Magenta-Halo (√) · Zeit = Jahr-Filter.
import {
  geoOrthographic, geoPath, geoInterpolate, geoDistance, geoGraticule10,
  timer, now, easeCubicInOut,
} from "d3";
import versor from "versor";
import {
  THEME, strengthColor, makeDensityColor, impactRadius, impactColor,
} from "./palette.js";

const HALF_PI = Math.PI / 2;
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

export function createGlobe(canvas, { land, storms, islands, density }) {
  const ctx = canvas.getContext("2d");
  const projection = geoOrthographic().clipAngle(90).precision(0.5);
  const path = geoPath(projection, ctx);
  const graticule = geoGraticule10();
  const stormById = new Map(storms.map((s) => [s.sid, s]));
  const densityColor = makeDensityColor(density.max);

  // Dichte-Zellen einmalig als GeoJSON-Polygone (Quads) vorbereiten.
  const dstep = density.step;
  const densityCells = density.cells.map(([lon, lat, w]) => ({
    w,
    ring: [[lon, lat], [lon + dstep, lat], [lon + dstep, lat + dstep], [lon, lat + dstep], [lon, lat]],
  }));

  let W = 0, H = 0, baseScale = 1;
  let rotation = [-186, 12, 0], zoom = 1; // center [186,-12]
  let centerGeo = [186, -12];
  let year = null;            // null = "Alle" (nur Dichte)
  let heroSid = null, islandIso = null, heroYear = null;
  let fly = null, track = null, halo = null, dragging = false;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    baseScale = Math.min(W, H) / 2.05;
  }

  const visible = (lon, lat) => geoDistance(centerGeo, [lon, lat]) < HALF_PI;

  function render(t) {
    projection.rotate(rotation).translate([W / 2, H / 2]).scale(baseScale * zoom);
    centerGeo = projection.invert([W / 2, H / 2]) || centerGeo;
    ctx.clearRect(0, 0, W, H);

    ctx.beginPath(); path({ type: "Sphere" }); ctx.fillStyle = THEME.ocean; ctx.fill();
    ctx.beginPath(); path(graticule); ctx.lineWidth = 0.5; ctx.strokeStyle = THEME.graticule; ctx.stroke();
    ctx.beginPath(); path(land); ctx.fillStyle = THEME.land; ctx.fill();
    ctx.lineWidth = 0.5; ctx.strokeStyle = THEME.landStroke; ctx.stroke();

    drawDensity();
    if (year != null) drawTracksForYear(t);
    if (heroSid) drawHero(t);
    drawImpacts(t);
  }

  function drawDensity() {
    const dim = year != null ? 0.6 : 1; // bei Jahr-Ansicht etwas zurücknehmen
    const half = dstep / 2;
    for (const c of densityCells) {
      const a = clamp(Math.sqrt(c.w / density.max) * 0.8, 0, 0.8) * dim;
      if (a < 0.07) continue;
      const r = c.ring;
      if (!visible(r[0][0] + half, r[0][1] + half)) continue; // Zell-Mittelpunkt sichtbar?
      const p0 = projection(r[0]), p1 = projection(r[1]), p2 = projection(r[2]), p3 = projection(r[3]);
      if (!p0 || !p1 || !p2 || !p3) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = densityColor(c.w);
      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawTracksForYear(t) {
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (const s of storms) {
      if (s.season !== year || s.sid === heroSid) continue;
      drawTrack(s, 1, 1, false);
    }
  }

  function drawTrack(s, progress, widthBoost, glow) {
    const pts = s.pts;
    const upto = Math.max(2, Math.floor(pts.length * progress));
    if (glow) ctx.shadowColor = "rgba(255,255,255,0.85)";
    for (let i = 1; i < upto; i++) {
      const a = pts[i - 1], b = pts[i];
      if (!visible(a[0], a[1]) || !visible(b[0], b[1])) continue;
      const pa = projection([a[0], a[1]]), pb = projection([b[0], b[1]]);
      if (!pa || !pb) continue;
      ctx.strokeStyle = strengthColor(Math.max(0, b[2]));
      ctx.lineWidth = (0.8 + Math.max(0, b[2]) * 0.35) * widthBoost;
      ctx.shadowBlur = glow ? 6 : 0;
      ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    return upto;
  }

  function drawHero(t) {
    const s = stormById.get(heroSid);
    if (!s) return;
    const prog = track ? clamp((t - track.t0) / track.dur, 0, 1) : 1;
    const upto = drawTrack(s, prog, 2.4, true);
    const lead = s.pts[upto - 1];
    if (lead && visible(lead[0], lead[1])) {
      const p = projection([lead[0], lead[1]]);
      if (p) { ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, 2 * Math.PI); ctx.fillStyle = "#fff"; ctx.fill(); }
    }
  }

  function drawImpacts(t) {
    if (year == null) return;
    const pulse = reduce ? 0.6 : (Math.sin(t / 450) + 1) / 2;
    for (const isl of islands) {
      const aff = isl.affected[String(year)] || 0;
      if (aff <= 0 && isl.iso3 !== islandIso) continue;
      if (!visible(isl.lon, isl.lat)) continue;
      const p = projection([isl.lon, isl.lat]);
      if (!p) continue;
      const focused = isl.iso3 === islandIso;
      // sequenzierter Halo: erst nachdem der Hero-Track gezeichnet ist
      const grow = focused && halo ? clamp((t - halo.t0) / halo.dur, 0, 1) : 1;
      const R = impactRadius(aff) * grow;
      if (R > 1) {
        const r = R * (focused ? 0.8 + 0.2 * pulse : 1);
        const grd = ctx.createRadialGradient(p[0], p[1], r * 0.12, p[0], p[1], r);
        grd.addColorStop(0, "rgba(197,27,138,0)");
        grd.addColorStop(0.6, `rgba(197,27,138,${(focused ? 0.32 : 0.2) + 0.16 * pulse})`);
        grd.addColorStop(1, "rgba(197,27,138,0)");
        ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 2 * Math.PI); ctx.fillStyle = grd; ctx.fill();
        ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 2 * Math.PI);
        ctx.lineWidth = focused ? 1.4 : 1; ctx.strokeStyle = THEME.impact;
        ctx.globalAlpha = focused ? 0.7 : 0.45; ctx.stroke(); ctx.globalAlpha = 1;
      }
      ctx.beginPath(); ctx.arc(p[0], p[1], focused ? 3.3 : 1.8, 0, 2 * Math.PI);
      ctx.fillStyle = focused ? "#fff" : THEME.impact; ctx.fill();
      if (focused) {
        ctx.font = "600 13px system-ui, sans-serif"; ctx.textAlign = "left";
        ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,255,255,0.92)";
        ctx.strokeText(isl.name, p[0] + 9, p[1] - 9);
        ctx.fillStyle = THEME.ink; ctx.fillText(isl.name, p[0] + 9, p[1] - 9);
      }
    }
  }

  // ── Master-Loop ──────────────────────────────────────────────────────
  timer(() => {
    const t = now();
    if (fly && !dragging) {
      const k = reduce ? 1 : easeCubicInOut(clamp((t - fly.t0) / fly.dur, 0, 1));
      const c = geoInterpolate(fly.c0, fly.c1)(k);
      rotation = [-c[0], -c[1], 0];
      zoom = fly.z0 + (fly.z1 - fly.z0) * k;
      if (k >= 1) fly = null;
    }
    render(t);
  });

  // ── versor-Drag (nur Maus/Pointer; Touch bleibt Scroll) ─────────────
  let v0, q0, r0;
  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") return;
    dragging = true; fly = null;
    const p = projection.invert([e.offsetX, e.offsetY]);
    if (!p) return;
    r0 = projection.rotate();
    q0 = versor(r0);
    v0 = versor.cartesian(p);
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const p = projection.rotate(r0).invert([e.offsetX, e.offsetY]);
    if (!p) return;
    const q1 = versor.multiply(q0, versor.delta(v0, versor.cartesian(p)));
    rotation = versor.rotation(q1);
  });
  const endDrag = () => { dragging = false; canvas.style.cursor = "grab"; };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.style.cursor = "grab";

  // ── API ──────────────────────────────────────────────────────────────
  function flyTo(c1, z1) {
    fly = { t0: now(), dur: reduce ? 1 : 2200, c0: centerGeo.slice(), c1, z0: zoom, z1 };
  }
  function go(step) {
    heroSid = step.storm || null;
    islandIso = step.island || null;
    year = step.year ?? null;
    heroYear = step.year ?? null;
    if (heroSid) {
      track = { t0: now() + (reduce ? 0 : 350), dur: reduce ? 1 : 1600 };
      halo = { t0: track.t0 + (reduce ? 0 : 1600), dur: reduce ? 1 : 700 };
    } else {
      track = halo = null;
    }
    flyTo(step.center, step.zoom);
  }
  function setYear(y) {
    year = y;                    // Slider: nur Filter, kein Flug
    if (y !== heroYear) { heroSid = null; islandIso = null; track = null; halo = null; }
  }

  resize();
  window.addEventListener("resize", resize);
  return { go, setYear, resize };
}
