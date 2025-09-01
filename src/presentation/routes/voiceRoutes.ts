import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { nodewhisper } from "nodejs-whisper";
import ffmpegPath from "ffmpeg-static";
import { exec } from "child_process";
import util from "util";
import { v4 as uuidv4 } from "uuid";
import { AIService } from "../../domain/services/AIService";
import { AddFavoritePlayerUseCase } from "../../application/usecases/AddFavoritePlayerUseCase";
import { FavoriteRepository } from "../../domain/repositories/FavoriteRepository";

const execPromise = util.promisify(exec);

const logger = {
  info: (...args: any[]) => console.log("[INFO]", ...args),
  warn: (...args: any[]) => console.warn("[WARN]", ...args),
  error: (...args: any[]) => console.error("[ERROR]", ...args),
};

// asegurar que ffmpeg está en PATH
process.env.PATH = `${path.dirname(ffmpegPath!)}:${process.env.PATH}`;

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({ storage });

export function voiceRoutes(ai: AIService, favoriteRepo: FavoriteRepository) {
  const router = Router();

  router.post("/process", upload.single("audio"), async (req, res) => {
    console.log(req.file);

    if (!req.file?.path) {
      logger.warn("No se envió audio");
      return res.status(400).json({ error: "No se envió audio" });
    }

    const originalFile = path.resolve(req.file.path);
    const wavFile = `${originalFile}.wav`;

    logger.info("Archivo recibido:", originalFile);

    try {
      // 🔥 Convertir siempre a WAV PCM válido
      await execPromise(
        `ffmpeg -y -i ${originalFile} -ar 16000 -ac 1 -c:a pcm_s16le ${wavFile}`
      );

      // procesar con whisper
      const result = await nodewhisper(wavFile, {
        modelName: "tiny",
        autoDownloadModelName: "tiny",
        removeWavFileAfterTranscription: false,
        withCuda: false,
        whisperOptions: {
          outputInText: true,   // mejor salida como texto limpio
        },
      });

      const transcript = result || "";
      logger.info("Transcripción:", transcript);

      const sessionId = req.body.sessionId || uuidv4();
      logger.info("Usando sessionId:", sessionId);

      const response = await ai.chat(transcript, sessionId.toString());

      let replyText = response.replyText || "";

      // Ejecutar acciones
      if (response.actions) {
        for (const action of response.actions) {
          switch (action.type) {
            case "ADD_FAVORITE_PLAYER":
              logger.info("ADD_FAVORITE_PLAYER action recibida");
              const addUC = new AddFavoritePlayerUseCase(favoriteRepo);
              await addUC.execute(sessionId.toString(), {
                name: action.payload.playerName,
              });
              logger.info(
                "Jugador agregado a favoritos:",
                action.payload.playerName
              );
              break;

            case "GET_FAVORITE_PLAYERS":
              const favorites = await favoriteRepo.listFavorites(
                sessionId.toString()
              );
              replyText = favorites.length
                ? `Tus jugadores favoritos son: ${favorites
                    .map((p) => p.name)
                    .join(", ")}.`
                : "No tienes jugadores favoritos aún.";
              break;
          }
        }
      }

      const { replyText: originalReplyText, ...rest } = response;

      res.json({ transcript, replyText, ...rest });
    } catch (err) {
      logger.error("Error procesando audio:", err);
      res.status(500).json({ error: "Error procesando audio" });
    } finally {
      // limpiar ambos archivos
      try {
        await fs.promises.unlink(originalFile);
        logger.info("Archivo temporal borrado:", originalFile);
      } catch (err) {
        logger.warn("No se pudo borrar el archivo:", originalFile, err);
      }

      try {
        await fs.promises.unlink(wavFile);
        logger.info("Archivo temporal borrado:", wavFile);
      } catch (err) {
        logger.warn("No se pudo borrar el archivo:", wavFile, err);
      }
    }
  });

  return router;
}