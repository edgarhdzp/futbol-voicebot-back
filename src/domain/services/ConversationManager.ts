export interface ConversationTurn {
  role: "user" | "model" | "system";
  text: string;
}

export class ConversationManager {
  private conversations: Map<string, ConversationTurn[]> = new Map();

  constructor(private systemPrompt: string) {}

  getSystemPrompt() {
    return this.systemPrompt;
  }

  getHistory(sessionId: string): ConversationTurn[] {
    if (!this.conversations.has(sessionId)) {
      this.conversations.set(sessionId, [
        { role: "system", text: this.systemPrompt }
      ]);
    }
    return this.conversations.get(sessionId)!;
  }

  addTurn(sessionId: string, role: "user" | "model", text: string) {
    const history = this.getHistory(sessionId);
    history.push({ role, text });
  }
}