import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import mongoose from "mongoose";
import { swaggerSpec } from "../infrastructure/swagger";
import { voiceRoutes } from "./routes/voiceRoutes";
import { favoritesRoutes } from "./routes/favoritesRoutes";
import { env } from "../config/env";
import { MongoFavoriteRepository } from "../infrastructure/db/MongoFavoriteRepository";
import { GeminiService } from "../infrastructure/services/GeminiService";
import { ConversationManager } from "../domain/services/ConversationManager";
import { logger } from "../infrastructure/logger";

export async function createServer() {
  await mongoose.connect(env.mongoUri);
  const app = express();
  app.use(express.json());
  app.use(cors());

  const convManager = new ConversationManager(  
   `Eres un asistente virtual del Club América de México.
    Sé amable con los usuarios.
    El objetivo es hablar sobre la historia del club, jugadores y estadísticas.
    Solo hablarás sobre el Club América de México.
    Además, podrás almacenar jugadores favoritos del club.
    El parámetro userId siempre corresponde al sessionId de la conversación actual, no necesitas preguntarlo al usuario.`
);
  const ai = new GeminiService(env.geminiApiKey, convManager);
  const favoriteRepo = new MongoFavoriteRepository();

  app.use("/api/voice", voiceRoutes(ai, favoriteRepo));
  app.use("/api/favorites", favoritesRoutes(favoriteRepo));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.get("/health", (_, res) => res.json({ status: "ok" }));

  app.listen(env.port, () => logger.info(`Server running on http://localhost:${env.port}`));
}