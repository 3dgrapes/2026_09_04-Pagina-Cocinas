# Visualizador 3D de módulos de cocina

Página web para planear el layout de una cocina: el usuario agrega módulos 3D desde un catálogo, los arrastra sobre un piso y los une por snapping. Debe funcionar en el navegador sin instalar nada. Es proyecto para el negocio de cocinas de un familiar y, a la vez, proyecto universitario de una sola persona (proceso tipo Scrum de un mes, con entregables en GitHub).

Idioma de trabajo: español. Responde y comenta el código en español.

## Cómo trabajar conmigo

- Aprendo haciendo. Explica el porqué de cada cambio y prefiere cambios pequeños y localizados a reescribir archivos completos, salvo que lo pida.
- Vengo de GameMaker (GML); JavaScript me resulta natural, pero conceptos como asincronía, scope y módulos ES todavía los estoy asentando.
- Si algo no coincide con estas notas, confía en el código del repositorio y avísame.

## Stack

- **Three.js 0.184** por CDN con `importmap` en `index.html` (sin bundler, sin npm). Las dos líneas del importmap (`three` y `three/addons/`) deben llevar siempre la misma versión.
- **Blender → GLB** (glTF 2.0). FBX se descartó por sus referencias de texturas frágiles.
- **Docker** con `nginx:alpine` sirviendo la carpeta estática.
- **VS Code + Live Server** para desarrollar. Hay que abrir la página por `http://`, nunca con doble clic (`file://`), porque falla la carga de modelos.
- Aplazados: WordPress (despliegue), Vite y TypeScript (migración futura), base de datos (no hace falta por ahora).

## Estructura

```
Dockerfile, .dockerignore, .gitignore, README.md
docs/                       documentación (docs/sprint-1/, docs/sprint-2/Sprint2.md)
PaginaVisualizadorMAP/      la aplicación (es lo único que copia el Dockerfile)
  index.html                orquesta: escena, cámara, luces, botones, teclado (Supr, Esc)
  js/
    catalogo.js             DEFINICIONES de los tipos de módulo, precarga de GLB, obtenerModelo(tipo)
    ModuloGabinete.js       clase del módulo (tipo, mesh, dimensiones, anchors con dirección, liberar())
    arrastre.js             selección, arrastre, rotación, resaltado, límites, snapping, quitar()
    gizmoRotacion.js        anillo + esfera + etiqueta de grados del módulo seleccionado
    colocacion.js           buscarLugarLibre(): dónde aparece un módulo nuevo
    cotas.js                líneas de medida (ancho de filas unidas y del seleccionado)
    piso.js                 piso redimensionable
    camara.js               límites de zoom y paneo según el piso
  models/                   GLB exportados
@ Modelos/                  solo Gabinetes.blend (+ .blend1); @ Planos/: medidas en JPG
                            (en .gitignore y .dockerignore, pero Git aún los rastrea)
```

## Comandos

```bash
# Desarrollo: abrir PaginaVisualizadorMAP/index.html con Live Server

# Ejecutar como en la entrega
docker build -t visualizador-cocina .
docker run -d --name visualizador -p 8080:80 visualizador-cocina   # http://localhost:8080
docker rm -f visualizador                                         # para reconstruir
```

La imagen guarda una copia de los archivos: tras cambiar código hay que reconstruir.

## Decisiones de diseño que no hay que deshacer

