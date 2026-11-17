import * as THREE from 'three';

export function limitarCamara({ controls, camera, piso }) {
  controls.screenSpacePanning = false;        // el paneo se mueve sobre el piso, no hacia arriba
  controls.maxPolarAngle = Math.PI / 2 - 0.05; // no deja pasar por debajo del piso
  controls.minDistance = 0.5;

  // Se llama al crear y cada vez que cambie el tamaño del piso
  function actualizar() {
    const tamano = piso.obtenerLimites().getSize(new THREE.Vector3());
    controls.maxDistance = Math.max(tamano.x, tamano.z) * 1.5;
  }

  // Se llama en cada frame, antes de controls.update()
  function aplicar() {
    const caja = piso.obtenerLimites();
    const t = controls.target;
    const dx = THREE.MathUtils.clamp(t.x, caja.min.x, caja.max.x) - t.x;
    const dz = THREE.MathUtils.clamp(t.z, caja.min.z, caja.max.z) - t.z;
    if (dx !== 0 || dz !== 0) {
      t.x += dx;  t.z += dz;
      camera.position.x += dx;  camera.position.z += dz; // la cámara se mueve junto con el objetivo
    }
  }

  actualizar();
  return { actualizar, aplicar };
}

