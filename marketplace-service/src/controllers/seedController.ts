import { Request, Response, NextFunction } from 'express';
import { seedDemoData } from '../services/seedService';

export const seedDemo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const force = req.query.force === 'true';
    const result = await seedDemoData(force);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};
