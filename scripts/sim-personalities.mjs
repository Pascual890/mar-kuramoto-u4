// Compara variantes de especies a K fijo: node scripts/sim-personalities.mjs [K]
import { createParameters, SPECIES } from '../src/simulation/parameters.js';
import { createKuramoto } from '../src/simulation/kuramoto.js';

const K = Number(process.argv[2] ?? 3);
const variants = {
  'propuesta (orca 0.3, volador π/3, sardinas 1.3 × 2.5)': {},
  'volador π/6': { volador: { lag: Math.PI / 6 } },
  'sin desfase (volador lag 0)': { volador: { lag: 0 } },
  'orca 0.6': { orca: { coupling: 0.6 } },
  'todo neutro (modelo base)': { orca: { coupling: 1 }, volador: { lag: 0 }, sardinas: { coupling: 1, reach: 1 } }
};
const original = SPECIES.map((s) => ({ ...s }));
for (const [name, patch] of Object.entries(variants)) {
  for (const s of SPECIES) Object.assign(s, original.find((o) => o.id === s.id), patch[s.id] ?? {});
  const params = createParameters();
  params.K = K;
  const m = createKuramoto(params);
  const dt = 1 / 120;
  let r = 0, lock = 0, n = 0;
  for (let t = 0; t < 60; t += dt) { m.step(dt); if (t > 30) { r += m.r; lock += m.locked; n++; } }
  console.log(`${name.padEnd(56)} r=${(r / n).toFixed(2)}  lock=${(lock / n).toFixed(2)}`);
}
