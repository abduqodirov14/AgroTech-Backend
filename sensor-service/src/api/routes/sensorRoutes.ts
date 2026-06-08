import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { SensorRepository } from '../../infrastructure/repositories/SensorRepository';
import { authenticateDevice } from '../../middleware/authenticateDevice';

const router = Router();
const sensorRepository = new SensorRepository();

const readingSchema = z.object({
  sensor_pin: z.string().optional(),
  type: z.enum([
    'soil_moisture',
    'soil_moisture_shallow',
    'soil_moisture_deep',
    'soil_temperature',
    'air_temperature',
    'ph',
    'ec',
    'npk',
    'battery',
  ]),
  value: z.number(),
});

const uploadSchema = z.object({
  device_mac: z.string().min(1),
  secret_key: z.string().min(1),
  readings: z.array(readingSchema).min(1).max(64),
});

router.post('/upload', authenticateDevice, async (req: Request, res: Response) => {
  try {
    const deviceMac = String((req as any).body?.device_mac || req.header('X-Device-MAC') || 'unknown');
    const deviceId = req.app.get('deviceId') as string;
    logger.info(`[HTTP][REQUEST] deviceMac=${deviceMac} deviceId=${deviceId} readings=${Array.isArray((req as any).body?.readings) ? (req as any).body.readings.length : 'unknown'}`);
    const parsed = uploadSchema.safeParse(req.body);

    if (!parsed.success) {
      logger.warn(`[HTTP][ERROR] Validation failed deviceMac=${deviceMac} error=${parsed.error.flatten().message}`);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    const { readings } = parsed.data;
    const accepted: any[] = [];
    const rejected: any[] = [];

    for (const r of readings) {
      const data: any = { deviceId };

      switch (r.type) {
        case 'soil_moisture':
        case 'soil_moisture_shallow':
        case 'soil_moisture_deep':
          data.moisture = r.value;
          break;
        case 'soil_temperature':
        case 'air_temperature':
          data.temperature = r.value;
          break;
        case 'ph':
          data.ph = r.value;
          break;
        case 'ec':
          data.ec = r.value;
          break;
        case 'battery':
          data.battery = r.value;
          break;
        case 'npk':
          data.npk = r.value;
          break;
        default:
          rejected.push(r);
          continue;
      }

      try {
        const reading = await sensorRepository.create(data);
        accepted.push(reading);
      } catch (err) {
        logger.error(`[HTTP][ERROR] DB write failed deviceId=${deviceId} error=${(err as any).message}`);
        rejected.push({ reading: r, error: 'database_error' });
      }
    }

    logger.info(`[HTTP][SUCCESS] deviceId=${deviceId} accepted=${accepted.length} rejected=${rejected.length}`);
    const io = req.app.get('io');
    if (io && accepted.length > 0) {
      io.to(`device:${deviceId}`).emit('sensor:update', {
        deviceId,
        readings: accepted,
        count: accepted.length,
      });
    }

    return res.status(201).json({
      success: true,
      batch_id: `batch_${Date.now()}_${deviceId}`,
      accepted: accepted.length,
      rejected: rejected.length,
    });
  } catch (error: any) {
    logger.error(`[HTTP][ERROR] Upload failed: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Upload failed', message: error.message });
  }
});

router.get('/latest/:deviceId', async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const reading = await sensorRepository.findLatestByDevice(deviceId);

    if (!reading) {
      return res.status(404).json({ success: false, error: 'No readings found' });
    }

    return res.json({
      success: true,
      data: reading,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/readings/:deviceId', async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);

    const readings = await sensorRepository.findRecentByDevice(deviceId, limit);

    return res.json({
      success: true,
      data: readings,
      count: readings.length,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/readings/latest', async (req: Request, res: Response) => {
  try {
    const deviceId = (req.query.deviceId as string | undefined);
    if (!deviceId) {
      return res.status(400).json({ success: false, error: 'deviceId query param is required' });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 1, 500);
    const readings = await sensorRepository.findRecentByDevice(deviceId, limit);

    return res.json({
      success: true,
      data: readings.length === 1 ? readings[0] : readings,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
