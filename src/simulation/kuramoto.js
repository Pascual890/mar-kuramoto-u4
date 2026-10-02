import { AGENT_COUNT, RING_RADIUS, SPACING, speciesOf } from './parameters.js';

const TAU = Math.PI * 2;

// Modelo de Kuramoto:
//
//   dθᵢ/dt = ωᵢ + (K / N) · Σⱼ sin(θⱼ − θᵢ)
//
// En esta obra:
//   θᵢ  es el punto del ciclo de salto del animal i: sale del agua en θ = 0,
//       está en el aire hasta θ = π, y de π a 2π nada bajo el agua de vuelta.
//   ωᵢ  es su tempo natural de salto. Cada animal tiene el suyo.
//   K   es cuánto se miran unos a otros.
//
// Extensión 1 (topología de interacción): el acople entre dos animales depende
// de su distancia en el mar. wᵢⱼ = exp(−dᵢⱼ² / 2σ²). Los cercanos se miran;
// los lejanos casi no. Arrastrar un animal cambia a quién ve: cambia la red.
//
// Con pesos, el 1/N se reemplaza por 1/Σⱼwᵢⱼ. Así K significa lo mismo sin
// importar cuánto valga σ, y con σ → ∞ (todos los pesos = 1) se recupera
// exactamente la ecuación original.
//
// Extensión 2 (especies en el acople): cada especie aporta tres números:
//
//   dθᵢ/dt = ωᵢ + gᵢ · K · Σⱼ wᵢⱼ sin(θⱼ − θᵢ − αᵢ) / Σⱼ wᵢⱼ
//   wᵢⱼ = exp(−dᵢⱼ² / 2(σ·ρᵢ)²)
//
//   gᵢ  multiplica el acople (terco si < 1, ansioso si > 1)
//   αᵢ  desfase que busca respecto a sus vecinos (Sakaguchi–Kuramoto, 1986)
//   ρᵢ  multiplica su alcance
//
// Con gᵢ = 1, αᵢ = 0, ρᵢ = 1 para todos se vuelve al modelo con topología, y
// además con σ → ∞ al original. params.personalities = false fuerza eso.

// Desviaciones fijas de ωᵢ, en [−1, 1], deterministas para que la obra
// arranque siempre con la misma banda de animales.
function deviationTable(n) {
  const table = [];
  for (let i = 0; i < n; i++) table.push(Math.sin(i * 2.399 + 0.7));
  return table;
}

