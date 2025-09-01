import { AIService, AIChatResponse, AgentAction } from "../../domain/services/AIService";
import { GoogleGenerativeAI, FunctionDeclarationSchemaType } from "@google/generative-ai";
import { ConversationManager } from "../../domain/services/ConversationManager";

export class GeminiService implements AIService {
  private model;

  constructor(apiKey: string, private convManager: ConversationManager) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async chat(userText: string, sessionId: string): Promise<AIChatResponse> {
  const history = this.convManager.getHistory(sessionId);
  this.convManager.addTurn(sessionId, "user", userText);

  const contents = history
    .filter(turn => turn.role !== "system")
    .map(turn => ({
      role: turn.role as "user" | "model",
      parts: [{ text: turn.text }]
    }));

  contents.unshift({
    role: "user",
    parts: [{ text: this.convManager.getSystemPrompt() }]
  });

  const result = await this.model.generateContent({
    contents,
    tools: [
      {
        functionDeclarations: [
          {
            name: "addFavoritePlayer",
            description: "Agrega un jugador a favoritos",
            parameters: {
              type: FunctionDeclarationSchemaType.OBJECT,
              properties: {
                userId: { type: FunctionDeclarationSchemaType.STRING },
                playerName: { type: FunctionDeclarationSchemaType.STRING }
              },
              required: ["userId", "playerName"]
            }
          },
          {
            name: "getFavoritePlayers",
            description: "Obtiene los jugadores favoritos del usuario",
            parameters: {
              type: FunctionDeclarationSchemaType.OBJECT,
              properties: {
                userId: { type: FunctionDeclarationSchemaType.STRING }
              }
            }
          }
        ]
      }
    ]
  });

  const resp = result.response;
  let replyText = resp.text() ?? "No entendí tu petición.";
  const actions: AgentAction[] = [];

  const fcalls = resp.functionCalls();
if (fcalls?.length) {
  for (const call of fcalls) {
    if (call.name === "addFavoritePlayer") {
      const { playerName } = call.args as any; 
      actions.push({
        type: "ADD_FAVORITE_PLAYER",
        payload: { userId: sessionId, playerName } 
      });
      replyText = `Perfecto, agregando a ${playerName} a tus favoritos.`;
    }

    if (call.name === "getFavoritePlayers") {
      actions.push({
        type: "GET_FAVORITE_PLAYERS",
        payload: { userId: sessionId } 
      });
      replyText = "Consultando tus jugadores favoritos...";
    }
  }
}

  this.convManager.addTurn(sessionId, "model", replyText);
  return { replyText, actions: actions.length ? actions : undefined };
}
}