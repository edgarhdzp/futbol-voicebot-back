# Etapa base: Node 20
FROM node:20

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias del sistema necesarias
RUN apt-get update && apt-get install -y \
    ffmpeg \
    cmake \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias de Node
RUN npm install

# Copiar todo el código fuente
COPY . .

# Compilar TypeScript a JavaScript
RUN npm run build

# Exponer el puerto que usa tu app
EXPOSE 3000

# Comando para iniciar la app compilada
CMD ["npm", "start"]