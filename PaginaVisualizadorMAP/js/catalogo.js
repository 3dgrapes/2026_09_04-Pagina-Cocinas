import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Aquí se define toda la información de los módulos presentes. Si vas a poner módulos nuevos, solo agrega una nueva entrada que siga el formato de los demás módulos:
// {tipo, nombre, archivo}
export const DEFINICIONES = [
    {tipo: 'alacena', nombre: 'Alacena', archivo: 'models/Alacena.glb'},
    {tipo: 'cajonPuertas', nombre: 'Gabinete de cajón y puertas', archivo: 'models/CajoneraCajonPuertas.glb'},
    {tipo: 'cajoneraChica', nombre: 'Cajonera Chica', archivo: 'models/CajoneraChica.glb'},
    {tipo: 'cajoneraGrande', nombre: 'Cajonera Grande', archivo: 'models/CajoneraGrande.glb'},
    {tipo: 'especiero', nombre: 'Especiero', archivo: 'models/Especiero.glb'},
    {tipo: 'esquinero', nombre: 'Esquinero', archivo: 'models/Esquinero.glb'},
    {tipo: 'puertas', nombre: 'Gabinete de Puertas', archivo: 'models/GabinetePuertas.glb'},
    {tipo: 'isla', nombre: 'Isla', archivo: 'models/Isla.glb'},
    {tipo: 'sink', nombre: 'Sink', archivo: 'models/Sink.glb'}
]

const modelos = new Map(); // Para guardar relaciones entre tipos y los modelos en escena

// Precarga todos los modelos para utilizarse
export async function precargarCatalogo() {                 // Es async porque corre en el background
    const loader = new GLTFLoader();                        // Loader para cargar los modelos
    await Promise.all(DEFINICIONES.map(async (def) =>{      // Await Promise hace que se carguen todos los modelos primero
        const gtlf = await loader.loadAsync(def.archivo);   // Se cargan todos los modelos usando el Loader. El await loader.LoaderAsync hace que la funcion en si sea async tambien.
        modelos.set(def.tipo, gtlf.scene);                  // Se guarda el tipo del gabinete y el objeto relacionado en la escena en el Map de arriba.
    }));
}

export function obtenerModelo(tipo) {                       // Obtiene el modelo basado en un tipo entrada
  const base = modelos.get(tipo);                           // Busca el tipo del modelo y guarda la referencia al mesh almacendado en modelos.
  if (!base) throw new Error(`Tipo desconocido: ${tipo}`);  // Da error si los modelos aun no cargan O si no existe el tipo de modelo pedido 
  return base.clone();                                      // Si no hay errores, crea una nueva instancia independiente de modelo buscado.
}

