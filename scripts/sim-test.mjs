// Prueba del modelo sin navegador: node scripts/sim-test.mjs
import { createParameters } from '../src/simulation/parameters.js';
import { createKuramoto } from '../src/simulation/kuramoto.js';

function run(label, K, personalities, seconds = 40) {
  const p = createParameters();
  p.K = K;
  p.personalities = personalities;
  const m = createKuramoto(p);
  const dt = 1 / 120;
  const out = [];
  let steps = 0;
  for (let t = 0; t < seconds; t += dt, steps++) {
    m.step(dt);
    if (steps % 1200 === 0) {
      out.push(`t=${Math.round(t).toString().padStart(2)}  r=${m.r.toFixed(2)} lock=${m.locked.toFixed(2)}  ${m.stateLabel()}`);
    }
  }
  console.log(`\n## ${label}`);
  console.log(out.join('\n'));
}

run('K=0 base', 0, false);
run('K=1.3 base', 1.3, false);
run('K=3 base', 3, false);
run('K=1.3 personalidades', 1.3, true);
run('K=3 personalidades', 3, true);