- **El catálogo es un arreglo de datos** (`DEFINICIONES` en `catalogo.js`). Agregar un tipo de módulo es agregar una línea; los botones se generan solos.
- **Los modelos se precargan una vez** y cada módulo nuevo es un `clone()`. Como `clone()` comparte materiales, `ModuloGabinete` **clona los materiales** de cada instancia; si no, el resaltado afecta a todos los módulos del mismo tipo.
- **Pivote normalizado al cargar:** los modelos de Blender no salieron desde el origen, así que `ModuloGabinete` mete el modelo en un `Group` y lo desplaza para que el origen quede en el centro de la huella y la base en `y = 0`. El `Group` (`modulo.mesh`) es lo que se mueve, se arrastra y se rota. Las dimensiones salen de `Box3`, no se escriben a mano.
- **Criterio único de ángulos:** 0 = frente (+Z), π/2 = derecha (+X), π = atrás, −π/2 = izquierda; se calcula con `atan2(x, z)`, igual que `rotation.y`. La dirección de algo en el mundo = su ángulo propio + `rotation.y` del módulo.
- **Anchors de snapping:** Empties `Snap_*` buscados por nombre al crear el módulo (`this.anchors`, cada uno `{ objeto, angulo }`). La dirección de cada anchor se **deduce de la cara en la que está**, no del nombre (el esquinero tiene su `R` en la cara de atrás).
- **Snap con rotación:** al soltar (tras arrastrar o rotar), se busca el par de anchors más cercano a menos de `UMBRAL_SNAP` (0.15) que se miren de frente con error ≤ `TOLERANCIA_GIRO` (30°); el módulo se gira lo justo y luego se desplaza. Así se evitan uniones L-L. Solo se mueve el módulo soltado.
- **Selección y rotación:** clic selecciona; el gizmo (anillo naranja + esfera al frente) es un objeto **aparte**, no hijo del módulo, para no alterar su `Box3`. La rotación usa la diferencia de ángulos del mouse alrededor del módulo, redondeada a pasos de 5°. Clic en el vacío sin mover el mouse o Esc deseleccionan.
- **Box3 exacto:** los chequeos usan `setFromObject(obj, true)` (vértices reales). Sin `true`, un módulo girado (sobre todo el esquinero) tiene una caja inflada y se marca en rojo de más.
- **Eliminar:** Supr borra el seleccionado (o el que está bajo el cursor). Se liberan solo materiales: la geometría la comparten las copias del catálogo.
- **Cotas (ancho):** el ancho se mide **entre `Snap_L` y `Snap_R`**, no con `Box3` (el `Box3` incluye jaladeras: el gabinete da 65 cm de fondo y el esquinero 97 cm en vez de 95). Solo son "medibles" los módulos con anchor a la izquierda y a la derecha, así que el esquinero queda fuera sin nombrarlo. Dos módulos forman fila si el anchor derecho de uno está a < 1 cm del izquierdo del otro y tienen el mismo giro. Cota de grupo blanca (filas de 2+, a 30 cm del frente) y cota individual naranja (solo el seleccionado, a 12 cm). Medidas en cm. `arrastre.js` avisa con `alCambiarEscena` y `index.html` llama a `cotas.recalcular(seleccionado)`; las etiquetas HTML se reacomodan cada frame.
- **Lugar libre:** los módulos nuevos se colocan en una cuadrícula de 10 cm, del centro del piso hacia afuera, en la primera posición sin choque de cajas.
- **Arrastre propio** (no `DragControls`): raycaster contra el plano `y = 0`, para que el módulo siga al cursor sin importar el ángulo de cámara. `DragControls` arrastra sobre un plano perpendicular a la cámara y se desfasaba.
- **Módulo raíz:** un rayo golpea una malla hija (puerta, jaladera); siempre se sube por los padres hasta el mesh raíz registrado en la lista de módulos.
- **Estados por color (emissive):** hover azul, arrastre/rotación gris, fuera del piso rojo. El rojo tiene prioridad. No uses rojo para otra cosa. El gizmo de selección es naranja.
- **El piso es un objeto, no una constante.** Se redimensiona desde la interfaz; el chequeo de "fuera del piso" (`Box3` del módulo contra el piso) y la cámara lo consultan. El tope duro de arrastre (piso + 1 unidad) solo evita perder módulos.
- **Cámara limitada** al área del piso: zoom mínimo/máximo, sin pasar bajo el piso, punto de mira restringido al piso.

## Convenciones

