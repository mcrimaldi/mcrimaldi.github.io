/**
 * DroneSurvey.js
 * 8-bit canvas animation: a survey drone flies over crops and trees,
 * scanning them (purple = to survey, green = surveyed).
 * Loops forever (the world wraps seamlessly every 9 fields).
 * Self-contained: no dependencies, pauses only when off-screen or tab hidden.
 * It always animates, also when the OS has animations turned off
 * (slow scroll, no flashing).
 */

const C = {
  sky: ['#140a24', '#1a0d2e', '#22113a', '#2c1447', '#3a1752'],
  star: '#a98ad6',
  sunTop: '#ff3d8b',
  sunBottom: '#ffb347',
  hill: '#241040',
  ground: '#1d1033',
  groundLine: '#cc66ff',
  furrow: '#3d2466',
  rawLight: '#8a6cba',
  raw: '#6c4f99',
  rawDark: '#3d2466',
  okLight: '#b3ffd9',
  ok: '#66ffb3',
  okDark: '#2fa877',
  flash: '#ffd166',
  trunk: '#5b2a99',
  body: '#e6d3ff',
  arm: '#cc66ff',
  rotor: '#a98ad6',
  lens: '#66ccff',
  led: '#ff66cc',
  beam: 'rgba(255, 209, 102, 0.30)',
  beamEdge: 'rgba(255, 209, 102, 0.65)'
};

const H = 72;            // logical height (px)
const GROUND = H - 11;   // ground line y
const SPEED = 16;        // world px / second
const FPS = 12;          // stepped, for the 8-bit feel
const SLOT = 13;         // one plant every SLOT world px
const FIELD = 520;       // world px per surveyed field
const BEAM_HALF = 8;
const LOOP = 360;         // plant pattern repeats every LOOP slots (= 9 fields): endless cycle

const DRONE = [
  '.rrrrr.......rrrrr.',
  '...b...........b...',
  '..aaaaaaaaaaaaaaa..',
  '......bbbbbbb......',
  '......bblllbb......',
  '......bbbbbbb......',
  '.....b...L...b.....'
];
const DRONE_ALT_ROTOR = '...rr.........rr...';

/** Deterministic pseudo-random in [0,1) from an integer */
const rnd = (n) => {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
};

/** Slot index wrapped into the repeating pattern */
const wrap = (i) => ((i % LOOP) + LOOP) % LOOP;