export function createKuramoto(params) {
  const N = AGENT_COUNT;
  const theta = new Float32Array(N);    // θᵢ
  const omega = new Float32Array(N);    // ωᵢ
  const force = new Float32Array(N);    // término de acople que sufre cada agente
  const velocity = new Float32Array(N); // dθᵢ/dt del último paso
  const gain = new Float32Array(N).fill(1); // 1 = normal, 0 = anclado (ignora al resto)
  const x = new Float32Array(N);        // posición en el mar
  const y = new Float32Array(N);
  const heading = new Float32Array(N);  // hacia dónde salta cada animal
  const weight = new Float32Array(N * N); // wᵢⱼ del último paso, para dibujar la red
  const next = new Float32Array(N);
  const deviation = deviationTable(N);
  const exitListeners = [];
  const entryListeners = [];

  let r = 0;          // parámetro de orden: todos en la misma fase
  let psi = 0;        // fase media
  let locked = 0;     // fracción de agentes que giran a la velocidad de su vecino más cercano
  let smoothOrder = 0;

  function randomizePhases() {
    for (let i = 0; i < N; i++) theta[i] = Math.random() * TAU;
  }

  function placeInRing() {
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU - Math.PI / 2;
      x[i] = Math.cos(a) * RING_RADIUS;
      y[i] = Math.sin(a) * RING_RADIUS;
      heading[i] = a + Math.PI / 2; // saltan siguiendo el anillo
    }
  }

  // ωᵢ tiene dos partes: una corriente (el mar es más rápido a la derecha que
  // a la izquierda, así que el tempo de un animal depende de dónde está) y una
  // parte irregular fija por animal. La corriente es lo que, a K medio, hace
  // que la organización llegue como una ola que cruza el mar en vez de
  // aparecer de golpe en todos.
  function updateOmegas() {
    const base = TAU * params.baseHz;
    for (let i = 0; i < N; i++) {
      const current = x[i];
      omega[i] = base * (1 + (0.6 * current + 0.4 * deviation[i]) * params.spread);
    }
  }

  function nearest(i) {
    let best = -1;
    let bestD = Infinity;
    for (let j = 0; j < N; j++) {
      if (j === i) continue;
      const d = (x[i] - x[j]) ** 2 + (y[i] - y[j]) ** 2;
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    }
    return best;
  }

  function updateOrder() {
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < N; i++) {
      sx += Math.cos(theta[i]);
      sy += Math.sin(theta[i]);
    }
    r = Math.sqrt(sx * sx + sy * sy) / N;
    psi = Math.atan2(sy, sx);

    // Enganche: cada animal frente a su vecino más cercano. Es el criterio de
    // sincronía que no depende de los desfases: una ola enganchada cuenta.
    let n = 0;
    for (let i = 0; i < N; i++) {
      const j = nearest(i);
      if (Math.abs(velocity[i] - velocity[j]) < 0.12) n++;
    }
    locked = n / N;
  }

  // Cuánto orden hay, del tipo que sea: para lo ambiental (mar, dron).
  function organization() {
    return Math.max(r, locked * 0.9);
  }

  const STATES = [
    'desorden',
    'organización parcial',
    'organización estable · la ola',
    'organización estable · saltan juntos'
  ];
  let state = 0;
  function updateState() {
    const H = 0.05;
    if (locked > 0.85 + (state >= 2 ? -H : H)) {
      state = r > 0.7 + (state === 3 ? -H : H) ? 3 : 2;
    } else if (locked > 0.35 + (state >= 1 ? -H : H)) {
      state = 1;
    } else {
      state = 0;
    }
  }

  function step(dt) {
    updateOmegas();
    const K = params.K;
    const usePersonalities = params.personalities;

    for (let i = 0; i < N; i++) {
      const s = speciesOf(i);
      const g = usePersonalities ? s.coupling : 1;
      const alpha = usePersonalities ? s.lag : 0;
      const sigma = params.sigma * SPACING * (usePersonalities ? s.reach : 1);
      const twoSigma2 = 2 * sigma * sigma;

      let sum = 0;
      let weightSum = 0;
      for (let j = 0; j < N; j++) {
        if (j === i) {
          weight[i * N + j] = 0;
          continue;
        }
        const dx = x[i] - x[j];
        const dy = y[i] - y[j];
        const w = Math.exp(-(dx * dx + dy * dy) / twoSigma2);
        weight[i * N + j] = w;
        sum += w * Math.sin(theta[j] - theta[i] - alpha);
        weightSum += w;
      }
      force[i] = gain[i] * g * K * sum / weightSum;
      velocity[i] = omega[i] + force[i];
      next[i] = theta[i] + velocity[i] * dt;
    }

    for (let i = 0; i < N; i++) {
      const before = theta[i];
      theta[i] = next[i];
      const pb = ((before % TAU) + TAU) % TAU;
      const pa = ((theta[i] % TAU) + TAU) % TAU;
      if (Math.floor(theta[i] / TAU) > Math.floor(before / TAU)) {
        for (const fn of exitListeners) fn(i);   // sale del agua
      } else if (pb < Math.PI && pa >= Math.PI) {
        for (const fn of entryListeners) fn(i);  // vuelve a entrar
      }
    }

    updateOrder();
    updateState();
    smoothOrder += (organization() - smoothOrder) * Math.min(1, dt * 0.6);
  }

  // Hace saltar ya a un animal: lo lleva al inicio de su ciclo.
  function jumpNow(i) {
    const p = ((theta[i] % TAU) + TAU) % TAU;
    if (p < Math.PI) return; // ya está en el aire
    theta[i] += TAU - p + 0.001;
  }

  function toggleAnchor(i) {
    gain[i] = gain[i] > 0 ? 0 : 1;
    return gain[i] === 0;
  }

  function moveTo(i, nx, ny) {
    x[i] = Math.max(-1, Math.min(1, nx));
    y[i] = Math.max(-1, Math.min(1, ny));
  }

  // El animal que lleva más tiempo bajo el agua (el más cerca de volver a salir).
  function mostSubmerged() {
    let best = -1;
    let bestP = -1;
    for (let i = 0; i < N; i++) {
      const p = ((theta[i] % TAU) + TAU) % TAU;
      if (p >= Math.PI && p > bestP) {
        bestP = p;
        best = i;
      }
    }
    return best;
  }

  function phaseOf(i) {
    return ((theta[i] % TAU) + TAU) % TAU;
  }

  randomizePhases();
  placeInRing();
  updateOmegas();
  updateOrder();

  return {
    N,
    theta,
    omega,
    force,
    velocity,
    gain,
    x,
    y,
    heading,
    weight,
    get r() { return r; },
    get psi() { return psi; },
    get locked() { return locked; },
    get smoothOrder() { return smoothOrder; },
    organization,
    step,
    phaseOf,
    jumpNow,
    toggleAnchor,
    moveTo,
    mostSubmerged,
    randomizePhases,
    placeInRing,
    onExit(fn) { exitListeners.push(fn); },
    onEntry(fn) { entryListeners.push(fn); },
    stateLabel() { return STATES[state]; }
  };
}
