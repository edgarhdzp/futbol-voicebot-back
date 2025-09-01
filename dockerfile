# Etapa base
FROM node:20

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias del sistema necesarias
RUN apt-get update && apt-get install -y \
    ffmpeg \
    wget \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias Node
RUN npm install

# Copiar todo el código
COPY . .

# Compilar TypeScript
RUN npm run build

# Descargar modelo tiny en /app/models
RUN mkdir -p /app/models
RUN npx nodejs-whisper download tiny --dest /app/models

# Exponer puerto
EXPOSE 3000

# Comando para iniciar la app
CMD ["npm", "start"]