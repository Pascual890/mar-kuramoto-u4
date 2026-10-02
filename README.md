# U4 · Mar de Kuramoto

Obra audiovisual performativa para la Web. Un mar de noche con doce animales
que saltan. Cada animal es un oscilador de Kuramoto: su fase es el punto de su
salto, su frecuencia natural es su tempo, y `K` es cuánto se miran unos a
otros. Cuando un animal sale del agua, suena su nota. Según `K`, los saltos son
un carillón desordenado, una ola que recorre el mar, o un acorde en el que
todos saltan a la vez.

Referente: *Simple Harmonic Motion* de Memo Akten. Ahí cada cuerpo tiene un
periodo fijo y el patrón está escrito de antemano. Aquí los animales se miran
y negocian el patrón entre ellos: `K` es el instrumento.

## Ejecutar

Requiere Node 22.

```bash
npm install
npm run dev
```

Build de producción y vista previa:

```bash
npm run build
npm run preview
```

## Publicar en GitHub Pages

El repositorio incluye `.github/workflows/deploy.yml`. Sube el proyecto a la
rama `main`, en **Settings → Pages** elige **GitHub Actions** como fuente y haz
push. `vite.config.js` usa `base: './'`, así que el mismo build sirve bajo la
ruta del repositorio.

## Controles

| gesto | qué hace | tipo |
|---|---|---|
| slider **K** · `↑ ↓` | cuánto se miran | global, obligatoria |
| slider **σ** · `← →` | hasta dónde se ven, en distancias entre vecinos | global |
| slider **dispersión de ω** | qué tan distintos son los tempos naturales | global |
| slider **ω media** | saltos por segundo | global |
| **espacio** / Ola de perturbación | fases aleatorias para todos, ola en el centro | perturbación global |
| **tocar el agua** | asusta a los animales cercanos: fases movidas al azar | perturbación local |
| **tocar un animal** | salta ya | individual |
| **arrastrar un animal** | cambia de sitio, y por tanto de vecinos: cambia la red | individual, topología |
| **shift + clic** en un animal | se vuelve terco: deja de mirar a los demás, ellos lo siguen | individual |
| `F` | salta el que lleva más rato bajo el agua | individual |
| `B` | alterna modelo base / con especies en el acople | |
| `L` | muestra / oculta las líneas de la red | |
| `R` | vuelve a poner a todos en el anillo | |
| `A` · `H` | sonido on/off · ocultar panel | |

## El modelo

```
dθᵢ/dt = ωᵢ + (K / N) · Σⱼ sin(θⱼ − θᵢ)
```

Vive en [`src/simulation/kuramoto.js`](src/simulation/kuramoto.js), con la
sumatoria escrita tal cual.

| símbolo | en la obra |
|---|---|
| `θᵢ` | punto del ciclo de salto del animal `i`: sale del agua en `θ = 0`, está en el aire hasta `θ = π`, de `π` a `2π` nada bajo el agua de vuelta. Se ve en dónde está el cuerpo; se oye en el momento de la nota. |
| `ωᵢ` | tempo natural de salto. Tiene una corriente (el mar es más rápido a la derecha) más una parte irregular por animal. Esa diferencia es el motor del desorden. |
| `K` | cuánto se miran. El slider principal. |

### Extensión 1: topología por distancia en el mar

```
dθᵢ/dt = ωᵢ + K · Σⱼ wᵢⱼ sin(θⱼ − θᵢ) / Σⱼ wᵢⱼ        wᵢⱼ = exp(−dᵢⱼ² / 2σ²)
```

- Qué término cambió: el `1/N` uniforme pasa a ser un peso por pareja según
  la distancia, normalizado por la suma de pesos.
- Por qué: para que quién mira a quién sea algo que se **toca**. Arrastrar un
  animal cambia sus vecinos. La red se dibuja: las líneas son `wᵢⱼ`, y se
  encienden cuando dos animales van en fase.
- Qué diferencia produce: con `σ` pequeño la organización viaja como una ola;
  con `σ` grande (`wᵢⱼ → 1` para todos) se recupera exactamente el modelo
  original y el mar pasa de golpe del desorden a saltar todos juntos.

### Extensión 2: especies en el acople

Cada especie aporta tres números (`coupling`, `lag`, `reach` en
`parameters.js`):

```
dθᵢ/dt = ωᵢ + gᵢ · K · Σⱼ wᵢⱼ sin(θⱼ − θᵢ − αᵢ) / Σⱼ wᵢⱼ        wᵢⱼ = exp(−dᵢⱼ² / 2(σ·ρᵢ)²)
```

| | `gᵢ` obedece | `αᵢ` desfase | `ρᵢ` alcance | comportamiento |
|---|---|---|---|---|
| Delfín | 1 | 0 | 1 | referencia: sigue limpio a sus vecinos |
| Orca | 0.3 | 0 | 1 | terca: cede poco, los demás se ajustan a ella |
| Pez volador | 1 | π/3 | 1 | desfasado: salta justo después de sus vecinos |
| Sardinas | 1.3 | 0 | 2.5 | gregarias: ven lejos y obedecen de más, enganchan primero |

