// Barrido de K: node scripts/sim-sweep.mjs [spread]
import { createParameters } from '../src/simulation/parameters.js';
import { createKuramoto } from '../src/simulation/kuramoto.js';

const spread = Number(process.argv[2] ?? 0.35);
const sigma = Number(process.argv[3] ?? 1.5);
for (const K of [0, 0.3, 0.5, 0.7, 0.9, 1.1, 1.3, 1.6, 2, 2.5, 3, 4]) {
  const p = createParameters();
  p.K = K; p.spread = spread; p.sigma = sigma; p.personalities = false;
  const m = createKuramoto(p);
  const dt = 1 / 120;
  let r = 0, lock = 0, n = 0;
  for (let t = 0; t < 60; t += dt) {
    m.step(dt);
    if (t > 30) { r += m.r; lock += m.locked; n++; }
  }
  console.log(`K=${K.toFixed(1)}  r=${(r / n).toFixed(2)}  lock=${(lock / n).toFixed(2)}`);
}
