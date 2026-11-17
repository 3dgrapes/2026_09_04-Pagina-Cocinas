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

    // El contenedor es lo que se mueve, se arrastra y (luego) se rota
    this.mesh = new THREE.Group();
    this.mesh.add(modelo);
    this.mesh.userData.modulo = this;
    this.mesh.position.copy(posicion);
  }

  obtenerAnchors() {
    const anchors = [];
    this.mesh.traverse((hijo) => {
      if (hijo.name.startsWith('Snap_')) anchors.push(hijo);
    });
    return anchors;
  }
}

