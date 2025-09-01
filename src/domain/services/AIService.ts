export interface AddFavoritePlayerAction {
  type: "ADD_FAVORITE_PLAYER";
  payload: { userId: string; playerName: string };
}

export interface GetFavoritePlayersAction {
  type: "GET_FAVORITE_PLAYERS";
  payload: { userId: string };
}

export type AgentAction = AddFavoritePlayerAction | GetFavoritePlayersAction;

export interface AIChatResponse {
  replyText: string;
  actions?: AgentAction[];
}

export interface AIService {
  chat(userText: string, sessionId: string): Promise<AIChatResponse>;
}