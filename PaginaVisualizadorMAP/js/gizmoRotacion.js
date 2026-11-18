import * as THREE from 'three';

const COLOR_GIZMO = 0xffaa00;        // naranja: no se confunde con hover (azul), arrastre (gris) ni error (rojo)
const COLOR_GIZMO_ACTIVO = 0xffdd66; // más claro cuando el cursor está sobre la esfera
const MARGEN = 0.12;                 // cuánto sobresale el anillo de la huella del módulo (m)
const GROSOR = 0.015;                // medio grosor del anillo (m)
const RADIO_ESFERA = 0.06;
const ALTURA = 0.005;                // un poco sobre el piso para que el anillo no parpadee con él

// Indicador de selección y rotación: anillo en la base, esfera al frente y etiqueta con los grados.
// No es hijo del módulo: si lo fuera, el Box3 del módulo lo incluiría y cambiaría
// los chequeos de "fuera del piso" y de lugar libre.
export function crearGizmoRotacion({ scene, camera, renderer }) {
  const grupo = new THREE.Group();
  grupo.visible = false;
  scene.add(grupo);

  // MeshBasicMaterial no reacciona a la luz: siempre se ve del mismo color
  const anillo = new THREE.Mesh(
    new THREE.RingGeometry(1 - GROSOR, 1 + GROSOR, 64),
    new THREE.MeshBasicMaterial({ color: COLOR_GIZMO, side: THREE.DoubleSide })
  );
  anillo.rotation.x = -Math.PI / 2; // RingGeometry nace de pie; se acuesta sobre el piso
  grupo.add(anillo);

  const esfera = new THREE.Mesh(
    new THREE.SphereGeometry(RADIO_ESFERA, 16, 12),
    new THREE.MeshBasicMaterial({ color: COLOR_GIZMO })
  );
  grupo.add(esfera);

  // La etiqueta es HTML encima del canvas; pointer-events:none para que no estorbe al mouse
  const etiqueta = document.createElement('div');
  etiqueta.style.cssText = 'position:absolute; display:none; z-index:10; pointer-events:none;' +
    'transform:translate(-50%, -160%); background:rgba(0,0,0,0.65); color:#fff;' +
    'padding:2px 6px; border-radius:4px; font:13px sans-serif;';
  document.body.appendChild(etiqueta);

  let modulo = null;               // módulo al que acompaña (null = oculto)
  const enPantalla = new THREE.Vector3();

  function mostrar(nuevo) {
    modulo = nuevo;
    const d = nuevo.userData.modulo.dimensiones;
    // Mitad de la diagonal: así el anillo rodea al módulo en cualquier ángulo
    const radio = Math.hypot(d.x, d.z) / 2 + MARGEN;

    anillo.geometry.dispose(); // la geometría anterior ya no sirve; se libera antes de reemplazarla
    anillo.geometry = new THREE.RingGeometry(radio - GROSOR, radio + GROSOR, 64);
    esfera.position.set(0, RADIO_ESFERA, radio); // al frente: los modelos miran hacia +Z

    grupo.visible = true;
    etiqueta.style.display = 'block';
  }

  function ocultar() {
    modulo = null;
    grupo.visible = false;
    etiqueta.style.display = 'none';
  }

  function resaltar(activo) {
    esfera.material.color.set(activo ? COLOR_GIZMO_ACTIVO : COLOR_GIZMO);
  }

  // Se llama en cada frame: sigue al módulo (aunque se arrastre) y acomoda la etiqueta
  function actualizar() {
    if (!modulo) return;
    grupo.position.set(modulo.position.x, ALTURA, modulo.position.z);
    grupo.rotation.y = modulo.rotation.y;

    // De coordenadas del mundo (metros) a coordenadas de pantalla (-1 a 1)
    esfera.getWorldPosition(enPantalla).project(camera);
    if (enPantalla.z > 1) { etiqueta.style.display = 'none'; return; } // quedó detrás de la cámara
    etiqueta.style.display = 'block';

    // De -1..1 a píxeles (en pantalla, y crece hacia abajo; por eso 1 - y)
    const rect = renderer.domElement.getBoundingClientRect();
    etiqueta.style.left = `${rect.left + (enPantalla.x + 1) / 2 * rect.width}px`;
    etiqueta.style.top = `${rect.top + (1 - enPantalla.y) / 2 * rect.height}px`;

    // Grados entre 0 y 355 (el % de JS puede dar negativos; sumar 360 lo corrige)
    const grados = Math.round(THREE.MathUtils.radToDeg(modulo.rotation.y));
    etiqueta.textContent = `${((grados % 360) + 360) % 360}°`;
  }

  return { esfera, mostrar, ocultar, resaltar, actualizar };
}
