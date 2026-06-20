// 3D-Globus (reines D3): d3-geo Orthographic auf Canvas, versor-/geoInterpolate-Flug,
// Sturm-Spuren (Farbe = Saffir-Simpson), pulsierende Impact-Halos (Betroffene).
import {
  geoOrthographic, geoPath, geoInterpolate, geoDistance, geoGraticule10,
  timer, now, easeCubicInOut,
} from "d3";

// Saffir-Simpson-Farbskala (TS … Cat 5), farbsehschwäche-tauglich (RdYlBu-reversed).
const CAT_COLORS = ["#74add1", "#fee090", "#fdae61", "#f46d43", "#d73027", "#a50026"];
const catColor = (c) => CAT_COLORS[Math.max(0, Math.min(5, c))];
const HALF_PI = Math.PI / 2;
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

export function createGlobe(canvas, { land, storms, islands }) {
  const ctx = canvas.getContext("2d");
  const projection = geoOrthographic().clipAngle(90).precision(0.5);
  const path = geoPath(projection, ctx);
  const graticule = geoGraticule10();
  const stormById = new Map(storms.map((s) => [s.sid, s]));
  const backdrop = {
    type: "MultiLineString",
    coordinates: storms.filter((s) => !s.hero).map((s) => s.pts.map((p) => [p[0], p[1]])),
  };

  let W = 0, H = 0, baseScale = 1;
  let center = [185, -12], zoom = 1;
  let heroSid = null, islandIso = null, year = null;
  let fly = null, track = null, idle = false;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    baseScale = Math.min(W, H) / 2.05;
  }

  const visible = (lon, lat) => geoDistance(center, [lon, lat]) < HALF_PI;

  function render(t) {
    projection.rotate([-center[0], -center[1]]).translate([W / 2, H / 2]).scale(baseScale * zoom);
    ctx.clearRect(0, 0, W, H);

    ctx.beginPath(); path({ type: "Sphere" }); ctx.fillStyle = "#081521"; ctx.fill();
    ctx.beginPath(); path(graticule); ctx.lineWidth = 0.4; ctx.strokeStyle = "rgba(120,160,200,0.10)"; ctx.stroke();
    ctx.beginPath(); path(land); ctx.fillStyle = "#16252f"; ctx.fill();
    ctx.lineWidth = 0.5; ctx.strokeStyle = "#263c4d"; ctx.stroke();
    ctx.beginPath(); path(backdrop); ctx.lineWidth = 0.6; ctx.strokeStyle = "rgba(116,173,209,0.13)"; ctx.stroke();

    if (heroSid) drawHero(t);
    drawIslands(t);
  }

  function drawHero(t) {
    const s = stormById.get(heroSid);
    if (!s) return;
    const pts = s.pts;
    const prog = track ? clamp((t - track.t0) / track.dur, 0, 1) : 1;
    const upto = Math.max(2, Math.floor(pts.length * prog));
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.shadowBlur = 8;
    for (let i = 1; i < upto; i++) {
      const a = pts[i - 1], b = pts[i];
      if (!visible(a[0], a[1]) || !visible(b[0], b[1])) continue;
      const pa = projection([a[0], a[1]]), pb = projection([b[0], b[1]]);
      if (!pa || !pb) continue;
      const col = catColor(b[2]);
      ctx.strokeStyle = col; ctx.shadowColor = col;
      ctx.lineWidth = 1.6 + Math.max(0, b[2]) * 0.7;
      ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    const lead = pts[upto - 1];
    if (lead && visible(lead[0], lead[1])) {
      const p = projection([lead[0], lead[1]]);
      if (p) { ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, 2 * Math.PI); ctx.fillStyle = "#fff"; ctx.fill(); }
    }
  }

  function drawIslands(t) {
    const pulse = reduce ? 0.5 : (Math.sin(t / 450) + 1) / 2;
    for (const isl of islands) {
      if (!visible(isl.lon, isl.lat)) continue;
      const p = projection([isl.lon, isl.lat]);
      if (!p) continue;
      const focused = isl.iso3 === islandIso;
      if (focused) {
        const aff = year != null ? isl.affected[String(year)] || 0 : 0;
        const R = 9 + Math.sqrt(aff) * 0.07; // Halo-Radius ~ √Betroffene
        const r = R * (0.78 + 0.22 * pulse);
        const grd = ctx.createRadialGradient(p[0], p[1], r * 0.15, p[0], p[1], r);
        grd.addColorStop(0, "rgba(247,80,67,0)");
        grd.addColorStop(0.65, `rgba(247,80,67,${0.16 + 0.18 * pulse})`);
        grd.addColorStop(1, "rgba(247,80,67,0)");
        ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 2 * Math.PI); ctx.fillStyle = grd; ctx.fill();
        ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 2 * Math.PI);
        ctx.lineWidth = 1; ctx.strokeStyle = `rgba(247,130,110,${0.35 + 0.3 * pulse})`; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(p[0], p[1], focused ? 3.5 : 1.7, 0, 2 * Math.PI);
      ctx.fillStyle = focused ? "#fff" : "rgba(200,220,235,0.55)"; ctx.fill();
      if (focused) {
        ctx.font = "600 13px system-ui, sans-serif"; ctx.fillStyle = "#eaf2f8"; ctx.textAlign = "left";
        ctx.fillText(isl.name, p[0] + 9, p[1] - 9);
      }
    }
  }

  // Master-Render-Loop (eine Schleife für Flug, Track-Animation, Puls, Idle-Spin)
  timer(() => {
    const t = now();
    if (fly) {
      const k = reduce ? 1 : easeCubicInOut(clamp((t - fly.t0) / fly.dur, 0, 1));
      center = geoInterpolate(fly.c0, fly.c1)(k);
      zoom = fly.z0 + (fly.z1 - fly.z0) * k;
      if (k >= 1) fly = null;
    } else if (idle) {
      center = [center[0] + 0.06, center[1]];
    }
    render(t);
  });

  function flyTo(c1, z1, dur) {
    fly = { t0: now(), dur, c0: center.slice(), c1, z0: zoom, z1 };
  }

  function go(step) {
    heroSid = step.storm || null;
    islandIso = step.island || null;
    year = step.year ?? null;
    idle = !!step.idle;
    if (heroSid) track = { t0: now() + (reduce ? 0 : 300), dur: reduce ? 1 : 1700 };
    flyTo(step.center, step.zoom, reduce ? 1 : 2200);
  }

  resize();
  window.addEventListener("resize", resize);
  return { go, resize };
}
