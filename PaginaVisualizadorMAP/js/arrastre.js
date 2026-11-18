import * as THREE from 'three';

const UMBRAL_SNAP = 0.15;
const TOLERANCIA = 0.001;    // evita falsos "fuera" por redondeo cuando el módulo queda pegado al borde
const MARGEN_ARRASTRE = 1;   // cuánto se puede sacar un módulo del piso antes de que ya no siga al cursor
const COLOR = { normal: 0x000000, hover: 0x2255aa, arrastre: 0xaaaaaa, error: 0xff0000 };
const PASO_ROTACION = THREE.MathUtils.degToRad(5); // la rotación avanza de 5 en 5 grados
const UMBRAL_CLIC = 5;       // píxeles: si el mouse se movió menos, fue un clic y no un giro de cámara

function aplicarEmissive(objeto, color) {
  objeto.traverse((hijo) => {
    if (hijo.isMesh) hijo.material.emissive.set(color);
  });
}

export function crearArrastre({ modulos, camera, renderer, orbit, piso, gizmo, alCambiarEstado }) {
  const canvas = renderer.domElement;
  const raycaster = new THREE.Raycaster();
  const puntero = new THREE.Vector2();
  const planoPiso = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const puntoPiso = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const inicioClic = new THREE.Vector2(); // dónde se apretó el botón, para distinguir clic de arrastre

  let arrastrando = null;
  let hover = null;
  let seleccionado = null;
  let rotando = null;
  let anguloInicio = 0;    // ángulo del mouse alrededor del módulo al apretar la esfera
  let rotacionInicio = 0;  // rotación que tenía el módulo en ese momento

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

  function sobreEsfera() {
    return seleccionado !== null && raycaster.intersectObject(gizmo.esfera).length > 0;
  }

  // Ángulo de un punto del piso visto desde el centro del módulo.
  // atan2(x, z) da 0 cuando el punto está justo al frente (+Z), igual que rotation.y = 0.
  function anguloHacia(punto, modulo) {
    return Math.atan2(punto.x - modulo.position.x, punto.z - modulo.position.z);
  }

  // Selección -------------------------------------------------------------------------
  function seleccionar(modulo) {
    seleccionado = modulo;
    gizmo.mostrar(modulo);
  }

  function deseleccionar() {
    seleccionado = null;
    gizmo.ocultar();
  }

  // Al empezar a arrastrar o rotar: la cámara se queda quieta y el mouse queda "atrapado"
  // por el canvas aunque salga de él
  function empezarGesto(e) {
    e.stopImmediatePropagation(); // OrbitControls ya no recibe este clic
    orbit.enabled = false;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  }

  // Límites ---------------------------------------------------------------------------
  function estaFuera(modulo) {
    const l = piso.obtenerLimites();
    // precise = true: la caja sale de los vértices reales ya girados. Sin él, Three.js gira la
    // caja de cada pieza y la vuelve a encerrar, y con el módulo girado la caja crece de más.
    // Como el piso es un rectángulo alineado a los ejes, con la caja exacta el chequeo es exacto.
    const c = new THREE.Box3().setFromObject(modulo, true);
    return c.min.x < l.min.x - TOLERANCIA || c.max.x > l.max.x + TOLERANCIA ||
           c.min.z < l.min.z - TOLERANCIA || c.max.z > l.max.z + TOLERANCIA;
  }

  // El rojo tiene prioridad sobre cualquier otro estado
  function refrescarColor(modulo) {
    let color = COLOR.normal;
    if (modulo.userData.fueraDeLimites) color = COLOR.error;
    else if (modulo === arrastrando || modulo === rotando) color = COLOR.arrastre;
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
    if (arrastrando || rotando) return; // no se borra a medio gesto
    const i = modulos.indexOf(modulo);  // -1 si no está en la lista
    if (i === -1) return;

    modulos.splice(i, 1);              // fuera de la lista: ya no lo ven el raycaster ni el snapping
    modulo.removeFromParent();         // fuera de la escena: ya no se dibuja
    modulo.userData.modulo.liberar();  // libera sus materiales

    if (seleccionado === modulo) deseleccionar(); // si no, el anillo se quedaría flotando

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
    inicioClic.set(e.clientX, e.clientY);

    // 1. La esfera va primero: si el rayo toca la esfera y un módulo, gana la esfera
    if (sobreEsfera()) {
      if (!raycaster.ray.intersectPlane(planoPiso, puntoPiso)) return;
      rotando = seleccionado;
      anguloInicio = anguloHacia(puntoPiso, rotando);
      rotacionInicio = rotando.rotation.y;
      empezarGesto(e);
      refrescarColor(rotando);
      return;
    }

    // 2. Un módulo: se selecciona y empieza el arrastre
    const modulo = moduloBajoPuntero();
    if (!modulo) return; // 3. Nada: la cámara orbita (al soltar se decide si se deselecciona)

    seleccionar(modulo);
    arrastrando = modulo;
    raycaster.ray.intersectPlane(planoPiso, puntoPiso);
    offset.copy(modulo.position).sub(puntoPiso);
    empezarGesto(e);
    refrescarColor(modulo);
  }, { capture: true });

  canvas.addEventListener('pointermove', (e) => {
    apuntarRayo(e);

    if (rotando) {
      if (raycaster.ray.intersectPlane(planoPiso, puntoPiso)) {
        // Cuánto ha girado el mouse alrededor del módulo desde que se apretó la esfera.
        // Usar la diferencia (y no el ángulo directo) evita un salto si no se apretó justo al centro.
        const giro = anguloHacia(puntoPiso, rotando) - anguloInicio;
        // Redondear al múltiplo de 5° más cercano
        rotando.rotation.y = Math.round((rotacionInicio + giro) / PASO_ROTACION) * PASO_ROTACION;
        revisarModulo(rotando); // al girar, una esquina puede salir del piso
      }
      return;
    }

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

    // Sin gesto activo: resaltar lo que esté bajo el cursor
    const enEsfera = sobreEsfera();
    gizmo.resaltar(enEsfera);

    const modulo = enEsfera ? null : moduloBajoPuntero(); // sobre la esfera, el módulo no se resalta
    if (modulo !== hover) {
      const anterior = hover;
      hover = modulo;
      if (anterior) refrescarColor(anterior);
      if (hover) refrescarColor(hover);
    }
    canvas.style.cursor = (hover || enEsfera) ? 'grab' : 'auto';
  });

  function soltar(e) {
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);

    if (rotando) {
      const modulo = rotando;
      rotando = null;
      orbit.enabled = true;
      revisarModulo(modulo); // vuelve a su color normal (o rojo si quedó fuera)
      canvas.style.cursor = 'grab';
      return;
    }

    if (arrastrando) {
      const modulo = arrastrando;
      arrastrando = null;
      orbit.enabled = true;
      intentarSnap(modulo);
      hover = modulo;
      revisarModulo(modulo); // el snap pudo moverlo, se vuelve a revisar
      canvas.style.cursor = 'grab';
      return;
    }

    // Clic en el vacío sin mover el mouse: se quita la selección.
    // Si el mouse sí se movió, era para girar la cámara y la selección se conserva.
    if (e.type !== 'pointerup' || e.button !== 0) return;
    const distancia = Math.hypot(e.clientX - inicioClic.x, e.clientY - inicioClic.y);
    apuntarRayo(e);
    if (distancia < UMBRAL_CLIC && !moduloBajoPuntero()) deseleccionar();
  }

  canvas.addEventListener('pointerup', soltar);
  canvas.addEventListener('pointercancel', soltar);

  // Lo que index.html puede usar. obtenerHover es una función (no el valor) para que
  // siempre devuelva el hover actual, no el que había al crear el arrastre.
  return {
    revisarTodos,
    quitar,
    deseleccionar,
    obtenerHover: () => hover,
    obtenerSeleccionado: () => seleccionado
  };
}