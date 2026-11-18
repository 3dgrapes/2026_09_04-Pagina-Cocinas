# Sprint 2: demo y mejoras

[← Volver al índice de documentación](../README.md)

## Objetivo del sprint

El usuario puede eliminar y rotar módulos, y al unirlos por snapping quedan alineados tanto en posición como en orientación.

## Resultado

| Historia | Issue | Pull request | Estado |
|---|---|---|---|
| Eliminar un módulo de la escena | #6 | #12 | Completada |
| Rotar un módulo sobre el piso | #7 | #16 | Completada |
| Alinear también la rotación al hacer snap | #4 | #16 | Completada |

> La historia original pedía rotar el módulo en pasos de 90° antes de colocarlo. Se cambió por una rotación libre en pasos de 5°, con un control visual sobre el piso: es más flexible y el snapping se encarga de dejar el ángulo exacto al unir módulos.

Además del alcance comprometido, el sprint incluyó:

- **Colocación en lugar libre:** los módulos nuevos aparecen en el espacio libre más cercano al centro del piso, sin encimarse con los existentes. Si el piso está lleno, se avisa al usuario.
- **Selección de módulos:** al hacer clic en un módulo se selecciona y aparece un indicador en su base.
- **Corrección del chequeo de límites** para módulos girados con formas irregulares (esquinero).
- **Modelos reexportados:** anclajes corregidos, anclajes nuevos en la isla y el sink, y reducción del peso de `GabinetePuertas.glb` de 9.7 MB a 1.8 MB.
- **Limpieza del repositorio:** se eliminaron los modelos GLB duplicados de la carpeta de fuentes de Blender.

## Funcionalidades nuevas

### Eliminar módulos

- Se elimina el módulo seleccionado con la tecla **Supr** (o Retroceso). Si no hay ninguno seleccionado, se elimina el que está bajo el cursor.
- Al eliminarlo, el módulo sale de la escena y de la lista de módulos (deja de participar en el arrastre y el snapping) y se libera la memoria de sus materiales.
- Si el módulo eliminado estaba fuera del piso, el aviso rojo se actualiza.
- La tecla se ignora mientras se escribe en los campos de tamaño del piso.

### Colocación en lugar libre

- Se prueban posiciones en una cuadrícula de 10 cm sobre el piso, ordenadas desde el centro hacia afuera.
- Se elige la primera cuya caja no choca con la de ningún módulo existente.
- Si ninguna posición sirve, se muestra el mensaje "No hay espacio libre en el piso para este módulo".

### Selección y rotación

- **Clic** en un módulo lo selecciona: aparece un anillo naranja en su base y una esfera al frente.
- **Arrastrar la esfera** gira el módulo sobre el piso hacia donde se mueva el mouse, en pasos de **5°**. Una etiqueta junto a la esfera muestra el ángulo (0° a 355°).
- La rotación es solo alrededor del eje vertical: el módulo nunca se inclina.
- **Clic en el vacío** (sin mover el mouse) o **Esc** quita la selección. Girar la cámara no la quita.
- Mientras se rota, el módulo se marca en gris, igual que al arrastrarlo, y se pone rojo si una esquina sale del piso.

### Snapping con rotación

Al soltar un módulo, ya sea después de arrastrarlo o de rotarlo:

1. Se buscan pares de anclajes (uno del módulo y uno de otro) a menos de 15 cm de distancia.
2. Solo se aceptan los pares cuyos anclajes **se miran casi de frente**, con una tolerancia de ±30°. Esto evita uniones sin sentido, como dos lados izquierdos.
3. Se elige el par más cercano.
4. El módulo se **gira** lo necesario para quedar exactamente frente al otro y luego se **desplaza** para que los anclajes coincidan.

En la práctica, el usuario orienta el módulo aproximadamente y el snapping lo deja exacto. Funciona lado a lado, espalda con espalda y en las dos caras del esquinero.

## Demo

### Cómo ejecutarla

```bash
docker build -t visualizador-cocina .
docker run -d --name visualizador -p 8080:80 visualizador-cocina
```

Abrir `http://localhost:8080` en el navegador.

### Guion

