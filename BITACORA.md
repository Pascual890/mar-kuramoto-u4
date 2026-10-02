# Bitácora U4 · Mar de Kuramoto
.
Acá voy anotando por lo que pasé para llegar al proyecto. Varias de las entradas
son cosas que descarté, pero las dejo porque fue lo que me hizo entender qué
estaba buscando.

---

## 1. Leyendo el encargo

Leí la unidad y la actividad 02. Lo que más me pesó al principio fue que no
tenía ni idea de con qué hacerlo: ¿three.js? ¿p5? Venía del forces instrument de
U3, que era three.js con WebGPU y 131 mil partículas, y pensé que esto iba a ser
parecido.

Me di cuenta de que no. Acá son 8 agentes mínimo, no 131 mil. La simulación es
mínima, corre en JavaScript normal sin problema. Lo difícil no iba a ser lo
gráfico sino el sonido, porque el encargo pide 4 personalidades audiovisuales y
eso es un tema de timbre, no de render.

Decisión: Vite + Tone.js para el audio. Lo visual lo dejé abierto.

---

## 2. Entendiendo qué hace Kuramoto

La ecuación es

```
dθᵢ/dt = ωᵢ + (K / N) · Σⱼ sin(θⱼ − θᵢ)
```

Lo que me costó entender al principio: no es que suba K y tarde o temprano se
sincronicen. Hay un umbral. Debajo de cierto K el sistema **nunca** se ordena,
por mucho que uno espere. Y lo que empuja al desorden es que los ωᵢ sean
distintos entre sí. Si todos tuvieran el mismo ωᵢ no habría nada que simular y
el proyecto sería un reloj, que es justo lo que el encargo prohíbe.

También entendí que hay un estado intermedio real: se engancha un pelotón y los
que tienen ωᵢ más extremo se escapan. Eso es la "organización parcial" que pide
el encargo, y no hay que programarla, sale sola.

---

## 3. Probando representaciones (lo que descarté)

Acá di muchas vueltas. Anoto lo que probé y por qué no:

- **Anillo de fases con el parámetro de orden en pantalla.** Se entendía
  perfecto pero era una visualización de Kuramoto, no una obra. El encargo dice
  literal que el propósito no es hacer una visualización del modelo.
- **Escenario 2D con agentes arrastrables.** Me gustó la idea de que mover un
  agente cambiara quién lo escucha, pero si uno no tocaba nada no pasaba nada.
  Muy estático para una experiencia performativa.
- **Órbitas concéntricas.** Acá sí apareció algo bonito: una espiral que se
  formaba sola al subir K. Pero los agentes solo cambiaban por el sonido, todos
  se veían iguales.
- **Campo de miles de celdas.** Era lo que me imaginaba cuando pensaba en algo
  "mezclado", y salían ondas espirales de verdad. Pero el sonido se volvió un
  ruido de interferencia, porque con miles de agentes no hay voces, hay
  estadística. Y los colores no se movían. Lo descarté.
- **Puntillismo tipo p5 + Hydra.** Visualmente interesante, pero ahí Kuramoto no
  se evidenciaba: lo mismo se podía hacer con unos giros programados por nivel.

Conclusión que saqué de todo esto: **los agentes tienen que ser pocos y
distinguibles**. No es una limitación del encargo, es lo que hace que el modelo
se vea y se oiga.

---

## 4. El túnel (lo construí y lo boté)

Hice el proyecto completo: túnel de 16 anillos en three.js, cada anillo un
oscilador, partículas, una costura que une los anillos y que pasa de zigzag a
hélice a recta según K. Funcionaba y el modelo se portaba bien.

Pero no me convenció. Mareaba, había demasiadas partículas, se veía raro. Y
sobre todo sentí que Kuramoto no se lucía: se veían aros de distinto tamaño
girando y ya.

Dos cosas técnicas que aprendí ahí y que me sirven igual:

- La cadena de vecinos tenía que ser **abierta**. Al principio el primer y el
  último anillo eran vecinos, y así una hélice enganchada no se desenrolla
  nunca, porque en un anillo cerrado el número de vueltas se conserva. Con
  extremos libres la torsión sale y K alto endereza todo.
- `r` por sí solo no sirve para medir el estado. Una hélice perfectamente
  organizada tiene `r` bajo. Toca medir también el **enganche**: cuántos agentes
  giran a la misma velocidad que su vecino. Eso sí es sincronía de verdad.

---

## 5. La idea que sí funcionó

Mirando el referente 1 de la unidad (Simple Harmonic Motion de Memo Akten) se me
ocurrió: ¿y si en vez de bolas entrando y saliendo del agua son peces o delfines
saltando, y suenan cuando salen?

Eso resolvió de una todo lo que me molestaba antes:

- La fase se ve sin que nadie la explique: un animal está en el aire o está bajo
  el agua. Nadie necesita que le expliquen qué es θ.
- El sonido es un evento natural, no un mapeo raro: salta → suena.
- La personalidad vive en **cómo salta** cada especie: altura, largo, tamaño,
  cuántos cuerpos. Eso es comportamiento, no color.

La diferencia con Akten, que es lo que tengo que poder sustentar: en Simple
Harmonic Motion los periodos son fijos y el patrón está escrito de antemano. Acá
los animales se miran entre ellos y negocian el patrón. K es el instrumento.

Decidí hacerlo en **2D con vista inclinada**, no 3D. Tres razones: el 3D con
agua deformándose y reflejos es donde se va todo el tiempo sin garantía de que
quede bien, lo que se evalúa no es eso, y en 2D puedo repartir los animales en
el plano y dibujar la **red** entre ellos, que es lo que muestra quién mira a
quién.

