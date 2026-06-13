import { Request, Response, NextFunction } from 'express';
import * as cartService from '../services/cartService';

export const getCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cart = await cartService.getCart(req.user!.userId);
    res.json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
};

export const addItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { listingId, quantity } = req.body;
    const cart = await cartService.addToCart(req.user!.userId, listingId, parseFloat(quantity) || 1);
    res.json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
};

export const updateItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cart = await cartService.updateCartItem(req.user!.userId, req.params.itemId, parseFloat(req.body.quantity));
    res.json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
};

export const removeItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cart = await cartService.removeFromCart(req.user!.userId, req.params.itemId);
    res.json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
};

export const clearCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await cartService.clearCart(req.user!.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
