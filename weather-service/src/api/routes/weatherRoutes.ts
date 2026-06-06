import { Router, Request, Response } from 'express';
import { fetchWeatherData, fetchSoilData } from '../../services/weatherService';
import { logger } from '../../utils/logger';

const router = Router();

router.get('/weather', async (req: Request, res: Response) => {
  try {
    const latitude = req.query.latitude ? parseFloat(req.query.latitude as string) : undefined;
    const longitude = req.query.longitude ? parseFloat(req.query.longitude as string) : undefined;

    const data = await fetchWeatherData(latitude, longitude);
    
    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    logger.error(`❌ Weather endpoint error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weather data',
    });
  }
});

router.get('/soil', async (req: Request, res: Response) => {
  try {
    const latitude = req.query.latitude ? parseFloat(req.query.latitude as string) : undefined;
    const longitude = req.query.longitude ? parseFloat(req.query.longitude as string) : undefined;

    const data = await fetchSoilData(latitude, longitude);
    
    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    logger.error(`❌ Soil endpoint error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch soil data',
    });
  }
});

router.get('/combined', async (req: Request, res: Response) => {
  try {
    const latitude = req.query.latitude ? parseFloat(req.query.latitude as string) : undefined;
    const longitude = req.query.longitude ? parseFloat(req.query.longitude as string) : undefined;

    const [weather, soil] = await Promise.all([
      fetchWeatherData(latitude, longitude),
      fetchSoilData(latitude, longitude),
    ]);
    
    res.json({
      success: true,
      data: {
        weather,
        soil,
      },
    });
  } catch (error: any) {
    logger.error(`❌ Combined endpoint error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weather and soil data',
    });
  }
});

export default router;
