## Problema

Planear la distribución de una cocina con módulos suele depender de planos 2D, medidas a mano o software que requiere instalación. Es difícil imaginar cómo quedan las piezas combinadas y cuánto espacio ocupan.

## Usuarios

- **Cliente final:** persona que quiere armar y ver la distribución de su cocina antes de cotizar.
- **Vendedor o dueño del negocio:** usa la herramienta para mostrar opciones y medir combinaciones con sus clientes.

## Objetivo

Entregar una versión funcional que corra con Docker, donde el usuario elija distintos tipos de módulo desde un catálogo, los acomode con snapping alineado en posición y rotación, y vea el ancho total de lo que armó.

## Alcance del mes

**Dentro del alcance:** catálogo de 3 tipos de módulo, agregar y mover módulos, snapping con rotación, medición del ancho total, ejecución con Docker.

**Fuera del alcance (por ahora):** cuentas de usuario, guardar diseños, base de datos, cotizaciones, soporte táctil para celular, publicación en WordPress.

## Tecnologías

- Three.js (renderizado 3D, GLTFLoader, DragControls, OrbitControls)
- Blender (modelado y exportación glTF 2.0)
- JavaScript, HTML5 y CSS3
- Docker