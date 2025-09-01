# Etapa base
FROM node:20

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias del sistema necesarias
RUN apt-get update && apt-get install -y \
    cmake \
    ffmpeg \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias de Node
RUN npm install

# Copiar todo el código
COPY . .

# Exponer el puerto
EXPOSE 3000

# Comando para iniciar la app
CMD ["npm", "start"]