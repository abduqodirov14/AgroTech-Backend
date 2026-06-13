import { Request, Response, NextFunction } from 'express';
import * as orderService from '../services/orderService';

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { listingId, quantity, notes } = req.body;
    const order = await orderService.createOrder(req.user!.userId, listingId, parseFloat(quantity), notes);
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

export const getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = (req.query.role as 'buyer' | 'seller') || 'buyer';
    const orders = await orderService.getOrdersForUser(req.user!.userId, role);
    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
};

export const getOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await orderService.getOrderById(req.params.id, req.user!.userId);
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

export const fundEscrow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await orderService.fundOrderEscrow(req.params.id, req.user!.userId);
    res.json({ success: true, data: order, message: 'Escrow funded. Logistics triggered.' });
  } catch (err) {
    next(err);
  }
};

export const confirmDelivery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await orderService.confirmDelivery(req.params.id, req.user!.userId);
    res.json({ success: true, data: order, message: 'Delivery confirmed. Payment released to seller.' });
  } catch (err) {
    next(err);
  }
};
