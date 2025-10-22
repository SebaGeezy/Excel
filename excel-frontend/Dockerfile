# Etapa 1: Compilación de Angular
FROM node:18.20.3 AS build

WORKDIR /app

# Instalar Angular CLI versión 16.2.0 globalmente
RUN npm install -g @angular/cli@16.2.0

# Copiar archivos de dependencias e instalar paquetes
COPY package*.json ./
RUN npm install

# Copiar el resto del proyecto
COPY . .

# Compilar Angular (modo producción)
RUN ng build --configuration=production

# Verificar que se hayan generado los archivos
RUN ls -la /app/dist/excel-frontend/browser

# Etapa 2: Servidor Nginx para servir la app
FROM nginx:alpine

# Copiar la build generada desde la etapa anterior
COPY --from=build /app/dist/excel-frontend/browser /usr/share/nginx/html

# Verificar que los archivos se copiaron
RUN ls -la /usr/share/nginx/html

# Configurar nginx para Angular SPA
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html/browser; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Exponer el puerto 80
EXPOSE 80

# Comando para mantener el servidor activo
CMD ["nginx", "-g", "daemon off;"]

