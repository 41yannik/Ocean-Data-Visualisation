// 3D-Globus (reines D3, Canvas) — bildhafte Darstellung + Render-Laufzeitoptimierung.
// Aufbau: Offscreen-„Base" (Sterne, Atmosphäre, schattierter Ozean, weiche Dichte-Heat, Land)
//   wird NUR bei Rotation/Zoom/Jahr neu gezeichnet; pro Frame nur blit + animierte FX (Spuren, Halos).
// Encodings: Stürme = Grau (Stärke) · Dichte = warme Heat (YlOrRd, geglättet) · Betroffene = Magenta-Halo.
import {
  geoOrthographic, geoPath, geoInterpolate, geoDistance, geoGraticule10,
  timer, now, easeCubicInOut,
} from "d3";
import versor from "versor";
import { THEME, strengthColor, makeDensityColor, impactRadius } from "./palette.js";

const HALF_PI = Math.PI / 2;
const DEG = Math.PI / 180;
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

export function createGlobe(canvas, { land, storms, islands, density }) {
  const ctx = canvas.getContext("2d");
  const base = document.createElement("canvas"); // Offscreen-Cache der statischen Ebenen
  const bctx = base.getContext("2d");
  const projection = geoOrthographic().clipAngle(90).precision(0.4);
  const path = geoPath(projection, bctx);
  const graticule = geoGraticule10();
  const stormById = new Map(storms.map((s) => [s.sid, s]));
  const densityColor = makeDensityColor(density.max);
  const dHalf = density.step / 2;

  let W = 0, H = 0, dpr = 1, baseScale = 1, stars = [];
  let rotation = [-186, 12, 0], zoom = 1, centerGeo = [186, -12];
  let year = null, heroSid = null, islandIso = null, heroYear = null;
  let fly = null, track = null, halo = null, dragging = false;
  let baseDirty = true;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    for (const c of [canvas, base]) { c.width = W * dpr; c.height = H * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    baseScale = Math.min(W, H) / 2.05;
    stars = makeStars(Math.round((W * H) / 1600));
    baseDirty = true;
  }

  function makeStars(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.3 + 0.2, a: Math.random() * 0.6 + 0.2 });
    }
    return out;
  }

  const visible = (lon, lat) => geoDistance(centerGeo, [lon, lat]) < HALF_PI;

  // ── Base-Layer (teuer, nur bei Rotation/Zoom/Jahr) ──────────────────────
  function renderBase() {
    projection.rotate(rotation).translate([W / 2, H / 2]).scale(baseScale * zoom);
    centerGeo = projection.invert([W / 2, H / 2]) || centerGeo;
    const cx = W / 2, cy = H / 2, R = baseScale * zoom;

    bctx.clearRect(0, 0, W, H);

    // Sterne (Screen-Space, fix)
    for (const s of stars) {
      bctx.globalAlpha = s.a; bctx.fillStyle = "#cfe0f5";
      bctx.beginPath(); bctx.arc(s.x, s.y, s.r, 0, 2 * Math.PI); bctx.fill();
    }
    bctx.globalAlpha = 1;

    // Atmosphären-Glow
    const ag = bctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.16);
    ag.addColorStop(0, "rgba(120,180,240,0.40)");
    ag.addColorStop(1, "rgba(120,180,240,0)");
    bctx.fillStyle = ag;
    bctx.beginPath(); bctx.arc(cx, cy, R * 1.16, 0, 2 * Math.PI); bctx.fill();

    // Schattierter Ozean (Licht oben-links → 3D-Kugel)
    const og = bctx.createRadialGradient(cx - R * 0.38, cy - R * 0.42, R * 0.1, cx, cy, R * 1.04);
    og.addColorStop(0, "#6fb7ec"); og.addColorStop(0.55, THEME.ocean); og.addColorStop(1, "#134c74");
    bctx.beginPath(); path({ type: "Sphere" }); bctx.fillStyle = og; bctx.fill();

    // Dichte als weiche additive Heat-Blobs (auf Ozean, unter Land), auf Kugel geclippt
    bctx.save();
    bctx.beginPath(); bctx.arc(cx, cy, R, 0, 2 * Math.PI); bctx.clip();
    const blobR = R * density.step * DEG * 1.6;
    const dim = year != null ? 0.45 : 1;
    for (const c of density.cells) {
      if (c[2] < density.max * 0.05) continue;
      const lon = c[0] + dHalf, lat = c[1] + dHalf;
      if (!visible(lon, lat)) continue;
      const p = projection([lon, lat]); if (!p) continue;
      const a = clamp(Math.sqrt(c[2] / density.max), 0, 1) * 0.62 * dim;
      const g = bctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], blobR);
      g.addColorStop(0, withAlpha(densityColor(c[2]), a));
      g.addColorStop(1, withAlpha(densityColor(c[2]), 0));
      bctx.fillStyle = g;
      bctx.beginPath(); bctx.arc(p[0], p[1], blobR, 0, 2 * Math.PI); bctx.fill();
    }
    bctx.restore();

    // Gradnetz dezent
    bctx.beginPath(); path(graticule); bctx.lineWidth = 0.4; bctx.strokeStyle = "rgba(255,255,255,0.12)"; bctx.stroke();

    // Land hochaufgelöst, crisp (über der Dichte → klare Gebiete)
    bctx.beginPath(); path(land); bctx.fillStyle = THEME.land; bctx.fill();
    bctx.lineWidth = 0.6; bctx.strokeStyle = THEME.landStroke; bctx.stroke();

    // Kugel-Limb
    bctx.beginPath(); bctx.arc(cx, cy, R, 0, 2 * Math.PI);
    bctx.lineWidth = 1; bctx.strokeStyle = "rgba(10,30,50,0.5)"; bctx.stroke();

    baseDirty = false;
  }

  // ── FX-Layer (pro Frame: animierte Spuren + pulsierende Halos) ──────────
  function renderFrame(t) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W * dpr, H * dpr);
    ctx.drawImage(base, 0, 0);
    ctx.restore();

    const R = baseScale * zoom;
    ctx.save();
    ctx.beginPath(); ctx.arc(W / 2, H / 2, R, 0, 2 * Math.PI); ctx.clip();
    if (year != null) drawTracksForYear();
    if (heroSid) drawHero(t);
    drawImpacts(t);
    ctx.restore();
  }

  function drawTrack(s, progress, widthBoost, glow) {
    const pts = s.pts;
    const upto = Math.max(2, Math.floor(pts.length * progress));
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (glow) ctx.shadowColor = "rgba(255,255,255,0.9)";
    for (let i = 1; i < upto; i++) {
      const a = pts[i - 1], b = pts[i];
      if (!visible(a[0], a[1]) || !visible(b[0], b[1])) continue;
      const pa = projection([a[0], a[1]]), pb = projection([b[0], b[1]]);
      if (!pa || !pb) continue;
      ctx.strokeStyle = strengthColor(Math.max(0, b[2]));
      ctx.lineWidth = (0.8 + Math.max(0, b[2]) * 0.4) * widthBoost;
      ctx.shadowBlur = glow ? 6 : 0;
      ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    return upto;
  }

  function drawTracksForYear() {
    ctx.globalAlpha = 0.5;
    for (const s of storms) if (s.season === year && s.sid !== heroSid) drawTrack(s, 1, 1, false);
    ctx.globalAlpha = 1;
  }

  function drawHero(t) {
    const s = stormById.get(heroSid); if (!s) return;
    const prog = track ? clamp((t - track.t0) / track.dur, 0, 1) : 1;
    const upto = drawTrack(s, prog, 2.6, true);
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
      const focused = isl.iso3 === islandIso;
      if (aff <= 0 && !focused) continue;
      if (!visible(isl.lon, isl.lat)) continue;
      const p = projection([isl.lon, isl.lat]); if (!p) continue;
      const grow = focused && halo ? clamp((t - halo.t0) / halo.dur, 0, 1) : 1;
      const R = impactRadius(aff) * grow;
      if (R > 1) {
        const r = R * (focused ? 0.8 + 0.2 * pulse : 1);
        const grd = ctx.createRadialGradient(p[0], p[1], r * 0.12, p[0], p[1], r);
        grd.addColorStop(0, "rgba(197,27,138,0)");
        grd.addColorStop(0.6, `rgba(197,27,138,${(focused ? 0.34 : 0.2) + 0.16 * pulse})`);
        grd.addColorStop(1, "rgba(197,27,138,0)");
        ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 2 * Math.PI); ctx.fillStyle = grd; ctx.fill();
        ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 2 * Math.PI);
        ctx.lineWidth = focused ? 1.4 : 1; ctx.strokeStyle = THEME.impact;
        ctx.globalAlpha = focused ? 0.75 : 0.45; ctx.stroke(); ctx.globalAlpha = 1;
      }
      ctx.beginPath(); ctx.arc(p[0], p[1], focused ? 3.3 : 1.8, 0, 2 * Math.PI);
      ctx.fillStyle = focused ? "#fff" : THEME.impact; ctx.fill();
      if (focused) {
        ctx.font = "600 13px system-ui, sans-serif"; ctx.textAlign = "left";
        ctx.lineWidth = 3.5; ctx.strokeStyle = "rgba(8,12,20,0.85)";
        ctx.strokeText(isl.name, p[0] + 9, p[1] - 9);
        ctx.fillStyle = "#fff"; ctx.fillText(isl.name, p[0] + 9, p[1] - 9);
      }
    }
  }

  // ── Master-Loop (render-on-demand) ──────────────────────────────────────
  timer(() => {
    const t = now();
    if (fly && !dragging) {
      const k = reduce ? 1 : easeCubicInOut(clamp((t - fly.t0) / fly.dur, 0, 1));
      const c = geoInterpolate(fly.c0, fly.c1)(k);
      rotation = [-c[0], -c[1], 0];
      zoom = fly.z0 + (fly.z1 - fly.z0) * k;
      baseDirty = true;
      if (k >= 1) fly = null;
    }
    const trackActive = track && t < track.t0 + track.dur;
    const haloActive = halo && t < halo.t0 + halo.dur;
    const pulsing = islandIso && year != null;
    if (!(baseDirty || dragging || fly || trackActive || haloActive || pulsing)) return; // idle → kein Redraw
    if (baseDirty) renderBase();
    renderFrame(t);
  });

  // ── versor-Drag (Maus/Pointer; Touch = Scroll) ─────────────────────────
  let v0, q0, r0;
  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") return;
    const p = projection.invert([e.offsetX, e.offsetY]); if (!p) return;
    dragging = true; fly = null;
    r0 = projection.rotate(); q0 = versor(r0); v0 = versor.cartesian(p);
    canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const p = projection.rotate(r0).invert([e.offsetX, e.offsetY]); if (!p) return;
    rotation = versor.rotation(versor.multiply(q0, versor.delta(v0, versor.cartesian(p))));
    baseDirty = true;
  });
  const endDrag = () => { dragging = false; canvas.style.cursor = "grab"; };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.style.cursor = "grab";

  // ── API ─────────────────────────────────────────────────────────────────
  function flyTo(c1, z1) { fly = { t0: now(), dur: reduce ? 1 : 2200, c0: centerGeo.slice(), c1, z0: zoom, z1 }; }
  function go(step) {
    heroSid = step.storm || null; islandIso = step.island || null;
    year = step.year ?? null; heroYear = step.year ?? null;
    if (heroSid) { track = { t0: now() + (reduce ? 0 : 350), dur: reduce ? 1 : 1600 }; halo = { t0: track.t0 + (reduce ? 0 : 1600), dur: reduce ? 1 : 700 }; }
    else { track = halo = null; }
    baseDirty = true; flyTo(step.center, step.zoom);
  }
  function setYear(y) {
    year = y; baseDirty = true;
    if (y !== heroYear) { heroSid = null; islandIso = null; track = null; halo = null; }
  }

  resize();
  window.addEventListener("resize", resize);
  return { go, setYear, resize };
}

function withAlpha(rgbStr, a) {
  // d3 interpolate* liefert "rgb(r, g, b)" → in rgba mit Alpha umwandeln
  const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(rgbStr);
  return m ? `rgba(${m[1]},${m[2]},${m[3]},${a})` : rgbStr;
}
