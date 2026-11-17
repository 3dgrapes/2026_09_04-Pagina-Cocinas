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
docs/                       documentación (docs/sprint-1/ para el sprint actual)
PaginaVisualizadorMAP/      la aplicación (es lo único que copia el Dockerfile)
  index.html                orquesta: escena, cámara, luces, botones
  js/
    catalogo.js             DEFINICIONES de los tipos de módulo, precarga de GLB, obtenerModelo(tipo)
    ModuloGabinete.js       clase del módulo (tipo, mesh, dimensiones, anchors)
    arrastre.js             arrastre sobre el piso, resaltado, límites, snapping
    piso.js                 piso redimensionable
    camara.js               límites de zoom y paneo según el piso
  models/                   GLB exportados
@ Modelos/, @ Planos/       fuentes de Blender y planos (ignorados por Git y por Docker)
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
- **Pivote normalizado al cargar:** los modelos de Blender no salieron desde el origen, así que `ModuloGabinete` mete el modelo en un `Group` y lo desplaza para que el origen quede en el centro de la huella y la base en `y = 0`. El `Group` (`modulo.mesh`) es lo que se mueve, se arrastra y se rotará. Las dimensiones salen de `Box3`, no se escriben a mano.
- **Anchors de snapping:** Empties llamados `Snap_*`, emparentados al módulo en Blender y buscados por nombre con `traverse`. Al soltar un módulo, si un anchor queda a menos de `UMBRAL_SNAP` (0.15) de otro, se desplaza el módulo. Hoy solo alinea posición.
- **Arrastre propio** (no `DragControls`): raycaster contra el plano `y = 0`, para que el módulo siga al cursor sin importar el ángulo de cámara. `DragControls` arrastra sobre un plano perpendicular a la cámara y se desfasaba.
- **Módulo raíz:** un rayo golpea una malla hija (puerta, jaladera); siempre se sube por los padres hasta el mesh raíz registrado en la lista de módulos.
- **Estados por color (emissive):** hover azul, arrastre gris, fuera del piso rojo. El rojo tiene prioridad. No uses rojo para otra cosa.
- **El piso es un objeto, no una constante.** Se redimensiona desde la interfaz; el chequeo de "fuera del piso" (`Box3` del módulo contra el piso) y la cámara lo consultan. El tope duro de arrastre (piso + 1 unidad) solo evita perder módulos.
- **Cámara limitada** al área del piso: zoom mínimo/máximo, sin pasar bajo el piso, punto de mira restringido al piso.

## Convenciones

- Nombres de dominio en español (`ModuloGabinete`, `obtenerAnchors`, `DEFINICIONES`).
- **Respetar mayúsculas y minúsculas en los nombres de archivo** de los GLB: Windows no distingue, nginx en Docker sí (da 404).
- Los modelos van en `PaginaVisualizadorMAP/models/`, nunca en `@ Modelos/`.
- Convención para modelos nuevos (por documentar): origen en el centro de la huella y a ras del piso, anclajes con prefijo `Snap_`.
- Avisos `X4122` de WebGL/ANGLE en la consola son ruido de precisión flotante, no errores. Si un modelo no aparece, primero revisar escala sin aplicar en Blender.

## Flujo de Git (exigido por el curso)

- Trabajo solo, con GitHub Desktop. Una rama y un pull request por tema: `feature/...`, `docs/...`.
- Cada pull request enlaza su issue: `Closes #N` si lo termina, `Refs #N` si no.
- No hay otro integrante que revise: cada pull request se autorrevisa con la lista de verificación (corre con Docker, caso normal y un caso de error probados, sin `console.log` de depuración, mayúsculas de archivos correctas, issue enlazado).
- No hacer commits directos a `main`.
- Tablero de GitHub Projects con una tarjeta por historia; milestone "Sprint 1".

## Estado actual

Hecho: flujo Blender → GLB → navegador, 9 modelos exportados (menos de 1.2 MB cada uno), Docker funcionando y fusionado, catálogo con arrastre, snapping por posición, piso redimensionable y límites de cámara funcionando en local.

Pendiente del sprint 1 (entrega):
1. Commits por tema en `feature/catalogo`, probar con Docker y pull request con `Closes #1`.
2. Confirmar que el pull request de los modelos esté fusionado.
3. Pull request de documentación en `docs/sprint-1/`: reemplazar los `#N`, enlazar `04-demo-y-mejoras.md` desde el índice de `docs/`, agregar al README los enlaces de repositorio y tablero y la tabla de trazabilidad.
4. Tablero de GitHub: tarjetas, etiquetas de prioridad, milestone; dar acceso al profesor al repositorio y al tablero.
5. Hacer la demo y completar las casillas del archivo de demo.

## Decisiones abiertas

- Alcance del catálogo: los docs dicen 3 tipos y existen 9; unificar.
- Qué hacer al soltar un módulo fuera del piso: hoy se queda en rojo donde se soltó; la alternativa es regresarlo a su última posición válida.
- Unidades: verificar que los modelos estén en metros (los campos del piso dicen "m").
- La posición inicial de módulos nuevos es un desplazamiento temporal por conteo.

## Backlog del sprint 2

1. Alinear también la **rotación** al hacer snap (comparar la dirección de los anclajes, no solo su posición). Mejora registrada para el siguiente sprint.
2. Medir el **ancho total** de módulos conectados con `Box3`.
3. **Eliminar** un módulo.
4. **Rotar** 90° (se apoya en el pivote normalizado).
5. Acceso desde la página web del negocio (prioridad baja).
6. Documentar la convención de exportación de modelos.
7. Más adelante: Three.js sin CDN para funcionar sin internet; migrar a Vite y TypeScript.
