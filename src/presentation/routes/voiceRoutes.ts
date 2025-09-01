import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { nodewhisper } from "nodejs-whisper";
import ffmpegPath from "ffmpeg-static";
import { exec } from "child_process";
import { v4 as uuidv4 } from "uuid";
import { AIService } from "../../domain/services/AIService";
import { AddFavoritePlayerUseCase } from "../../application/usecases/AddFavoritePlayerUseCase";
import { FavoriteRepository } from "../../domain/repositories/FavoriteRepository";

const logger = {
  info: (...args: any[]) => console.log("[INFO]", ...args),
  warn: (...args: any[]) => console.warn("[WARN]", ...args),
  error: (...args: any[]) => console.error("[ERROR]", ...args),
};

process.env.PATH = `${path.dirname(ffmpegPath!)}:${process.env.PATH}`;

// Multer
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".webm";
    const filename = `${Date.now()}-${uuidv4()}${ext}`;
    cb(null, filename);
  },
});
const upload = multer({ storage });

// Función para convertir a WAV
async function convertWebmToWav(inputPath: string): Promise<string> {
  const outputPath = inputPath.replace(path.extname(inputPath), ".wav");
  return new Promise((resolve, reject) => {
    exec(`ffmpeg -y -i "${inputPath}" "${outputPath}"`, (err) => {
      if (err) return reject(err);
      resolve(outputPath);
    });
  });
}

export function voiceRoutes(ai: AIService, favoriteRepo: FavoriteRepository) {
  const router = Router();

  router.post("/process", upload.single("audio"), async (req, res) => {
    if (!req.file?.path) {
      logger.warn("No se envió audio");
      return res.status(400).json({ error: "No se envió audio" });
    }

    const audioFile = path.resolve(req.file.path);
    logger.info("Archivo recibido:", audioFile);

    try {
      // Convertir a WAV
      const wavFile = await convertWebmToWav(audioFile);
      logger.info("Archivo convertido a WAV:", wavFile);

      const sessionId = req.body.sessionId || uuidv4();
      logger.info("Usando sessionId:", sessionId);

      const result = await nodewhisper(wavFile, {
        modelName: "/opt/render/project/src/node_modules/nodejs-whisper/cpp/whisper.cpp/models/ggml-tiny.bin",
        removeWavFileAfterTranscription: true,
        withCuda: false,
        whisperOptions: {
          outputInText: true,
          outputInJson: false,
          translateToEnglish: false,
        },
      });

      const transcript = result || "";
      logger.info("Transcripción:", transcript);

      const response = await ai.chat(transcript, sessionId.toString());
      let replyText = response.replyText || "";

      // Ejecutar acciones
      if (response.actions) {
        for (const action of response.actions) {
          switch (action.type) {
            case "ADD_FAVORITE_PLAYER":
              logger.info("ADD_FAVORITE_PLAYER action recibida");
              const addUC = new AddFavoritePlayerUseCase(favoriteRepo);
              await addUC.execute(sessionId.toString(), { name: action.payload.playerName });
              logger.info("Jugador agregado a favoritos:", action.payload.playerName);
              break;

            case "GET_FAVORITE_PLAYERS":
              const favorites = await favoriteRepo.listFavorites(sessionId.toString());
              replyText = favorites.length
                ? `Tus jugadores favoritos son: ${favorites.map(p => p.name).join(", ")}.`
                : "No tienes jugadores favoritos aún.";
              logger.info("Jugadores favoritos consultados:", favorites);
              break;
          }
        }
      }

      res.json({ transcript, replyText, ...response });

      // Borrar archivo .webm original
      try {
        await fs.promises.unlink(audioFile);
        logger.info("Archivo original borrado:", audioFile);
      } catch (err) {
        logger.warn("No se pudo borrar el archivo original:", audioFile, err);
      }
    } catch (err) {
      logger.error("Error procesando audio:", err);
      res.status(500).json({ error: "Error procesando audio" });
    }
  });

  return router;
}