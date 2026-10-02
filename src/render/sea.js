import { AGENT_COUNT, speciesOf } from '../simulation/parameters.js';

const TAU = Math.PI * 2;

// Cómo se ve el salto en el mundo: altura y avance, en unidades del plano.
const JUMP_HEIGHT = 0.42;   // altura de un salto de altura 1
const JUMP_LENGTH = 0.16;   // cuánto avanza un salto de longitud 1
const DIVE_DEPTH = 0.16;    // cuánto se hunde al nadar de vuelta

const SKY_TOP = '#05081a';
const SKY_HORIZON = '#101a3f';
const SEA_FAR = '#16294f';
const SEA_NEAR = '#070f26';
const FOAM = '#dfe9ff';
const LINE = '#cfe0ff';

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// Estrellas fijas, deterministas.
function makeStars(count) {
  const stars = [];
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < count; i++) stars.push({ x: rnd(), y: rnd() * 0.9, s: 0.5 + rnd() * 1.3, a: 0.3 + rnd() * 0.7 });
  return stars;
}

export function createSea(container, model, params) {
  const N = AGENT_COUNT;
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const stars = makeStars(140);
  const ripples = [];
  const foam = [];
  const screen = new Array(N).fill(0).map(() => ({ x: 0, y: 0, sx: 0, sy: 0, scale: 1, air: false, angle: 0, flip: false }));
  const order = new Array(N).fill(0).map((_, i) => i);

  let W = 0;
  let H = 0;
  let dpr = 1;
  let horizon = 0;
  let base = 0;
  let halfWidth = 0;
  let jumpPx = 0;

  // ---------- proyección del plano del mar ----------

  function depthOf(wy) {
    return 1 + 2.2 * ((wy + 1) / 2);
  }

  function project(wx, wy, h, out) {
    const d = depthOf(wy);
    out.x = W / 2 + (wx * halfWidth) / d;
    out.y = horizon + (base - horizon) / d - (h * jumpPx) / d;
    out.scale = 1 / d;
    return out;
  }

  function unproject(sx, sy) {
    const d = (base - horizon) / Math.max(1e-3, sy - horizon);
    const t = (d - 1) / 2.2;
    return { x: ((sx - W / 2) * d) / halfWidth, y: 2 * t - 1 };
  }

  // Dónde está un animal en el mundo para una fase dada.
  function worldPose(i, phase, out) {
    const s = speciesOf(i);
    const hd = model.heading[i];
    let forward;
    let h;
    if (phase < Math.PI) {
      const t = phase / Math.PI;
      forward = JUMP_LENGTH * s.length * (t - 0.5);
      h = JUMP_HEIGHT * s.height * Math.sin(phase);
    } else {
      const u = (phase - Math.PI) / Math.PI;
      forward = JUMP_LENGTH * s.length * (0.5 - u);
      h = -DIVE_DEPTH * s.height * Math.sin(u * Math.PI);
    }
    out.x = model.x[i] + Math.cos(hd) * forward;
    out.y = model.y[i] + Math.sin(hd) * forward;
    out.h = h;
    return out;
  }

  const tmpA = { x: 0, y: 0, h: 0 };
  const tmpB = { x: 0, y: 0, h: 0 };
  const pA = { x: 0, y: 0, scale: 1 };
  const pB = { x: 0, y: 0, scale: 1 };

  function updateScreenPoses() {
    for (let i = 0; i < N; i++) {
      const phase = model.phaseOf(i);
      worldPose(i, phase, tmpA);
      worldPose(i, phase + 0.05, tmpB);
      project(tmpA.x, tmpA.y, tmpA.h, pA);
      project(tmpB.x, tmpB.y, tmpB.h, pB);
      const sc = screen[i];
      sc.x = pA.x;
      sc.y = pA.y;
      sc.scale = pA.scale;
      sc.air = phase < Math.PI;
      sc.wy = tmpA.y;
      // Inclinación: solo la altura del salto inclina el cuerpo; el avance en
      // profundidad cuenta como avance horizontal, no como giro.
      const hd = model.heading[i];
      const forwardSign = Math.cos(hd) < 0 ? -1 : 1;
      const horizontal = Math.hypot(tmpB.x - tmpA.x, tmpB.y - tmpA.y);
      const rise = -(tmpB.h - tmpA.h);
      const tilt = Math.atan2(rise * 0.7, horizontal * 1.2);
      sc.flip = forwardSign < 0;
      sc.angle = sc.flip ? Math.PI - tilt : tilt;
      project(tmpA.x, tmpA.y, 0, pB);
      sc.sx = pB.x;
      sc.sy = pB.y;
    }
  }

  // ---------- eventos del modelo ----------

  model.onExit((i) => {
    const s = speciesOf(i);
    worldPose(i, 0.001, tmpA);
    ripples.push({ x: tmpA.x, y: tmpA.y, age: 0, life: 1.6, strength: 0.6 * s.size });
    spawnFoam(i, 6 + Math.round(6 * s.size), -1);
  });

  model.onEntry((i) => {
    const s = speciesOf(i);
    worldPose(i, Math.PI - 0.001, tmpA);
    ripples.push({ x: tmpA.x, y: tmpA.y, age: 0, life: 2.4, strength: 1.0 * s.size });
    ripples.push({ x: tmpA.x, y: tmpA.y, age: -0.25, life: 2.4, strength: 0.7 * s.size });
    spawnFoam(i, 10 + Math.round(12 * s.size), 1);
  });

  function spawnFoam(i, count, dir) {
    const sc = screen[i];
    for (let k = 0; k < count; k++) {
      foam.push({
        x: sc.sx + (Math.random() - 0.5) * 18 * sc.scale,
        y: sc.sy,
        vx: (Math.random() - 0.5) * 160 * sc.scale + (dir > 0 ? 0 : 0),
        vy: -(120 + Math.random() * 260) * sc.scale,
        age: 0,
        life: 0.5 + Math.random() * 0.5,
        size: (1 + Math.random() * 2) * sc.scale
      });
    }
  }

  function splashAt(wx, wy, strength) {
    ripples.push({ x: wx, y: wy, age: 0, life: 2.2, strength });
    ripples.push({ x: wx, y: wy, age: -0.3, life: 2.2, strength: strength * 0.6 });
  }

  // ---------- dibujo ----------

  function resize() {
    W = container.clientWidth;
    H = container.clientHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    horizon = H * 0.3;
    base = H * 1.02;
    halfWidth = W * 0.72;
    jumpPx = H * 0.7;
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, horizon);
    g.addColorStop(0, SKY_TOP);
    g.addColorStop(1, SKY_HORIZON);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, horizon + 1);
    for (const st of stars) {
      ctx.fillStyle = `rgba(230,236,255,${st.a})`;
      ctx.fillRect(st.x * W, st.y * horizon, st.s, st.s);
    }
    // luna
    const mx = W * 0.78;
    const my = H * 0.12;
    ctx.save();
    ctx.shadowColor = 'rgba(220,230,255,0.9)';
    ctx.shadowBlur = 40;
    ctx.fillStyle = '#eef2ff';
    ctx.beginPath();
    ctx.arc(mx, my, Math.min(W, H) * 0.028, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawSea() {
    const g = ctx.createLinearGradient(0, horizon, 0, H);
    g.addColorStop(0, SEA_FAR);
    g.addColorStop(1, SEA_NEAR);
    ctx.fillStyle = g;
    ctx.fillRect(0, horizon, W, H - horizon);

    // línea del horizonte
    ctx.strokeStyle = 'rgba(180,200,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, horizon + 0.5);
    ctx.lineTo(W, horizon + 0.5);
    ctx.stroke();

    // Camino de la luna sobre el agua. Tiembla según el desorden: con el mar
    // sincronizado es una línea limpia; en desorden se rompe.
    const mx = W * 0.78;
    const shimmer = (1 - model.smoothOrder) * 18 + 3;
    const rows = 36;
    for (let k = 0; k < rows; k++) {
      const t = k / rows;
      const yy = horizon + 4 + t * t * (H - horizon) * 0.8;
      const wobble = Math.sin(k * 1.7 + model.psi * 2) * shimmer * (0.4 + t);
      const len = (14 + t * 90) * (0.7 + 0.3 * Math.sin(k * 2.3 + model.psi));
      ctx.fillStyle = `rgba(200,215,255,${0.12 * (1 - t) + 0.02})`;
      ctx.beginPath();
      ctx.ellipse(mx + wobble, yy, len / 2, 1 + t * 2.5, 0, 0, TAU);
      ctx.fill();
    }
  }

  function drawRipples(dt) {
    ctx.lineWidth = 1.2;
    for (let k = ripples.length - 1; k >= 0; k--) {
      const rp = ripples[k];
      rp.age += dt;
      if (rp.age < 0) continue;
      const t = rp.age / rp.life;
      if (t >= 1) {
        ripples.splice(k, 1);
        continue;
      }
      project(rp.x, rp.y, 0, pA);
      const radius = (0.02 + 0.3 * rp.strength * t) * halfWidth * pA.scale;
      const alpha = (1 - t) * (1 - t) * 0.7;
      ctx.strokeStyle = `rgba(170,195,255,${alpha})`;
      ctx.beginPath();
      ctx.ellipse(pA.x, pA.y, radius, radius * 0.38, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = `rgba(170,195,255,${alpha * 0.5})`;
      ctx.beginPath();
      ctx.ellipse(pA.x, pA.y, radius * 0.6, radius * 0.6 * 0.38, 0, 0, TAU);
      ctx.stroke();
    }
  }

  // La red: quién se mira con quién. Opacidad = peso del acople × qué tan en
  // fase van. Se enciende cuando dos animales van juntos.
  function drawNetwork() {
    const weight = model.weight;
    const theta = model.theta;
    for (let i = 0; params.network && i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const w = Math.max(weight[i * N + j], weight[j * N + i]);
        if (w < 0.05) continue;
        const align = 0.5 * (1 + Math.cos(theta[j] - theta[i]));
        const alpha = w * (0.1 + 0.6 * align * align);
        const a = screen[i];
        const b = screen[j];
        ctx.strokeStyle = rgba(LINE, alpha);
        ctx.lineWidth = 0.8 + 1.6 * w * align;
        const glow = w * align > 0.55;
        if (glow) {
          ctx.shadowColor = rgba(LINE, 0.8);
          ctx.shadowBlur = 10;
        }
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        if (glow) ctx.shadowBlur = 0;
      }
    }
    // nodo en el agua bajo cada animal
    for (let i = 0; i < N; i++) {
      const sc = screen[i];
      const s = speciesOf(i);
      ctx.fillStyle = rgba(s.color, 0.55);
      ctx.beginPath();
      ctx.arc(sc.sx, sc.sy, 3.2 * sc.scale + 1, 0, TAU);
      ctx.fill();
      if (model.gain[i] === 0) {
        ctx.strokeStyle = rgba(s.color, 0.8);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(sc.sx, sc.sy, 14 * sc.scale + 4, (14 * sc.scale + 4) * 0.4, 0, 0, TAU);
        ctx.stroke();
      }
    }
  }

  // Cuerpo mirando a +x, de tamaño S. Cola articulada.
  function drawBody(S, s, wag, air, i) {
    const dorsal = s.id === 'orca' ? 1.5 : s.id === 'sardinas' ? 0 : 1;
    // cola
    ctx.save();
    ctx.translate(-0.52 * S, 0);
    ctx.rotate(wag);
    ctx.beginPath();
    ctx.moveTo(0, -0.1 * S);
    ctx.lineTo(-0.5 * S, -0.42 * S);
    ctx.lineTo(-0.34 * S, 0);
    ctx.lineTo(-0.5 * S, 0.42 * S);
    ctx.lineTo(0, 0.1 * S);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // cuerpo
    ctx.beginPath();
    ctx.moveTo(S, 0);
    ctx.quadraticCurveTo(0.35 * S, -0.42 * S, -0.5 * S, -0.14 * S);
    ctx.lineTo(-0.5 * S, 0.14 * S);
    ctx.quadraticCurveTo(0.35 * S, 0.42 * S, S, 0);
    ctx.closePath();
    ctx.fill();
    if (dorsal > 0) {
      ctx.beginPath();
      ctx.moveTo(0.12 * S, -0.3 * S);
      ctx.quadraticCurveTo(-0.05 * S, -0.72 * S * dorsal, -0.36 * S, -0.26 * S);
      ctx.closePath();
      ctx.fill();
    }
    if (s.id === 'volador' && air) {
      ctx.globalAlpha *= 0.75;
      ctx.beginPath();
      ctx.moveTo(0.25 * S, 0);
      ctx.lineTo(-0.35 * S, -0.95 * S);
      ctx.lineTo(-0.15 * S, -0.05 * S);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0.25 * S, 0);
      ctx.lineTo(-0.35 * S, 0.95 * S);
      ctx.lineTo(-0.15 * S, 0.05 * S);
      ctx.closePath();
      ctx.fill();
    }
    if (s.id === 'orca') {
      ctx.fillStyle = 'rgba(240,244,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(0.22 * S, 0.17 * S, 0.5 * S, 0.12 * S, 0, 0, TAU);
      ctx.fill();
    }
    // ojo
    ctx.fillStyle = 'rgba(5,8,26,0.85)';
    ctx.beginPath();
    ctx.arc(0.66 * S, -0.07 * S, Math.max(1, 0.05 * S), 0, TAU);
    ctx.fill();
  }

  function drawCreature(i, elapsed) {
    const sc = screen[i];
    const s = speciesOf(i);
    const phase = model.phaseOf(i);
    const S = 30 * s.size * sc.scale;
    const wag = (sc.air ? 0.12 : 0.32) * Math.sin(phase * 4 + i);
    const bodies = s.bodies;

    // reflejo en el agua cuando está en el aire
    if (sc.air) {
      const h = sc.sy - sc.y;
      ctx.save();
      ctx.translate(sc.x, sc.sy + h * 0.45);
      ctx.scale(1, -0.5);
      ctx.rotate(sc.flip ? Math.PI - sc.angle : sc.angle);
      if (sc.flip) ctx.scale(1, -1);
      ctx.globalAlpha = 0.22 * Math.min(1, h / 40);
      ctx.fillStyle = s.color;
      for (let b = 0; b < bodies; b++) {
        ctx.save();
        ctx.translate((b - 1) * 0.9 * S, Math.abs(b - 1) * 0.3 * S);
        drawBody(S, s, wag, true, i);
        ctx.restore();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(sc.x, sc.y);
    ctx.rotate(sc.angle);
    if (sc.flip) ctx.scale(1, -1);
    ctx.fillStyle = s.color;
    if (sc.air) {
      ctx.globalAlpha = 1;
      ctx.shadowColor = rgba(s.color, 0.9);
      ctx.shadowBlur = 14 * sc.scale + 6;
    } else {
      const depthT = Math.sin((phase - Math.PI));
      ctx.globalAlpha = 0.45 - 0.2 * depthT;
      ctx.fillStyle = s.color;
    }
    for (let b = 0; b < bodies; b++) {
      ctx.save();
      ctx.translate((b - 1) * 0.9 * S, Math.abs(b - 1) * 0.3 * S);
      drawBody(S, s, wag, sc.air, i);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawFoam(dt) {
    for (let k = foam.length - 1; k >= 0; k--) {
      const f = foam[k];
      f.age += dt;
      if (f.age >= f.life) {
        foam.splice(k, 1);
        continue;
      }
      f.vy += 900 * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      const a = 1 - f.age / f.life;
      ctx.fillStyle = `rgba(223,233,255,${a * 0.9})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size, 0, TAU);
      ctx.fill();
    }
  }

  let elapsed = 0;

  function render(dt) {
    elapsed += dt;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    updateScreenPoses();

    drawSky();
    drawSea();
    drawRipples(dt);
    drawNetwork();

    // de atrás hacia adelante
    order.sort((a, b) => screen[b].wy - screen[a].wy);
    for (const i of order) drawCreature(i, elapsed);

    drawFoam(dt);
  }

  // Animal bajo el puntero, o -1.
  function pick(sx, sy) {
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < N; i++) {
      const sc = screen[i];
      const s = speciesOf(i);
      const reach = 26 * s.size * sc.scale + 10;
      const d = Math.hypot(sc.x - sx, sc.y - sy);
      const d2 = Math.hypot(sc.sx - sx, sc.sy - sy);
      const dd = Math.min(d, d2);
      if (dd < reach && dd < bestD) {
        bestD = dd;
        best = i;
      }
    }
    return best;
  }

  function isOnSea(sy) {
    return sy > horizon + 4;
  }

  resize();
  window.addEventListener('resize', resize);

  return { render, resize, pick, unproject, isOnSea, splashAt, domElement: canvas };
}
