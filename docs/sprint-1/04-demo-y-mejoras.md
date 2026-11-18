# Sprint 1: demo y mejoras

[← Volver al índice de documentación](../README.md)

## Objetivo del sprint

El usuario puede agregar distintos tipos de módulo desde un catálogo, y la aplicación se ejecuta con Docker.

## Resultado

| Historia | Issue | Pull request | Estado |
|---|---|---|---|
| Elegir un tipo de módulo de un catálogo para agregarlo a la escena | #2 | #11 | Completada |
| Ejecutar la app con un solo comando de Docker | #3 | #9 | Completada |

Además del alcance comprometido, el sprint incluyó:

- Los 9 modelos de módulos de cocina modelados en Blender y exportados a GLB (pull request #11).
- Arrastre de módulos sobre el piso, con el módulo pegado al cursor desde cualquier ángulo de cámara.
- Snapping entre módulos mediante puntos de anclaje (`Snap_*`).
- Piso redimensionable por el usuario, aviso y resaltado en rojo para módulos fuera del piso, y límites de zoom y paneo de la cámara.

## Demo

### Cómo ejecutarla

```bash
docker build -t visualizador-cocina .
docker run -d --name visualizador -p 8080:80 visualizador-cocina
```

Abrir `http://localhost:8080` en el navegador. La aplicación carga Three.js desde un CDN, por lo que requiere conexión a internet.

### Guion

1. Abrir la página: se muestra el piso y el catálogo de módulos con sus botones.
2. Agregar un módulo desde el catálogo y arrastrarlo por el piso.
3. Agregar un segundo módulo y acercarlo al primero: se alinean por snapping.
4. Arrastrar un módulo fuera del piso: se pone en rojo y aparece el aviso.
5. Cambiar el ancho y el fondo del piso: la cámara y los límites se ajustan.
6. Girar y acercar la cámara, comprobando los límites de zoom.

## Problemas encontrados y cómo se resolvieron

| Problema | Causa | Solución |
|---|---|---|
| La imagen de Docker mostraba la página por defecto de nginx | El `Dockerfile` copiaba la raíz del repositorio, pero la página vive en una subcarpeta | Copiar solo la carpeta de la página y excluir los archivos fuente de Blender con `.dockerignore` |
| Al pasar el cursor por un módulo, a veces solo se resaltaba una pieza | `event.object` era la malla golpeada por el rayo, no el módulo completo | Subir por la jerarquía hasta el objeto raíz del módulo |
| Al resaltar un módulo se resaltaban todos los del mismo tipo | `clone()` comparte materiales entre copias | Clonar los materiales al crear cada módulo |
| El módulo se desfasaba del cursor al arrastrar | `DragControls` arrastra sobre un plano perpendicular a la cámara, no sobre el piso | Arrastre propio con un rayo contra el plano del piso |
| Los módulos aparecían fuera de lugar y no podían moverse bien | Los modelos de Blender no estaban exportados desde el origen, y el pivote quedó lejos de la geometría | Normalizar el pivote al cargar: centro de la huella y base a ras del piso |
| Los límites del piso eran una constante | El tamaño estaba escrito en el código | El piso es un objeto consultado por el arrastre y la cámara, y se redimensiona desde la interfaz |

## Mejora para el siguiente sprint

**Mejora registrada:** el snapping hoy solo alinea la **posición** de los módulos, no su orientación. Un módulo girado puede quedar pegado a otro pero mal orientado. En el sprint 2 se corregirá la rotación al hacer snap, comparando la dirección de los anclajes además de su posición.

**Convención de exportación para modelos nuevos:** durante el sprint se descubrió que los modelos de Blender traían el pivote desplazado. Aunque el código ya lo corrige al cargar, se documentará una convención para los modelos futuros (origen en el centro de la huella y a ras del piso, anclajes con prefijo `Snap_`).

## Backlog propuesto para el sprint 2

| # | Historia | Prioridad |
|---|---|---|
| 3 | Alinear también la rotación al hacer snap | Alta |
| 4 | Ver el ancho total de los módulos conectados | Alta |
| 5 | Eliminar un módulo de la escena | Media |
| 6 | Rotar un módulo 90° antes de colocarlo | Media |
| 7 | Acceder a la herramienta desde la página web del negocio | Baja |

## Limitaciones conocidas

- Three.js se carga desde un CDN, por lo que la aplicación necesita conexión a internet.
- No hay pruebas automatizadas; la verificación se hace manualmente.
- Todavía no está integrada en WordPress.
- Los módulos solo se pueden mover sobre el piso; no hay rotación manual ni eliminación.
