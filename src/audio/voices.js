import * as Tone from 'tone';
import { AGENT_COUNT, speciesOf } from '../simulation/parameters.js';

// El sonido es un evento del modelo, no un mapeo: cuando un animal sale del
// agua (θ cruza 0) suena su nota; cuando vuelve a entrar (θ cruza π) chapotea.
//
//   desorden   → notas y chapoteos sueltos, un carillón
//   la ola     → los animales salen uno tras otro: arpegio
//   sincronía  → todos a la vez: acorde y un solo chapoteo grande
//
// Cada animal tiene una nota fija de la escala (pentatónica de la menor),
// como en Simple Harmonic Motion de Memo Akten; el timbre y la envolvente
// los pone la especie. Un dron grave de fondo crece con el orden.

const SCALE = ['A2', 'C3', 'D3', 'E3', 'G3', 'A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5'];

export function createVoices(model) {
  const N = AGENT_COUNT;
  let started = false;
  let enabled = false;

  const master = new Tone.Gain(0);
  const reverb = new Tone.Reverb({ decay: 4, wet: 0.35 });
  master.chain(reverb, Tone.getDestination());

  const synths = {
    delfin: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.5, sustain: 0.15, release: 1.4 },
      volume: -10
    }),
    orca: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.03, decay: 0.9, sustain: 0.3, release: 2.6 },
      volume: -6
    }),
    volador: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.004, decay: 0.18, sustain: 0.05, release: 0.35 },
      volume: -12
    }),
    sardinas: new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.004, decay: 0.12, sustain: 0.02, release: 0.3 },
      volume: -16
    })
  };
  const orcaSub = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 0.05, decay: 1.2, sustain: 0.2, release: 2 },
    volume: -12
  });
  for (const s of Object.values(synths)) s.connect(master);
  orcaSub.connect(master);

  const splashFilter = new Tone.Filter({ type: 'lowpass', frequency: 1800, Q: 0.6 }).connect(master);
  const splash = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.005, decay: 0.28, sustain: 0, release: 0.2 },
    volume: -14
  }).connect(splashFilter);
  const bigSplashFilter = new Tone.Filter({ type: 'lowpass', frequency: 700, Q: 0.8 }).connect(master);
  const bigSplash = new Tone.NoiseSynth({
    noise: { type: 'brown' },
    envelope: { attack: 0.01, decay: 0.6, sustain: 0, release: 0.4 },
    volume: -8
  }).connect(bigSplashFilter);

  const droneGain = new Tone.Gain(0).connect(master);
  const drones = ['A1', 'E2'].map((n) => new Tone.Oscillator({ type: 'sine', frequency: n }).connect(droneGain));

  function noteOf(i) {
    return SCALE[i % SCALE.length];
  }

  model.onExit((i) => {
    if (!enabled) return;
    const s = speciesOf(i);
    const now = Tone.now();
    const note = noteOf(i);
    if (s.id === 'orca') {
      const low = Tone.Frequency(note).transpose(-12).toNote();
      synths.orca.triggerAttackRelease(low, '2n', now, 0.9);
      orcaSub.triggerAttackRelease(Tone.Frequency(note).transpose(-24).toNote(), '2n', now, 0.7);
    } else if (s.id === 'volador') {
      synths.volador.triggerAttackRelease(Tone.Frequency(note).transpose(12).toNote(), '16n', now, 0.8);
    } else if (s.id === 'sardinas') {
      const high = Tone.Frequency(note).transpose(12).toNote();
      for (let k = 0; k < 3; k++) synths.sardinas.triggerAttackRelease(high, '32n', now + k * 0.07, 0.7 - k * 0.15);
    } else {
      synths.delfin.triggerAttackRelease(note, '4n', now, 0.8);
    }
  });

  model.onEntry((i) => {
    if (!enabled) return;
    const s = speciesOf(i);
    const now = Tone.now();
    if (s.size > 1.2) bigSplash.triggerAttackRelease('8n', now, 0.9);
    else splash.triggerAttackRelease('16n', now, Math.min(1, 0.4 + 0.5 * s.size));
  });

  async function start() {
    if (started) return;
    await Tone.start();
    for (const d of drones) d.start();
    started = true;
  }

  async function setEnabled(value) {
    if (value && !started) await start();
    enabled = value;
    master.gain.rampTo(enabled ? 0.9 : 0, 0.2);
  }

  function update() {
    if (!enabled) return;
    const o = model.smoothOrder;
    droneGain.gain.rampTo(0.08 * o * o, 0.2);
  }

  return {
    start,
    setEnabled,
    update,
    get enabled() { return enabled; }
  };
}
