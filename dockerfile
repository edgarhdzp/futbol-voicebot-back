# Etapa base
FROM node:20

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias del sistema necesarias
RUN apt-get update && apt-get install -y \
    ffmpeg \
    wget \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias de Node
RUN npm install

# Crear carpeta para modelos
RUN mkdir -p /app/models

# Descargar modelo tiny de nodejs-whisper
RUN npx nodejs-whisper download tiny --dest /app/models

# Copiar todo el código
COPY . .

# Exponer el puerto que usa tu app
EXPOSE 3000

# Comando para iniciar la app
CMD ["npm", "start"]