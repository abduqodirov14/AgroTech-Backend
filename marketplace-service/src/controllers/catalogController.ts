import { Request, Response, NextFunction } from 'express';
import { ListingCategory } from '@prisma/client';
import * as catalogService from '../services/catalogService';

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await catalogService.getCatalogProducts(
      req.query.category as ListingCategory,
      req.query.search as string
    );
    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
};

export const getServices = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const services = await catalogService.getServiceOfferings();
    res.json({ success: true, data: services });
  } catch (err) {
    next(err);
  }
};

export const getPromotions = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const promotions = await catalogService.getPromotions();
    res.json({ success: true, data: promotions });
  } catch (err) {
    next(err);
  }
};
