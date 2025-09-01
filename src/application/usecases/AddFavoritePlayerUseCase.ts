import { FavoriteRepository } from "../../domain/repositories/FavoriteRepository";
import { Player } from "../../domain/entities/Player";

export class AddFavoritePlayerUseCase {
  constructor(private repo: FavoriteRepository) {}

  async execute(userId: string, player: Player): Promise<void> {
    await this.repo.addFavorite(userId, player);
  }
}