---

## 6. Las modificaciones del modelo (esto lo decidí yo)

El encargo dice que se permiten extensiones pero que las tengo que poder
sustentar, y que no deje que la IA decida por mí. Elegí dos, y las dos están en
los ejemplos que el enunciado mismo pone como válidos.

**Extensión 1 — topología por distancia.** El acople entre dos animales depende
de qué tan cerca están:

```
wᵢⱼ = exp(−dᵢⱼ² / 2σ²)
```

Qué cambié: el `1/N` uniforme pasa a ser un peso por pareja, normalizado por la
suma de pesos. Por qué: para que "quién mira a quién" sea algo que se pueda
tocar con la mano. Arrastrar un animal le cambia los vecinos. Y las líneas de la
red son literalmente esos pesos. Con σ grande todos los pesos valen 1 y se
recupera la ecuación original.

**Extensión 2 — especies con carácter en el acople.** Tres números por especie:

```
dθᵢ/dt = ωᵢ + gᵢ · K · Σⱼ wᵢⱼ sin(θⱼ − θᵢ − αᵢ) / Σⱼ wᵢⱼ
```

- `gᵢ` cuánto obedece (orca 0.3 = terca, sardinas 1.3 = gregarias)
- `αᵢ` desfase que busca (pez volador π/3 = salta justo después)
- `ρᵢ` hasta dónde ve (sardinas 2.5 = ven lejos)

El `αᵢ` es Sakaguchi–Kuramoto (1986), no me lo inventé. Con gᵢ=1, αᵢ=0, ρᵢ=1 en
todas vuelve al modelo base, y dejé un botón (tecla B) para alternar en vivo y
poder mostrar la diferencia en la presentación.

Probé valores con un script en Node antes de abrir el navegador. Al pez volador
primero le puse α = π/2 y así la sincronía total nunca llegaba: el estado
estable se volvía un patrón escalonado permanente. Lo bajé a π/3 y ahí sí
conservo los tres estados y el pez sigue entrando a destiempo.

---

## 7. Ajustes después de verlo andando

- El primer sonido quedó muy robótico, con golpes y ruido filtrado. Lo cambié a
  notas de una escala pentatónica, una por animal, más chapoteo al entrar. Más
  melódico, más parecido a Akten.
- Recuperé un gradiente en los ωᵢ (el mar es más rápido a un lado que al otro).
  Sin eso el sistema saltaba directo de desorden a todos juntos y no había
  "ola". Con el gradiente la organización llega cruzando el mar.
- Puse un botón para apagar las líneas blancas de la red, porque a veces tapan
  los animales y se ve mejor sin ellas.
- Pensé en pasarlo a de día, pero de noche los animales brillan al saltar y se
  ve el reflejo en el agua. Lo dejo de noche.

---

## 8. Dónde quedó

Estados que se reconocen (con σ = 1.0 y dispersión 0.6):

| K | qué pasa |
|---|---|
| menor a 0.5 | desorden, saltos sueltos, suena como un carillón |
| 0.5 a 1.3 | organización parcial y la ola: saltan uno tras otro, arpegio |
| 1.6 o más | saltan todos juntos, acorde y un solo chapoteo |

Formas de intervenir: K y σ en vivo (global), tocar un animal para que salte ya,
arrastrarlo para cambiarle los vecinos, volverlo terco con shift, tocar el agua
para asustar a los de alrededor, y la ola de perturbación con espacio.

La prueba de que Kuramoto hace falta: toco un animal para que salte fuera de
turno y el grupo se descoloca y lo reabsorbe solo. Con K alto vuelve rápido, con
K medio vuelve despacio y dudando. Eso no lo hace un temporizador.

---

## 9. Lo que me falta

- Ajustar el balance de volumen entre especies escuchando bien.
- Pulir el dibujo de los animales, todavía son siluetas sencillas.
- Publicar en GitHub Pages.
- Decidir si meto una especie "contraria" (gᵢ negativo), que sería un tercer
  cambio al modelo. Por ahora con dos extensiones ya cumplo y las puedo
  sustentar, así que no quiero meter más sin tener clara la intención.

---

## 10. Autoevaluación

1. Leí y verifiqué que mi proyecto cumple con los requisitos mínimos de la
   unidad (25 puntos). Son 12 agentes, 4 especies, 4 variables en vivo
   (incluida K), interacción global e individual, tres perturbaciones y los
   tres estados con indicador. **Nota: 5**
2. Puedo explicar claramente qué representa cada variable del modelo de
   Kuramoto en mi proyecto (25 puntos). θᵢ es el punto del salto, ωᵢ el tempo
   natural, K cuánto se miran, y también gᵢ, αᵢ, ρᵢ y σ de las extensiones.
   **Nota: 5**
3. Puedo explicar claramente cómo las variables del modelo producen el
   comportamiento observado en mi proyecto (25 puntos). Lo explico con la
   ecuación y lo muestro en vivo con la tecla B. Me falta documentar mejor
   cómo cambian los umbrales de K cuando las especies están activas.
   **Nota: 4**
4. Puedo demostrar que mi proyecto cumple con los objetivos establecidos en la
   unidad (25 puntos). Toco un animal, el grupo se descoloca y lo reabsorbe
   solo, y eso un reloj no lo hace. **Nota: 5**

**Promedio: 4.75 / 5** (equivale a 95 de 100 puntos)
