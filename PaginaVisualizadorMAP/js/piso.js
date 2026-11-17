import * as THREE from 'three';

export function crearPiso(scene, ancho = 10, fondo = 10) {
  // Plano de 1x1 que se estira con scale, para poder redimensionarlo
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh.rotation.x = -Math.PI / 2;
  scene.add(mesh);

  function redimensionar(nuevoAncho, nuevoFondo) {
    mesh.scale.set(nuevoAncho, nuevoFondo, 1); // ancho = eje X, fondo = eje Z
  }
  redimensionar(ancho, fondo);

  function obtenerLimites() {
    return new THREE.Box3().setFromObject(mesh);
  }

  return { mesh, redimensionar, obtenerLimites };
}