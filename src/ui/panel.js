import {
  SPECIES,
  K_RANGE,
  SIGMA_RANGE,
  SPREAD_RANGE,
  BASE_HZ_RANGE
} from '../simulation/parameters.js';

function rangeRow(parent, label, object, key, [min, max], step) {
  const wrap = document.createElement('div');
  wrap.className = 'row';
  const lab = document.createElement('label');
  const name = document.createElement('span');
  const value = document.createElement('span');
  value.className = 'value';
  name.textContent = label;
  lab.append(name, value);
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(object[key]);
  const show = () => { value.textContent = Number(object[key]).toFixed(2); };
  input.addEventListener('input', () => {
    object[key] = Number(input.value);
    show();
  });
  show();
  wrap.append(lab, input);
  parent.append(wrap);
  return {
    refresh() {
      input.value = String(object[key]);
      show();
    }
  };
}

function button(parent, label, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.addEventListener('click', onClick);
  parent.append(b);
  return b;
}

export function createPanel(root, { params, model, actions }) {
  const panel = document.createElement('div');
  panel.className = 'panel';

  const h1 = document.createElement('h1');
  h1.textContent = 'U4 · Mar de Kuramoto';
  const intro = document.createElement('p');
  intro.textContent = 'Cada animal es un oscilador. Su fase θᵢ es el punto de su salto, ωᵢ su tempo natural, y K cuánto se miran unos a otros. Salta → suena.';
  panel.append(h1, intro);

  const hModel = document.createElement('h2');
  hModel.textContent = 'Modelo';
  panel.append(hModel);
  const rows = {
    K: rangeRow(panel, 'K · cuánto se miran', params, 'K', K_RANGE, 0.05),
    sigma: rangeRow(panel, 'σ · hasta dónde se ven (vecinos)', params, 'sigma', SIGMA_RANGE, 0.1),
    spread: rangeRow(panel, 'dispersión de ω', params, 'spread', SPREAD_RANGE, 0.02),
    baseHz: rangeRow(panel, 'ω media (saltos / s)', params, 'baseHz', BASE_HZ_RANGE, 0.01)
  };

  const hPlay = document.createElement('h2');
  hPlay.textContent = 'Tocar';
  panel.append(hPlay);
  const audioBtn = button(panel, 'Activar sonido  [A]', actions.toggleAudio);
  const modelBtn = button(panel, '', () => {
    params.personalities = !params.personalities;
    refreshModelButton();
  });
  function refreshModelButton() {
    modelBtn.textContent = params.personalities
      ? 'Con especies en el acople → pasar a modelo base  [B]'
      : 'Modelo base (todos iguales) → activar especies  [B]';
  }
  refreshModelButton();
  const netBtn = button(panel, '', () => {
    params.network = !params.network;
    refreshNetButton();
  });
  function refreshNetButton() {
    netBtn.textContent = params.network ? 'Ocultar líneas de la red  [L]' : 'Mostrar líneas de la red  [L]';
  }
  refreshNetButton();
  button(panel, 'Ola de perturbación  [espacio]', actions.perturb);
  button(panel, 'Que salte el que lleva más rato abajo  [F]', actions.jumpOne);
  button(panel, 'Volver al anillo  [R]', actions.resetRing);

  const help = document.createElement('p');
  help.innerHTML = 'Toca un animal: salta ya. Arrástralo: cambia de sitio y de vecinos. Shift + clic: se vuelve terco (deja de mirar a los demás). Toca el agua: asusta a los de alrededor.<br>↑ ↓ mueven K · ← → mueven σ · H oculta este panel.';
  panel.append(help);

  const hState = document.createElement('h2');
  hState.textContent = 'Estado colectivo';
  panel.append(hState);
  const state = document.createElement('p');
  state.className = 'state';
  panel.append(state);

  const hWho = document.createElement('h2');
  hWho.textContent = 'Especies';
  panel.append(hWho);
  const list = document.createElement('ul');
  for (const s of SPECIES) {
    const li = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = s.color;
    li.append(dot, `${s.label} · ${s.role}. ${s.sound}.`);
    list.append(li);
  }
  panel.append(list);

  root.append(panel);

  const hud = document.createElement('div');
  hud.className = 'hud';
  root.append(hud);

  function update() {
    const r = model.r.toFixed(2);
    const l = model.locked.toFixed(2);
    const mode = params.personalities ? '' : ' · modelo base';
    state.textContent = `r = ${r} · enganche = ${l} · ${model.stateLabel()}${mode}`;
    hud.textContent = `K ${params.K.toFixed(2)} · σ ${params.sigma.toFixed(1)} · r ${r} · enganche ${l} · ${model.stateLabel()}${mode}`;
  }

  function setAudio(on) {
    audioBtn.textContent = on ? 'Silenciar  [A]' : 'Activar sonido  [A]';
  }

  function toggle() {
    panel.classList.toggle('hidden');
  }

  function refresh() {
    for (const row of Object.values(rows)) row.refresh();
    refreshModelButton();
    refreshNetButton();
  }

  return { update, setAudio, toggle, refresh };
}