- Qué término cambió: `gᵢ` multiplica el acople, `αᵢ` entra dentro del seno
  (Sakaguchi–Kuramoto, 1986), `ρᵢ` escala el alcance.
- Con `gᵢ = 1`, `αᵢ = 0`, `ρᵢ = 1` para todos se recupera la extensión 1, y
  con `σ → ∞` el original. El botón **modelo base** (`B`) fuerza eso en vivo.
- Los valores son una propuesta y se cambian en `parameters.js`.
  `node scripts/sim-personalities.mjs 2.5` compara variantes sin navegador.

### Personalidades

Todas reciben la misma `θᵢ`. Lo que cambia es cómo saltan, cómo suenan y cómo
se acoplan:

| | salto | sonido | acople |
|---|---|---|---|
| Delfín | arco medio | nota clara, se apaga despacio | referencia |
| Orca | grande y lento, chapoteo grande | nota grave y larga, con subgrave | terca |
| Pez volador | bajo y largo, con alas | nota aguda y corta | desfasado |
| Sardinas | tres cuerpos, saltos cortos | tres notas rápidas | gregarias |

Las notas son una escala pentatónica (la menor), una por animal, como en
Akten. El timbre y la envolvente los pone la especie.

### Estados colectivos

Dos cantidades: el **enganche** (fracción de animales que saltan a la misma
velocidad que su vecino más cercano; es el criterio de sincronía y no depende
de los desfases) y el parámetro de orden global `r` (todos en la misma fase).

| estado | qué se ve | qué se oye | enganche | `r` |
|---|---|---|---|---|
| desorden | saltos y chapoteos sueltos, red apagada | carillón | bajo | bajo |
| organización parcial | grupos que saltan juntos, otros no | motivos que se repiten a medias | medio | |
| organización estable · la ola | los saltos recorren el mar de un lado al otro | arpegio | alto | bajo o medio |
| organización estable · saltan juntos | todos en el aire a la vez, red encendida | acorde y un chapoteo | alto | alto |

Con los valores por defecto (`σ = 1.0`, dispersión `0.6`): `K < 0.5`
desorden, `K ≈ 0.5–1.3` parcial y ola, `K ≥ 1.6` saltan juntos.

El estado también se comunica sin indicador: la red se enciende, el camino de
la luna sobre el agua se aquieta con el orden, y un dron grave crece.

### Qué mueve el modelo y qué no

| se mueve | lo manda |
|---|---|
| dónde está cada animal en su salto, si está en el aire o bajo el agua | `θᵢ` |
| cuándo suena su nota, cuándo chapotea | cruces de `θᵢ` por `0` y por `π` |
| ondas y espuma | esos mismos cruces |
| las líneas de la red y su brillo | `wᵢⱼ` y `cos(θⱼ − θᵢ)` |
| el temblor del camino de la luna, el dron | orden colectivo y fase media `ψ` |

No sale del modelo: la forma de los animales, sus colores y notas (identidad
fija), el movimiento de la cola (un balanceo en función de `θ`, cosmético),
las estrellas.

### Por qué no lo haría un reloj

1. `K = 0` → `1.2` sin tocar nada más: los saltos se ordenan solos en una ola
   que cruza el mar, y el carillón se vuelve arpegio. Con `B` se compara la
   misma `K` en modelo base y con especies: la orca no cede, el pez volador
   va detrás.
2. `K = 2.5`: todos saltan juntos, acorde y un chapoteo.
3. Tocar un animal bajo el agua: salta fuera de turno. Con `K` bajo salta él
   solo; con `K` alto los vecinos se descolocan un momento y lo reabsorben, o
   si tocas a la orca, arrastra al grupo. Arrastrar un animal lejos del anillo
   lo deja sin vecinos: se emancipa y vuelve a su tempo.

### Probar el modelo sin navegador

```bash
node scripts/sim-test.mjs
node scripts/sim-sweep.mjs 0.6 1.0
node scripts/sim-personalities.mjs 2.5
```

## Archivos

1. `src/simulation/kuramoto.js`: el modelo. Sumatoria literal, pesos por
   distancia, especies en el acople, parámetro de orden, enganche, eventos de
   salida y entrada.
2. `src/simulation/parameters.js`: parámetros en vivo y tabla de especies.
3. `src/render/sea.js`: Canvas 2D. Proyección inclinada del mar, red,
   animales, ondas, espuma, luna.
4. `src/audio/voices.js`: Tone.js. Nota al salir, chapoteo al entrar, dron.
5. `src/ui/panel.js`: sliders, botones y lectura de estado.
6. `src/main.js`: bucle con paso fijo, teclado y puntero.
