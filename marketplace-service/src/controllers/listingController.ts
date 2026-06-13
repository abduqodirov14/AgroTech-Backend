import { Request, Response, NextFunction } from 'express';
import { ListingCategory } from '@prisma/client';
import * as listingService from '../services/listingService';
import { buildSensorSnapshot } from '../services/sensorSnapshotService';

export const getOverview = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await listingService.getOverview();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const listListings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await listingService.listListings({
      region: req.query.region as string,
      category: req.query.category as ListingCategory,
      search: req.query.search as string,
      sort: req.query.sort as 'popular' | 'price_asc' | 'price_desc' | 'newest',
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      featured: req.query.featured === 'true',
    });

    // Backward compatible: frontend expects { success, items }
    res.json({ success: true, items: result.items, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
};

export const getListing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await listingService.getListingById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getSensorHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listing = await listingService.getListingById(req.params.id);
    if (!listing.zoneId) {
      return res.json({ success: true, data: null, message: 'No sensor data linked' });
    }
    const snapshot = await buildSensorSnapshot(listing.zoneId);
    res.json({ success: true, data: snapshot });
  } catch (err) {
    next(err);
  }
};

export const createListing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { title, price, unit, quantity, region, category, description, zoneId, cropType, brand, originalPrice } = req.body;

    const data = await listingService.createListing({
      sellerId: userId,
      title,
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
      unit,
      quantity: parseFloat(quantity),
      region,
      category,
      description,
      zoneId,
      cropType,
      brand,
    });

    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const updateListing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await listingService.updateListing(req.params.id, req.user!.userId, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const cancelListing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await listingService.cancelListing(req.params.id, req.user!.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
