import * as THREE from 'three';
import { obtenerModelo } from './catalogo.js';

export class ModuloGabinete {
  constructor({ tipo, posicion = new THREE.Vector3() }) {
    this.tipo = tipo;

    const modelo = obtenerModelo(tipo);

    // Materiales propios para que el resaltado no afecte a otras copias
    modelo.traverse((hijo) => {
      if (hijo.isMesh) hijo.material = hijo.material.clone();
    });

    // Se mide donde quedó la geometría y se mueve el modelo para que
    // el pivote caiga en el centro de la huella, con la base en y = 0
    const caja = new THREE.Box3().setFromObject(modelo);
    const centro = caja.getCenter(new THREE.Vector3());
    modelo.position.set(-centro.x, -caja.min.y, -centro.z);

    this.dimensiones = caja.getSize(new THREE.Vector3());

    // El contenedor es lo que se mueve, se arrastra y se rota
    this.mesh = new THREE.Group();
    this.mesh.add(modelo);
    this.mesh.userData.modulo = this;

    // Los anclajes se preparan aquí, mientras el contenedor sigue en el origen y sin girar
    this.anchors = this.#prepararAnchors();

    this.mesh.position.copy(posicion);
  }

  // Busca los Empties "Snap_*" y calcula hacia dónde mira cada uno.
  // La dirección se deduce de su posición: un anclaje en la cara izquierda del
  // módulo mira hacia la izquierda. No se usa el nombre (L, R, B) porque el
  // esquinero tiene su "R" en la cara de atrás, no a la derecha.
  //
  // Cada anclaje queda como { objeto, angulo }:
  //   objeto: el Empty (se sigue usando para saber su posición en el mundo)
  //   angulo: hacia dónde mira, en radianes, medido en el módulo SIN girar.
  //           0 = al frente (+Z), π/2 = derecha (+X), π = atrás (-Z), -π/2 = izquierda (-X)
  #prepararAnchors() {
    this.mesh.updateMatrixWorld(true); // asegura que las posiciones ya incluyan el ajuste de pivote

    const anchors = [];
    this.mesh.traverse((hijo) => {
      if (!hijo.name.startsWith('Snap_')) return;

      // Posición del anclaje respecto al centro de la huella
      const p = hijo.getWorldPosition(new THREE.Vector3());
      this.mesh.worldToLocal(p);

      // Se queda con el eje en el que más se aleja del centro: esa es su cara
      const direccion = Math.abs(p.x) > Math.abs(p.z)
        ? new THREE.Vector3(Math.sign(p.x), 0, 0)
        : new THREE.Vector3(0, 0, Math.sign(p.z));

      // atan2(x, z): mismo criterio de ángulos que rotation.y y el gizmo
      anchors.push({ objeto: hijo, angulo: Math.atan2(direccion.x, direccion.z) });
    });
    return anchors;
  }

  // Libera la memoria de la tarjeta gráfica al borrar el módulo.
  // Solo los materiales: son propios de esta copia. La geometría la comparten
  // todas las copias del mismo tipo, así que no se toca.
  liberar() {
    this.mesh.traverse((hijo) => {
      if (hijo.isMesh) hijo.material.dispose();
    });
  }

  // Hacia dónde mira un anclaje en el mundo: su ángulo propio más lo que esté girado el módulo
  anguloEnMundo(anchor) {
    return anchor.angulo + this.mesh.rotation.y;
  }
}

