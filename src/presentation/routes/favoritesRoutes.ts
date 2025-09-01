import { Router } from "express";
import { FavoriteRepository } from "../../domain/repositories/FavoriteRepository";

export function favoritesRoutes(favoriteRepo: FavoriteRepository) {
  const router = Router();

  router.get("/:userId", async (req, res) => {
    const favorites = await favoriteRepo.listFavorites(req.params.userId);
    res.json(favorites);
  });

  return router;
}