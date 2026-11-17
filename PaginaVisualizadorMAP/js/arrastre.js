import * as THREE from 'three';

const UMBRAL_SNAP = 0.15;
const TOLERANCIA = 0.001;    // evita falsos "fuera" por redondeo cuando el módulo queda pegado al borde
const MARGEN_ARRASTRE = 1;   // cuánto se puede sacar un módulo del piso antes de que ya no siga al cursor
const COLOR = { normal: 0x000000, hover: 0x2255aa, arrastre: 0xaaaaaa, error: 0xff0000 };

function aplicarEmissive(objeto, color) {
  objeto.traverse((hijo) => {
    if (hijo.isMesh) hijo.material.emissive.set(color);
  });
}

export function crearArrastre({ modulos, camera, renderer, orbit, piso, alCambiarEstado }) {
  const canvas = renderer.domElement;
  const raycaster = new THREE.Raycaster();
  const puntero = new THREE.Vector2();
  const planoPiso = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const puntoPiso = new THREE.Vector3();
  const offset = new THREE.Vector3();

  let arrastrando = null;
  let hover = null;

  function obtenerRaiz(objeto) {
    let actual = objeto;
    while (actual.parent && !modulos.includes(actual)) actual = actual.parent;
    return actual;
  }

  function apuntarRayo(event) {
    const rect = canvas.getBoundingClientRect();
    puntero.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    puntero.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(puntero, camera);
  }

  function moduloBajoPuntero() {
    const golpes = raycaster.intersectObjects(modulos, true);
    return golpes.length > 0 ? obtenerRaiz(golpes[0].object) : null;
  }

  // Límites ---------------------------------------------------------------------------
  function estaFuera(modulo) {
    const l = piso.obtenerLimites();
    const c = new THREE.Box3().setFromObject(modulo);
    return c.min.x < l.min.x - TOLERANCIA || c.max.x > l.max.x + TOLERANCIA ||
           c.min.z < l.min.z - TOLERANCIA || c.max.z > l.max.z + TOLERANCIA;
  }

  // El rojo tiene prioridad sobre cualquier otro estado
  function refrescarColor(modulo) {
    let color = COLOR.normal;
    if (modulo.userData.fueraDeLimites) color = COLOR.error;
    else if (modulo === arrastrando) color = COLOR.arrastre;
    else if (modulo === hover) color = COLOR.hover;
    aplicarEmissive(modulo, color);
  }

  function notificar() {
    alCambiarEstado?.(modulos.filter((m) => m.userData.fueraDeLimites).length);
  }

  function revisarModulo(modulo) {
    modulo.userData.fueraDeLimites = estaFuera(modulo);
    refrescarColor(modulo);
    notificar();
  }

  // Úsala al agregar un módulo o al cambiar el tamaño del piso
  function revisarTodos() {
    for (const m of modulos) {
      m.userData.fueraDeLimites = estaFuera(m);
      refrescarColor(m);
    }
    notificar();
  }

  // Eliminar --------------------------------------------------------------------------
  // Quita el módulo de la escena y de la lista
  function quitar(modulo) {
    if (arrastrando) return;           // no se borra a medio arrastre
    const i = modulos.indexOf(modulo); // -1 si no está en la lista
    if (i === -1) return;

    modulos.splice(i, 1);              // fuera de la lista: ya no lo ven el raycaster ni el snapping
    modulo.removeFromParent();         // fuera de la escena: ya no se dibuja
    modulo.userData.modulo.liberar();  // libera sus materiales

    if (hover === modulo) {
      hover = null;
      canvas.style.cursor = 'auto';
    }
    notificar(); // si estaba en rojo, el aviso debe actualizarse
  }

  // Snapping --------------------------------------------------------------------------
  function intentarSnap(moduloActivo) {
    const anchorsActivo = moduloActivo.userData.modulo.obtenerAnchors();

    for (const otro of modulos) {
      if (otro === moduloActivo) continue;
      const anchorsOtro = otro.userData.modulo.obtenerAnchors();

      for (const anchorA of anchorsActivo) {
        const posA = new THREE.Vector3();
        anchorA.getWorldPosition(posA);

        for (const anchorB of anchorsOtro) {
          const posB = new THREE.Vector3();
          anchorB.getWorldPosition(posB);

          if (posA.distanceTo(posB) < UMBRAL_SNAP) {
            moduloActivo.position.add(posB.clone().sub(posA));
            return;
          }
        }
      }
    }
  }

  // Eventos de puntero ----------------------------------------------------------------
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    apuntarRayo(e);
    const modulo = moduloBajoPuntero();
    if (!modulo) return;

    e.stopImmediatePropagation();
    arrastrando = modulo;
    orbit.enabled = false;

    raycaster.ray.intersectPlane(planoPiso, puntoPiso);
    offset.copy(modulo.position).sub(puntoPiso);

    refrescarColor(modulo);
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  }, { capture: true });

  canvas.addEventListener('pointermove', (e) => {
    apuntarRayo(e);

    if (arrastrando) {
      if (raycaster.ray.intersectPlane(planoPiso, puntoPiso)) {
        // Tope duro: el piso más un margen, solo para no "perder" el módulo
        const l = piso.obtenerLimites();
        arrastrando.position.x = THREE.MathUtils.clamp(
          puntoPiso.x + offset.x, l.min.x - MARGEN_ARRASTRE, l.max.x + MARGEN_ARRASTRE);
        arrastrando.position.z = THREE.MathUtils.clamp(
          puntoPiso.z + offset.z, l.min.z - MARGEN_ARRASTRE, l.max.z + MARGEN_ARRASTRE);
        revisarModulo(arrastrando);
      }
      return;
    }

    const modulo = moduloBajoPuntero();
    if (modulo !== hover) {
      const anterior = hover;
      hover = modulo;
      if (anterior) refrescarColor(anterior);
      if (hover) refrescarColor(hover);
      canvas.style.cursor = hover ? 'grab' : 'auto';
    }
  });

  function soltar(e) {
    if (!arrastrando) return;
    const modulo = arrastrando;
    arrastrando = null;
    orbit.enabled = true;

    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);

    intentarSnap(modulo);
    hover = modulo;
    revisarModulo(modulo); // el snap pudo moverlo, se vuelve a revisar
    canvas.style.cursor = 'grab';
  }

  canvas.addEventListener('pointerup', soltar);
  canvas.addEventListener('pointercancel', soltar);

  // Lo que index.html puede usar. obtenerHover es una función (no el valor) para que
  // siempre devuelva el hover actual, no el que había al crear el arrastre.
  return { revisarTodos, quitar, obtenerHover: () => hover };
}