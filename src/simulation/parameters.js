// Parámetros de la obra. Todo lo que el performer puede tocar en vivo vive aquí:
// un objeto plano que leen la simulación, el render y el audio.

export const AGENT_COUNT = 12;

// El mar es un plano de [-1, 1] × [-1, 1]. Los animales arrancan en un anillo;
// después el performer puede arrastrarlos a donde quiera.
export const RING_RADIUS = 0.72;
// Distancia típica entre vecinos en el anillo inicial. σ se mide en estas unidades.
export const SPACING = (2 * Math.PI * RING_RADIUS) / AGENT_COUNT;

// Cuatro especies. Todas reciben la misma fase θᵢ del modelo. Se distinguen en
// dos niveles:
//
//   1. Cómo saltan (height, length, size, cuántos cuerpos) y cómo suenan.
//   2. Cómo participan en el acoplamiento. Tres números que entran en la
//      ecuación (ver kuramoto.js):
//        coupling  gᵢ  cuánto obedece al grupo (1 = normal, <1 = terco, >1 = ansioso)
//        lag       αᵢ  desfase que busca respecto a sus vecinos (0 = en fase)
//        reach     ρᵢ  multiplica el alcance σ (1 = normal, >1 = ve lejos)
//
// Con coupling = 1, lag = 0 y reach = 1 en todas, la ecuación es exactamente
// la del modelo base. El botón "modelo base" del panel fuerza eso para poder
// comparar en vivo. LOS VALORES SON UNA PROPUESTA: la decisión y su
// justificación tienen que ser tuyas.
export const SPECIES = [
  {
    id: 'delfin',
    label: 'Delfín',
    color: '#8fb8ff',
    height: 1.0,
    length: 1.0,
    size: 1.0,
    bodies: 1,
    coupling: 1,
    lag: 0,
    reach: 1,
    role: 'referencia: sigue limpio a sus vecinos',
    sound: 'nota clara, se apaga despacio'
  },
  {
    id: 'orca',
    label: 'Orca',
    color: '#ffb347',
    height: 1.25,
    length: 1.3,
    size: 1.7,
    bodies: 1,
    coupling: 0.3,
    lag: 0,
    reach: 1,
    role: 'terca: cede poco, los demás se ajustan a ella',
    sound: 'nota grave y larga, chapoteo grande'
  },
  {
    id: 'volador',
    label: 'Pez volador',
    color: '#ff8fc8',
    height: 0.55,
    length: 1.1,
    size: 0.7,
    bodies: 1,
    coupling: 1,
    lag: Math.PI / 3,
    reach: 1,
    role: 'desfasado: salta justo después de sus vecinos',
    sound: 'nota aguda y corta'
  },
  {
    id: 'sardinas',
    label: 'Sardinas',
    color: '#5ff0d8',
    height: 0.5,
    length: 0.7,
    size: 0.45,
    bodies: 3,
    coupling: 1.3,
    lag: 0,
    reach: 2.5,
    role: 'gregarias: ven lejos y obedecen de más, enganchan primero',
    sound: 'tres notas rápidas'
  }
];

export function speciesOf(index) {
  return SPECIES[index % SPECIES.length];
}

export const K_RANGE = [0, 4];
export const SIGMA_RANGE = [0.5, 6];
export const SPREAD_RANGE = [0, 1];
export const BASE_HZ_RANGE = [0.08, 0.6];

export function createParameters() {
  return {
    K: 0,            // cuánto se miran (obligatorio en el encargo)
    sigma: 1.0,      // hasta dónde se ven, en distancias entre vecinos
    spread: 0.6,     // dispersión de los tempos naturales ωᵢ
    baseHz: 0.22,    // saltos por segundo, en promedio
    personalities: true, // false = modelo base (gᵢ = 1, αᵢ = 0, ρᵢ = 1 para todos)
    network: true    // dibujar las líneas de la red entre animales
  };
}