- Nombres de dominio en español (`ModuloGabinete`, `buscarLugarLibre`, `DEFINICIONES`).
- Comentarios cortos que expliquen el porqué: el usuario mantendrá el código solo, quizá tras meses sin verlo.
- **Respetar mayúsculas y minúsculas en los nombres de archivo** de los GLB: Windows no distingue, nginx en Docker sí (da 404).
- Los GLB van solo en `PaginaVisualizadorMAP/models/`; `@ Modelos/` guarda únicamente el `.blend`.
- **Convención de exportación** (documentada en `docs/sprint-2/Sprint2.md`): frente en +Z (−Y en Blender); `Snap_L`/`Snap_R` simétricos en las caras laterales y a 30 cm de la espalda; `Snap_B` en la espalda, en el punto medio entre `Snap_L` y `Snap_R`. Las unidades son metros.
- Avisos `X4122` de WebGL/ANGLE en la consola son ruido de precisión flotante, no errores. Si un modelo no aparece, primero revisar escala sin aplicar en Blender.

## Flujo de Git (exigido por el curso)

- Trabajo solo, con GitHub Desktop. Una rama y un pull request por tema: `feature/...`, `docs/...`.
- Cada pull request enlaza su issue: `Closes #N` si lo termina, `Refs #N` si no.
- No hay otro integrante que revise: cada pull request se autorrevisa con la lista de verificación (corre con Docker, caso normal y un caso de error probados, sin `console.log` de depuración, mayúsculas de archivos correctas, issue enlazado).
- No hacer commits directos a `main`.
- Tablero de GitHub Projects con una tarjeta por historia; milestones por sprint.
- GitHub Desktop no tiene `git rm --cached`; para eso se usa la terminal.

## Estado actual

Sprint 1 y sprint 2 fusionados en `main`. Trazabilidad (issue → pull request): Docker #3 → #9, catálogo #2 → #11, eliminar #6 → #12, rotar #7 y snap con rotación #4 → #16, docs del sprint 2 → #17.

Funciona: catálogo de 9 módulos, arrastre, selección, rotación en pasos de 5°, snap con rotación (lado a lado, espalda con espalda, esquinero), eliminar, colocación en lugar libre, piso redimensionable, límites de cámara, Docker.

En curso (rama `feature/ancho-total`, 2026-11-17): **cotas de ancho** implementadas y probadas en el navegador por el usuario (fila recta, filas giradas, selección). Falta: probar con Docker, pull request de la historia 4 del backlog y documentarlo (crear `docs/sprint-3/` si se abre un sprint nuevo).

## Pendientes

1. **Esquinero:** el usuario cree que el modelo no funciona como pensaba (forma/anclajes) y debe aclarar cómo se mide antes de tocarlo. Hoy queda fuera de las cotas. No modificar su lógica hasta que el usuario lo defina.
2. **Estado de carga del catálogo:** los docs prometen "Cargando..." y no existe; si un GLB falla, no aparecen botones ni mensaje.
3. Alacena: sus `Snap_L`/`Snap_R` están a 29 cm de la espalda, no a 30 cm (se desfasa 1 cm junto a módulos de piso).
4. Dejar de rastrear `@ Modelos/Gabinetes.blend1` y decidir si `.blend` y `@ Planos/` se quedan en GitHub (y alinear el `.gitignore`).
5. Título de la página: sigue "Visor de cocina - punto de partida".
6. Acceso desde la página web del negocio (WordPress, prioridad baja).
7. Más adelante: Three.js sin CDN para funcionar sin internet; migrar a Vite y TypeScript.
8. **Acabados** (texturas de piso y cubiertas): idea registrada, **no implementar hasta que el cliente la apruebe y la pague**. Requiere que la tapa tenga su propio material en Blender y nombres de material uniformes.

## Decisiones abiertas

- Qué hacer al soltar un módulo fuera del piso: hoy se queda en rojo donde se soltó; la alternativa es regresarlo a su última posición válida.
- La búsqueda de lugar libre usa cajas alineadas a los ejes: no aprovecha el hueco de la "L" del esquinero.
- Cotas: las líneas de WebGL miden siempre 1 px; si se ven delgadas, cambiar a rectángulos planos. Las filas que dan vuelta (con esquinero) deberían mostrar una medida por pared.
