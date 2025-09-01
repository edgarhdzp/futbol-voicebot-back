import mongoose from "mongoose";
import { FavoriteRepository } from "../../domain/repositories/FavoriteRepository";
import { Player } from "../../domain/entities/Player";

const favoriteSchema = new mongoose.Schema({
  userId: String,
  playerName: String
});
const FavoriteModel = mongoose.model("Favorite", favoriteSchema);

export class MongoFavoriteRepository implements FavoriteRepository {
  async addFavorite(userId: string, player: Player): Promise<void> {
    await FavoriteModel.create({ userId, playerName: player.name });
  }

  async listFavorites(userId: string): Promise<Player[]> {
    const docs = await FavoriteModel.find({ userId });
    return docs.map(d => ({
      name: d.playerName ?? ""
    }));
  }
}
