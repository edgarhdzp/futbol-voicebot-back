import { Player } from "../entities/Player";

export interface FavoriteRepository {
  addFavorite(userId: string, player: Player): Promise<void>;
  listFavorites(userId: string): Promise<Player[]>;
}