1. Agregar varios módulos: aparecen juntos alrededor del centro, sin encimarse.
2. Eliminar uno de en medio con Supr y agregar otro: el nuevo ocupa el hueco.
3. Seleccionar un módulo y girarlo con la esfera, observando la etiqueta de grados.
4. Girar un gabinete unos 20° y acercarlo al costado de otro: al soltarlo se endereza y se une.
5. Poner un gabinete a 180° y unir su espalda con la de otro.
6. Unir gabinetes a las dos caras del esquinero.
7. Girar el esquinero junto al borde del piso: solo se pone rojo cuando la madera cruza el borde.
8. Reducir el piso a 1 × 1 m y agregar módulos hasta ver el aviso de que no hay espacio.

## Problemas encontrados y cómo se resolvieron

| Problema | Causa | Solución |
|---|---|---|
| Al eliminar módulos, los nuevos aparecían encima de otros | La posición inicial se calculaba con el número de módulos en escena, que baja al eliminar | Buscar un lugar libre en el piso comparando las cajas de los módulos |
| El esquinero girado se marcaba en rojo sin salirse del piso | `Box3.setFromObject` por defecto gira la caja de cada pieza y la vuelve a encerrar, por lo que crece de más con el módulo girado | Usar `setFromObject(objeto, true)`, que calcula la caja con los vértices reales. Como el piso es un rectángulo alineado a los ejes, el chequeo queda exacto |
| No se podía saber hacia dónde mira un anclaje por su nombre | El esquinero tiene su anclaje "R" en la cara de atrás, no en la derecha | Deducir la dirección de cada anclaje a partir de la cara del módulo en la que está |
| Los gabinetes unidos espalda con espalda quedaban desfasados 1 a 2.5 cm | Los anclajes `Snap_B` no estaban centrados; al girar un módulo 180°, el desfase queda del lado contrario y se duplica | Colocar `Snap_B` en Blender en el punto medio entre `Snap_L` y `Snap_R` |
| El indicador de rotación podía alterar los chequeos de límites | Si el anillo fuera hijo del módulo, su caja lo incluiría | El indicador es un objeto aparte que copia la posición y rotación del módulo en cada cuadro |

## Decisiones técnicas

- **Ángulos con un solo criterio:** en todo el código, 0 = frente (+Z), 90° = derecha (+X), 180° = atrás. Así, la dirección de un anclaje en el mundo es su ángulo propio más el giro del módulo.
- **Rotación por diferencia de ángulos:** el giro se calcula a partir de cuánto ha rodeado el mouse al módulo desde que se tomó la esfera, no del ángulo absoluto. Esto evita un salto inicial si la esfera no se toma justo por el centro.
- **Diferencia angular por el camino corto:** de 350° a 10° hay 20°, no −340°. Se calcula con `atan2(sen, cos)` de la diferencia.
- **Selección sin color nuevo:** el anillo indica la selección, así que se conservan los colores existentes (azul para hover, gris para arrastre y rojo para fuera del piso).

## Convención de exportación de modelos

Reglas descubiertas durante el sprint, que deben cumplir los modelos nuevos:

1. El modelo mira hacia el frente en +Z (en Blender, hacia −Y).
2. Los anclajes son Empties con prefijo `Snap_`, emparentados al modelo.
3. `Snap_L` y `Snap_R` van en las caras laterales, simétricos respecto al centro.
4. `Snap_B` va en la cara de atrás, en el punto medio entre `Snap_L` y `Snap_R`.
5. `Snap_L` y `Snap_R` van a 30 cm de la espalda, para que las espaldas queden parejas al unir módulos distintos.
6. Los GLB se exportan a `PaginaVisualizadorMAP/models/`, respetando mayúsculas y minúsculas en el nombre del archivo.

## Pendientes y mejoras para el siguiente sprint

| Historia del backlog | Historia o mejora | Prioridad |
|---|---|---|
| 4 | Ver el ancho total de los módulos conectados | Alta |
| 13 | Visualización del precio total de los módulos | Alta |
| 14 | Mejora de GUI general | Media |
| — | Sacar del repositorio los archivos que el `.gitignore` excluye pero siguen rastreados (`.blend1`, planos) | Baja |
| 7 | Acceder a la herramienta desde la página web del negocio | Baja |
| — | Elegir acabados de piso y cubiertas (madera, mármol, etc.), sujeto a aprobación del cliente | Por definir |

## Limitaciones conocidas

- Three.js se carga desde un CDN, por lo que la aplicación necesita conexión a internet.
- No hay pruebas automatizadas; la verificación se hace manualmente.
- La búsqueda de lugar libre usa cajas alineadas a los ejes: no aprovecha huecos como el interior de la "L" del esquinero.
- No hay soporte táctil para celular.
