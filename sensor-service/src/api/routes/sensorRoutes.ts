import { Router, Request, Response } from 'express';
import { SensorRepository } from '../../infrastructure/repositories/SensorRepository';

const router = Router();
const sensorRepository = new SensorRepository();

router.get('/recent', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const readings = await sensorRepository.findRecent(limit);
    
    res.json({
      success: true,
      data: readings,
      count: readings.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sensor readings',
      error: error.message,
    });
  }
});

export default router;
