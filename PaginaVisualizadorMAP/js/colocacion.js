import * as THREE from 'three';

const PASO = 0.1;      // distancia entre posiciones de prueba (m)
const HOLGURA = 0.01;  // encoge la caja de prueba para que dos módulos pegados no cuenten como choque

// Busca la posición libre más cercana al centro del piso donde quepa el módulo.
// Devuelve un Vector3 o null si ya no hay espacio.
export function buscarLugarLibre({ modulo, modulos, piso }) {
  const limites = piso.obtenerLimites();
  const centroPiso = limites.getCenter(new THREE.Vector3());

  // El pivote está en el centro de la huella, así que basta con la mitad del tamaño
  const mitadX = modulo.dimensiones.x / 2;
  const mitadZ = modulo.dimensiones.z / 2;

  // Cajas de lo que ya está en la escena (se calculan una sola vez)
  const ocupadas = modulos.map((m) => new THREE.Box3().setFromObject(m));

  // 1. Todas las posiciones de prueba donde el módulo queda completo dentro del piso
  const candidatos = [];
  for (let z = limites.min.z + mitadZ; z <= limites.max.z - mitadZ; z += PASO) {
    for (let x = limites.min.x + mitadX; x <= limites.max.x - mitadX; x += PASO) {
      candidatos.push(new THREE.Vector3(x, 0, z));
    }
  }

  // 2. Se ordenan del centro hacia afuera, para que el módulo aparezca a la vista
  candidatos.sort((a, b) => a.distanceTo(centroPiso) - b.distanceTo(centroPiso));

  // 3. La primera posición cuya caja no choca con ninguna ocupada es la ganadora
  const caja = new THREE.Box3();
  for (const p of candidatos) {
    caja.min.set(p.x - mitadX, 0, p.z - mitadZ);
    caja.max.set(p.x + mitadX, modulo.dimensiones.y, p.z + mitadZ);
    caja.expandByScalar(-HOLGURA);

    const choca = ocupadas.some((o) => o.intersectsBox(caja)); // some: ¿al menos una cumple?
    if (!choca) return p;
  }

  return null; // el piso está lleno para este tamaño
}
