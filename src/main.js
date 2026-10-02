import './styles.css';
import { createParameters, K_RANGE, SIGMA_RANGE } from './simulation/parameters.js';
import { createKuramoto } from './simulation/kuramoto.js';
import { createSea } from './render/sea.js';
import { createVoices } from './audio/voices.js';
import { createPanel } from './ui/panel.js';

const app = document.getElementById('app');

const params = createParameters();
const model = createKuramoto(params);
const sea = createSea(app, model, params);
const voices = createVoices(model);

const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v));

const actions = {
  async toggleAudio() {
    await voices.setEnabled(!voices.enabled);
    panel.setAudio(voices.enabled);
  },
  perturb() {
    model.randomizePhases();
    sea.splashAt(0, 0, 3);
  },
  jumpOne() {
    const i = model.mostSubmerged();
    if (i >= 0) model.jumpNow(i);
  },
  resetRing() {
    model.placeInRing();
  }
};

const panel = createPanel(app, { params, model, actions });

// ---------- interacción sobre el mar ----------

let dragging = -1;
let dragMoved = false;
let downX = 0;
let downY = 0;

sea.domElement.addEventListener('pointerdown', (event) => {
  const i = sea.pick(event.clientX, event.clientY);
  downX = event.clientX;
  downY = event.clientY;
  dragMoved = false;
  if (i >= 0) {
    dragging = i;
    sea.domElement.setPointerCapture(event.pointerId);
    return;
  }
  // Tocar el agua: asusta a los animales cercanos.
  if (!sea.isOnSea(event.clientY)) return;
  const w = sea.unproject(event.clientX, event.clientY);
  sea.splashAt(w.x, w.y, 1.2);
  for (let k = 0; k < model.N; k++) {
    const d = Math.hypot(model.x[k] - w.x, model.y[k] - w.y);
    if (d < 0.35) model.theta[k] += (Math.random() - 0.5) * Math.PI * (1 - d / 0.35);
  }
});

sea.domElement.addEventListener('pointermove', (event) => {
  if (dragging < 0) return;
  if (!dragMoved && Math.hypot(event.clientX - downX, event.clientY - downY) < 6) return;
  dragMoved = true;
  const w = sea.unproject(event.clientX, event.clientY);
  model.moveTo(dragging, w.x, w.y);
});

sea.domElement.addEventListener('pointerup', (event) => {
  if (dragging < 0) return;
  if (!dragMoved) {
    if (event.shiftKey) model.toggleAnchor(dragging);
    else model.jumpNow(dragging);
  }
  dragging = -1;
});

window.addEventListener('keydown', (event) => {
  const key = event.key === ' ' ? 'Space' : event.key.length === 1 ? event.key.toLowerCase() : event.key;
  // Con un slider enfocado, las flechas son del slider.
  if (event.target instanceof HTMLInputElement && key.startsWith('Arrow')) return;
  switch (key) {
    case 'Space':
      event.preventDefault();
      actions.perturb();
      break;
    case 'a':
      actions.toggleAudio();
      break;
    case 'f':
      actions.jumpOne();
      break;
    case 'r':
      actions.resetRing();
      break;
    case 'h':
      panel.toggle();
      break;
    case 'b':
      params.personalities = !params.personalities;
      panel.refresh();
      break;
    case 'l':
      params.network = !params.network;
      panel.refresh();
      break;
    case 'ArrowUp':
      params.K = clamp(params.K + 0.1, K_RANGE);
      panel.refresh();
      break;
    case 'ArrowDown':
      params.K = clamp(params.K - 0.1, K_RANGE);
      panel.refresh();
      break;
    case 'ArrowRight':
      params.sigma = clamp(params.sigma + 0.1, SIGMA_RANGE);
      panel.refresh();
      break;
    case 'ArrowLeft':
      params.sigma = clamp(params.sigma - 0.1, SIGMA_RANGE);
      panel.refresh();
      break;
    default:
      return;
  }
});

// ---------- bucle ----------

// Paso fijo para el modelo, así el resultado no depende de la tasa de frames.
const FIXED_DT = 1 / 120;
let accumulator = 0;
let last = performance.now();

function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.1) dt = 0.1;
  accumulator += dt;
  while (accumulator >= FIXED_DT) {
    model.step(FIXED_DT);
    accumulator -= FIXED_DT;
  }
  voices.update();
  sea.render(dt);
  panel.update();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
