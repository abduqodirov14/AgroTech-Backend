import { Request, Response, NextFunction } from 'express';
import * as favoriteService from '../services/favoriteService';

export const getFavorites = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await favoriteService.getFavorites(req.user!.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const addFavorite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await favoriteService.addFavorite(req.user!.userId, req.params.listingId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const removeFavorite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await favoriteService.removeFavorite(req.user!.userId, req.params.listingId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
