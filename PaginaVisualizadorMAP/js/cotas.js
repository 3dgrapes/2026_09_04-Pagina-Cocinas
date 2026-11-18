import * as THREE from 'three';

// Cotas: líneas de medida en el piso, frente a los módulos, como en un plano.
//   - Cota de grupo (blanca): ancho total de cada fila de 2 o más módulos unidos lado a lado.
//   - Cota individual (naranja): ancho del módulo seleccionado.
// El ancho se mide entre los anclajes Snap_L y Snap_R, que están en las caras donde se unen
// los módulos. Así no cuentan jaladeras ni puertas que sobresalen.

const MARGEN_INDIVIDUAL = 0.12; // distancia (m) entre el frente del módulo y su cota
const MARGEN_GRUPO = 0.30;      // la del grupo va más lejos para que no se encimen
const REMATE = 0.05;            // medio largo de las rayitas en las puntas de la cota
const ALTURA = 0.01;            // un poco sobre el piso para que no parpadee con él
const TOLERANCIA_UNION = 0.01;  // m: anclajes a menos de esto cuentan como unidos
const TOLERANCIA_ANGULO = 0.01; // rad: margen para comparar ángulos (errores de redondeo)

const COLOR_GRUPO = 0xffffff;
const COLOR_INDIVIDUAL = 0xffaa00; // el mismo naranja del gizmo: "esto es del seleccionado"

// Ángulos de las caras laterales (mismo criterio que en ModuloGabinete)
const IZQUIERDA = -Math.PI / 2;
const DERECHA = Math.PI / 2;

// Diferencia entre dos ángulos por el camino corto (entre -π y π)
function diferenciaAngulo(a, b) {
  const d = a - b;
  return Math.atan2(Math.sin(d), Math.cos(d));
}

// El anclaje de un módulo que mira hacia cierto lado, o undefined si no tiene
function anclajeDeLado(modulo, angulo) {
  return modulo.anchors.find((a) => Math.abs(diferenciaAngulo(a.angulo, angulo)) < TOLERANCIA_ANGULO);
}

// Solo se miden módulos con anclaje a la izquierda Y a la derecha.
// El esquinero (izquierda + atrás) queda fuera sin necesidad de nombrarlo.
function esMedible(modulo) {
  return anclajeDeLado(modulo, IZQUIERDA) && anclajeDeLado(modulo, DERECHA);
}

// Las medidas se muestran en cm, como en los planos: 0.425 m → "42.5 cm"
function formatear(metros) {
  return `${Number((metros * 100).toFixed(1))} cm`;
}

