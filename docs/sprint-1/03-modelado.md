
## Caso de uso: Agregar módulo desde el catálogo

- **Actor:** usuario.
- **Precondición:** los modelos del catálogo ya terminaron de cargarse.
- **Flujo principal:**
  1. El usuario abre la aplicación y ve el catálogo de tipos de módulo.
  2. Elige un tipo (por ejemplo, gabinete de puertas).
  3. El sistema crea una copia del modelo con su tipo y dimensiones.
  4. El sistema coloca el módulo en una posición libre del piso.
  5. El módulo queda visible y listo para arrastrarse.
- **Flujo alterno:** si los modelos siguen cargando, el sistema deshabilita el catálogo y muestra "Cargando...".
- **Postcondición:** el módulo existe en la escena y está registrado para arrastre y snapping.

## Diagrama de clases

```mermaid
classDiagram
    class CatalogoModelos {
        -modelos Map
        +precargar(tipos) Promise
        +obtener(tipo) Object3D
        +tiposDisponibles() Array~string~
    }
    class ModuloGabinete {
        +tipo string
        +dimensiones Dimensiones
        +mesh Object3D
        +obtenerAnchors() Array~Object3D~
    }
    class EscenaVisor {
        -scene Scene
        -camera Camera
        -modulos Array~ModuloGabinete~
        +agregarModulo(tipo) ModuloGabinete
    }
    class ControlArrastre {
        +registrar(modulo)
        +aplicarSnapping(modulo)
    }
    class PanelCatalogo {
        +mostrarTipos()
        +alSeleccionar(tipo)
    }

    PanelCatalogo --> CatalogoModelos : consulta tipos
    PanelCatalogo --> EscenaVisor : pide agregar
    EscenaVisor --> CatalogoModelos : obtiene modelo
    EscenaVisor "1" o-- "*" ModuloGabinete
    EscenaVisor --> ControlArrastre : registra módulo
    ControlArrastre ..> ModuloGabinete : mueve y ajusta
```

## Diagrama de secuencia

```mermaid
sequenceDiagram
    actor U as Usuario
    participant P as PanelCatalogo
    participant E as EscenaVisor
    participant C as CatalogoModelos
    participant M as ModuloGabinete
    participant D as ControlArrastre

    U->>P: Clic en tipo puertas
    P->>E: agregarModulo(puertas)
    E->>C: obtener(puertas)
    C-->>E: copia del modelo
    E->>M: new ModuloGabinete(tipo, modelo, posicion)
    M-->>E: módulo creado
    E->>E: scene.add(modulo.mesh)
    E->>D: registrar(modulo)
    D-->>E: módulo arrastrable
    E-->>P: módulo agregado
    P-->>U: el módulo aparece en la escena
```
