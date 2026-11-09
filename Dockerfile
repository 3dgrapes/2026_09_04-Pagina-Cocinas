FROM nginx:alpine
COPY PaginaVisualizadorMAP/ /usr/share/nginx/html/
EXPOSE 80