export function mountDroneSurvey(host) {
  if (!host || host.dataset.droneMounted) return () => {};
  host.dataset.droneMounted = '1';
  host.classList.add('drone-survey');
  host.setAttribute('role', 'img');
  host.setAttribute('aria-label', 'Pixel-art animation: a drone surveying crops and trees');

  const canvas = document.createElement('canvas');
  canvas.className = 'drone-survey__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const hudL = document.createElement('span');
  hudL.className = 'drone-survey__hud drone-survey__hud--left';
  hudL.setAttribute('aria-hidden', 'true');
  const hudR = document.createElement('span');
  hudR.className = 'drone-survey__hud drone-survey__hud--right';
  hudR.setAttribute('aria-hidden', 'true');
  host.append(canvas, hudL, hudR);

  const ctx = canvas.getContext('2d');
  let W = 240;
  const px = (x, y, w = 1, h = 1) => ctx.fillRect(x | 0, y | 0, w, h);

  const resize = () => {
    const cssW = host.clientWidth || 720;
    const scale = cssW < 520 ? 2 : 3;
    W = Math.max(120, Math.round(cssW / scale));
    canvas.width = W;
    canvas.height = H;
    canvas.style.height = `${H * scale}px`;
  };

  function drawSky(t) {
    const band = Math.ceil(GROUND / C.sky.length);
    C.sky.forEach((c, i) => { ctx.fillStyle = c; px(0, i * band, W, band); });
    ctx.fillStyle = C.star;
    for (let i = 0; i < W / 9; i++) {
      const twinkle = (Math.floor(t * 2) + i) % 5 === 0;
      if (!twinkle) px(rnd(i * 7 + 1) * W, rnd(i * 7 + 2) * (GROUND - 30));
    }
    // striped synthwave sun on the horizon
    const cx = Math.round(W * 0.8), r = 15;
    for (let dy = -r; dy < 0; dy++) {
      if (dy > -9 && dy % 3 === 0) continue;
      const half = Math.round(Math.sqrt(r * r - dy * dy));
      ctx.fillStyle = dy < -8 ? C.sunTop : (dy < -4 ? '#ff7a6b' : C.sunBottom);
      px(cx - half, GROUND + dy, half * 2, 1);
    }
  }

  function drawHills(scroll) {
    ctx.fillStyle = C.hill;
    const off = scroll * 0.25;
    for (let x = 0; x < W; x++) {
      const wx = x + off;
      const h = Math.round(5 + 3 * Math.sin(wx * 0.045) + 2 * Math.sin(wx * 0.11 + 1.3));
      px(x, GROUND - h, 1, h);
    }
  }

  function drawGround(scroll) {
    ctx.fillStyle = C.ground; px(0, GROUND, W, H - GROUND);
    ctx.fillStyle = C.groundLine; px(0, GROUND, W, 1);
    ctx.fillStyle = C.furrow;
    for (let row = 0; row < 3; row++) {
      const y = GROUND + 3 + row * 3;
      const off = Math.floor(scroll * (1 + row * 0.35)) % 8;
      for (let x = -off; x < W; x += 8) px(x + row * 2, y, 4, 1);
    }
  }

  function blob(cx, cy, r, pal) {
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.round(Math.sqrt(r * r + r * 0.6 - dy * dy));
      ctx.fillStyle = pal[1]; px(cx - half, cy + dy, half * 2 + 1, 1);
      ctx.fillStyle = pal[2]; px(cx + half - 1, cy + dy, 2, 1);
      if (dy < 0) { ctx.fillStyle = pal[0]; px(cx - half + 1, cy + dy, Math.max(1, half - 1), 1); }
    }
    ctx.fillStyle = pal[2]; px(cx - r + 1, cy + r, r * 2 - 1, 1);
  }

  function drawPlant(slot, x, state) {
    const i = wrap(slot);
    const pal = state === 2 ? [C.flash, C.flash, C.sunBottom]
      : state === 1 ? [C.okLight, C.ok, C.okDark]
      : [C.rawLight, C.raw, C.rawDark];
    const kind = rnd(i * 13 + 5);
    const size = rnd(i * 13 + 6);
    if (kind < 0.24) {                       // round tree
      const r = 5 + Math.round(size * 2), th = 5 + Math.round(size * 3);
      ctx.fillStyle = C.trunk; px(x - 1, GROUND - th, 2, th);
      blob(x, GROUND - th - r + 1, r, pal);
    } else if (kind < 0.42) {                // pine
      const tiers = 3 + Math.round(size);
      ctx.fillStyle = C.trunk; px(x - 1, GROUND - 3, 2, 3);
      for (let k = 0; k < tiers; k++) {
        const base = GROUND - 3 - k * 4;
        for (let row = 0; row < 5; row++) {
          const half = Math.max(0, 5 - k - row);
          ctx.fillStyle = pal[1]; px(x - half, base - row, half * 2 + 1, 1);
          ctx.fillStyle = pal[2]; px(x + half, base - row, 1, 1);
          ctx.fillStyle = pal[0]; px(x - half, base - row, 1, 1);
        }
      }
    } else if (kind < 0.55) {                // bush
      blob(x, GROUND - 3, 3, pal);
    } else {                                 // crop row: three sprouts
      for (let k = -1; k <= 1; k++) {
        const sx = x + k * 4, h = 3 + ((i + k) & 1);
        ctx.fillStyle = pal[2]; px(sx, GROUND - h, 1, h);
        ctx.fillStyle = pal[1]; px(sx - 1, GROUND - h, 1, 1); px(sx + 1, GROUND - h - 1, 1, 1);
        ctx.fillStyle = pal[0]; px(sx, GROUND - h - 1, 1, 1);
      }
    }
  }

  function drawDrone(x, y, frame) {
    const map = { r: C.rotor, b: C.body, a: C.arm, l: C.lens, L: frame % 6 < 3 ? C.led : C.flash };
    DRONE.forEach((row, ry) => {
      const line = ry === 0 && frame % 2 ? DRONE_ALT_ROTOR : row;
      for (let rx = 0; rx < line.length; rx++) {
        const c = map[line[rx]];
        if (c) { ctx.fillStyle = c; px(x - 9 + rx, y + ry); }
      }
    });
  }

  function drawBeam(x, top, frame) {
    const len = GROUND - top;
    for (let dy = 0; dy < len; dy++) {
      const half = Math.round(1 + (BEAM_HALF - 1) * (dy / len));
      for (let dx = -half; dx <= half; dx++) {
        const edge = Math.abs(dx) === half;
        if (!edge && (dx + dy + frame) % 2) continue;
        ctx.fillStyle = edge ? C.beamEdge : C.beam;
        px(x + dx, top + dy);
      }
    }
    ctx.fillStyle = C.flash;
    const sweep = Math.round(((frame % 12) / 11) * (BEAM_HALF * 2)) - BEAM_HALF;
    px(x + sweep, GROUND - 1, 1, 2);
    px(x - BEAM_HALF, GROUND, BEAM_HALF * 2 + 1, 1);
  }

  const floaters = [];
  let lastScanned = null;

  function render(t) {
    const frame = Math.floor(t * FPS);
    const scroll = ((frame / FPS) * SPEED) % (LOOP * SLOT * 64);
    const droneX = Math.round(W * 0.38);
    const droneY = 13 + Math.round(Math.sin(frame * 0.35) * 2);
    const beamWorld = scroll + droneX;

    drawSky(t);
    drawHills(scroll);
    drawGround(scroll);

    const first = Math.floor(scroll / SLOT) - 1;
    const last = Math.ceil((scroll + W) / SLOT) + 1;
    for (let i = first; i <= last; i++) {
      const k = wrap(i);
      if (rnd(k * 13 + 4) < 0.12) continue;      // gaps in the field
      const wx = i * SLOT + Math.round(rnd(k * 13 + 7) * 4);
      const d = wx - beamWorld;
      drawPlant(i, Math.round(wx - scroll), Math.abs(d) <= BEAM_HALF ? 2 : d < 0 ? 1 : 0);
    }

    const scanned = Math.floor(beamWorld / SLOT);
    if (lastScanned !== null && scanned > lastScanned && rnd(wrap(scanned) * 13 + 4) >= 0.12) {
      floaters.push({ wx: scanned * SLOT, born: frame });
    }
    lastScanned = scanned;

    drawBeam(droneX, droneY + 7, frame);
    drawDrone(droneX, droneY, frame);

    for (let k = floaters.length - 1; k >= 0; k--) {
      const f = floaters[k], age = frame - f.born;
      if (age > 14) { floaters.splice(k, 1); continue; }
      const fx = Math.round(f.wx - scroll), fy = GROUND - 24 - age;
      ctx.fillStyle = age > 10 ? C.okDark : C.ok;
      px(fx - 1, fy, 3, 1); px(fx, fy - 1, 1, 3);
    }

    if (frame % 3 === 0) {
      const done = (scroll % FIELD) / FIELD;
      const field = 1 + (Math.floor(scroll / FIELD) % 9);
      const ndvi = (0.62 + 0.2 * Math.sin(scroll * 0.02)).toFixed(2);
      const bar = '█'.repeat(Math.round(done * 8)).padEnd(8, '░');
      hudL.textContent = `▶ UAV SURVEY · FIELD A${field}`;
      hudR.textContent = `NDVI ${ndvi} · ${bar} ${String(Math.round(done * 100)).padStart(3, ' ')}%`;
    }
  }

  // ---- loop control ----
  let raf = 0, visible = true, start = performance.now(), lastFrame = -1;

  const tick = (now) => {
    raf = 0;
    const t = (now - start) / 1000;
    const frame = Math.floor(t * FPS);
    if (frame !== lastFrame) { lastFrame = frame; render(t); }
    schedule();
  };
  const schedule = () => {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(tick);
  };
  const still = () => { lastFrame = -1; render((performance.now() - start) / 1000); };

  const ro = new ResizeObserver(() => { resize(); still(); });
  ro.observe(host);
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; schedule(); });
  io.observe(host);
  const onVis = () => schedule();
  document.addEventListener('visibilitychange', onVis);

  resize(); still(); schedule();

  return () => {
    cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    host.replaceChildren(); delete host.dataset.droneMounted;
  };
}

export default mountDroneSurvey;
