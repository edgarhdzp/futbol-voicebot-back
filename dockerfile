# Etapa base
FROM node:20

WORKDIR /app

COPY package*.json ./

RUN apt-get update && apt-get install -y \
    ffmpeg \
    wget \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN npm install

# Copiar todo el código
COPY . .

# Compilar TypeScript
RUN npm run build

# Descargar modelo tiny de nodejs-whisper
RUN mkdir -p /app/models
RUN npx nodejs-whisper download tiny --dest /app/models

EXPOSE 3000

CMD ["npm", "start"]