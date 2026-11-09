# Visualizador 3D de módulos de cocina

Aplicación web que permite visualizar módulos de cocina en 3D y combinarlos mediante snapping para planear el layout de una cocina, directamente desde el navegador y sin instalar nada.

## Cómo ejecutar

Requiere [Docker](https://www.docker.com/products/docker-desktop/) instalado.

```bash
docker build -t visualizador-cocina .
docker run -d --name visualizador -p 8080:80 visualizador-cocina
```

Después abre `http://localhost:8080` en el navegador.

 La aplicación carga Three.js desde un CDN, por lo que necesita conexión a internet.

## Enlaces del proyecto

- **Repositorio:** https://github.com/3dgrapes/2026_09_04-Pagina-Cocinas
- **Tablero:** https://github.com/users/3dgrapes/projects/1/views/1
- **Documentación:** [docs/](docs/README.md)

## Trazabilidad

| Historia | Issue | Pull request |
|---|---|---|
| Ejecutar con Docker | #3 | #N |
| Catálogo de módulos | #2 | (pendiente) |