export function crearCotas({ scene, camera, renderer, modulos }) {
  const materiales = {
    grupo: new THREE.LineBasicMaterial({ color: COLOR_GRUPO }),
    individual: new THREE.LineBasicMaterial({ color: COLOR_INDIVIDUAL })
  };

  let cotas = [];            // las cotas dibujadas ahora: { linea, centro, texto, estilo }
  const etiquetas = [];      // divs HTML que se reciclan entre recálculos
  const posA = new THREE.Vector3();
  const posB = new THREE.Vector3();
  const enPantalla = new THREE.Vector3();

  // ¿El lado derecho de "a" está pegado al lado izquierdo de "b"?
  function estanUnidos(a, b) {
    anclajeDeLado(a, DERECHA).objeto.getWorldPosition(posA);
    anclajeDeLado(b, IZQUIERDA).objeto.getWorldPosition(posB);
    if (posA.distanceTo(posB) > TOLERANCIA_UNION) return false;

    // Además deben tener el mismo giro (si no, solo se tocan en un punto)
    return Math.abs(diferenciaAngulo(a.mesh.rotation.y, b.mesh.rotation.y)) < TOLERANCIA_ANGULO;
  }

  // Arma las filas: cadenas de módulos unidos de izquierda a derecha
  function armarFilas(medibles) {
    const vecinoDerecho = new Map(); // módulo → el que tiene pegado a su derecha
    const tieneVecinoIzquierdo = new Set();

    for (const a of medibles) {
      for (const b of medibles) {
        if (a !== b && estanUnidos(a, b)) {
          vecinoDerecho.set(a, b);
          tieneVecinoIzquierdo.add(b);
        }
      }
    }

    // Cada fila empieza en un módulo sin nadie a su izquierda y avanza hacia la derecha
    const filas = [];
    for (const inicio of medibles) {
      if (tieneVecinoIzquierdo.has(inicio)) continue;
      const fila = [inicio];
      let actual = inicio;
      // El límite de largo es solo un seguro contra ciclos (no deberían existir)
      while (vecinoDerecho.has(actual) && fila.length <= medibles.length) {
        actual = vecinoDerecho.get(actual);
        fila.push(actual);
      }
      filas.push(fila);
    }
    return filas;
  }

  // Dibuja una cota frente a una fila (o frente a un solo módulo)
  function dibujarCota(fila, margen, estilo) {
    // Ejes propios de la fila: hacia su derecha (+X del módulo) y hacia su frente (+Z del módulo)
    const giro = fila[0].mesh.rotation.y;
    const derecha = new THREE.Vector3(Math.cos(giro), 0, -Math.sin(giro));
    const frente = new THREE.Vector3(Math.sin(giro), 0, Math.cos(giro));

    // Cualquier punto del piso = s·derecha + t·frente. Con dot() se obtienen s y t de un punto.
    // s: dónde empieza y termina la fila (anclaje izquierdo del primero, derecho del último)
    const s0 = anclajeDeLado(fila[0], IZQUIERDA).objeto.getWorldPosition(posA).dot(derecha);
    const s1 = anclajeDeLado(fila.at(-1), DERECHA).objeto.getWorldPosition(posB).dot(derecha);

    // t: la cara más adelantada de la fila (con jaladeras) más el margen.
    // El pivote está en el centro de la huella, así que el frente está a medio fondo.
    let t = -Infinity;
    for (const m of fila) t = Math.max(t, m.mesh.position.dot(frente) + m.dimensiones.z / 2);
    t += margen;

    const punto = (s, tt) => derecha.clone().multiplyScalar(s)
      .add(frente.clone().multiplyScalar(tt)).setY(ALTURA);

    // LineSegments une los puntos de dos en dos: línea principal + un remate en cada punta
    const geometria = new THREE.BufferGeometry().setFromPoints([
      punto(s0, t), punto(s1, t),
      punto(s0, t - REMATE), punto(s0, t + REMATE),
      punto(s1, t - REMATE), punto(s1, t + REMATE)
    ]);
    const linea = new THREE.LineSegments(geometria, materiales[estilo]);
    scene.add(linea);

    cotas.push({ linea, centro: punto((s0 + s1) / 2, t), texto: formatear(s1 - s0), estilo });
  }

  // Borra las cotas anteriores (las etiquetas no se borran: se reciclan)
  function limpiar() {
    for (const c of cotas) {
      scene.remove(c.linea);
      c.linea.geometry.dispose(); // los materiales son compartidos y se quedan
    }
    cotas = [];
  }

  function obtenerEtiqueta(i) {
    if (!etiquetas[i]) {
      const div = document.createElement('div');
      div.style.cssText = 'position:absolute; z-index:10; pointer-events:none;' +
        'transform:translate(-50%, -50%); padding:1px 6px; border-radius:4px; font:12px sans-serif;';
      document.body.appendChild(div);
      etiquetas[i] = div;
    }
    return etiquetas[i];
  }

  // Se llama cuando cambia algo en la escena (mover, rotar, borrar, seleccionar...)
  function recalcular(seleccionado) {
    limpiar();

    // Se trabaja con las instancias de ModuloGabinete, no con los mesh
    const medibles = modulos.map((m) => m.userData.modulo).filter(esMedible);

    for (const fila of armarFilas(medibles)) {
      if (fila.length >= 2) dibujarCota(fila, MARGEN_GRUPO, 'grupo'); // un módulo solo no es "grupo"
    }

    const sel = seleccionado?.userData.modulo; // ?. por si no hay nada seleccionado
    if (sel && esMedible(sel)) dibujarCota([sel], MARGEN_INDIVIDUAL, 'individual');

    // Prepara una etiqueta por cota y oculta las que sobran
    etiquetas.forEach((div) => { div.style.display = 'none'; });
    cotas.forEach((c, i) => {
      const div = obtenerEtiqueta(i);
      div.textContent = c.texto;
      div.style.background = c.estilo === 'grupo' ? 'rgba(0,0,0,0.65)' : 'rgba(255,170,0,0.9)';
      div.style.color = c.estilo === 'grupo' ? '#fff' : '#000';
    });
  }

  // Se llama en cada frame: la cámara se mueve, así que las etiquetas se reacomodan
  function actualizarEtiquetas() {
    const rect = renderer.domElement.getBoundingClientRect();
    cotas.forEach((c, i) => {
      const div = etiquetas[i];
      enPantalla.copy(c.centro).project(camera); // de metros a pantalla (-1 a 1)
      if (enPantalla.z > 1) { div.style.display = 'none'; return; } // detrás de la cámara
      div.style.display = 'block';
      div.style.left = `${rect.left + (enPantalla.x + 1) / 2 * rect.width}px`;
      div.style.top = `${rect.top + (1 - enPantalla.y) / 2 * rect.height}px`;
    });
  }

  return { recalcular, actualizarEtiquetas };
}
