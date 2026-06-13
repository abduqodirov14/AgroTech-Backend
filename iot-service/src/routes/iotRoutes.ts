/**
 * @file       iotRoutes.ts
 * @path       backend/iot-service/src/routes/iotRoutes.ts
 * @description REST API endpoints for IoT sensor data
 */

import { Router, Request, Response } from 'express';
import iotService from '../services/iotService';

const router = Router();

/**
 * POST /api/v1/iot/data/submit
 * Receive sensor data from ESP32 device (via MQTT bridge)
 */
router.post('/data/submit', async (req: Request, res: Response) => {
  try {
    const data = req.body;

    const result = await iotService.processSensorData({
      deviceId: data.deviceId,
      farmerId: data.farmerId,
      fieldId: data.fieldId,
      timestamp: new Date(data.timestamp || new Date()),
      metrics: {
        soilMoisture: data.soilMoisture || 50,
        temperature: data.temperature || 25,
        humidity: data.humidity || 60,
        soilPH: data.soilPH || 6.5,
        soilNitrogen: data.soilNitrogen || 40,
        soilPhosphorus: data.soilPhosphorus || 30,
        soilPotassium: data.soilPotassium || 35,
        lightIntensity: data.lightIntensity || 500,
        rainfall: data.rainfall || 0,
      },
    });

    res.json({
      success: true,
      data: result,
      message: '✅ Sensor data processed',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/iot/sensors/:fieldId
 * Get sensor history for field
 */
router.get('/sensors/:fieldId', async (req: Request, res: Response) => {
  try {
    const { farmerId, days = 7 } = req.query as any;

    const history = iotService.getSensorHistory(farmerId, req.params.fieldId, parseInt(days));

    res.json({
      success: true,
      data: {
        fieldId: req.params.fieldId,
        farmerId,
        dataPoints: history.length,
        days: parseInt(days),
        data: history,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/iot/alerts
 * Get active alerts for farmer's fields
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const { farmerId, fieldId } = req.query as any;

    const alerts = iotService.getActiveAlerts(farmerId, fieldId);

    res.json({
      success: true,
      data: {
        count: alerts.length,
        critical: alerts.filter(a => a.severity === 'CRITICAL').length,
        warning: alerts.filter(a => a.severity === 'WARNING').length,
        info: alerts.filter(a => a.severity === 'INFO').length,
        alerts,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/iot/alerts/resolve
 * Mark alert as resolved
 */
router.post('/alerts/resolve', async (req: Request, res: Response) => {
  try {
    const { farmerId, fieldId, alertType } = req.body;

    iotService.resolveAlert(farmerId, fieldId, alertType);

    res.json({
      success: true,
      message: '✅ Alert resolved',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/iot/irrigation/auto
 * Generate automatic irrigation command based on soil moisture
 */
router.post('/irrigation/auto', async (req: Request, res: Response) => {
  try {
    const { farmerId, fieldId } = req.body;

    const command = await iotService.generateIrrigationCommand(fieldId, farmerId);

    if (!command) {
      return res.json({
        success: true,
        data: null,
        message: '✅ Soil moisture adequate - no irrigation needed',
      });
    }

    res.json({
      success: true,
      data: command,
      message: `💧 Irrigation command: ${command.duration}s at ${command.intensity}% intensity`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/iot/crop-quality/:fieldId
 * Predict crop quality based on sensor data
 */
router.get('/crop-quality/:fieldId', async (req: Request, res: Response) => {
  try {
    const { farmerId } = req.query as any;

    const prediction = iotService.predictCropQuality(farmerId, req.params.fieldId);

    res.json({
      success: true,
      data: {
        fieldId: req.params.fieldId,
        farmerId,
        ...prediction,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /health
 * Health check
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'iot-service',
    timestamp: new Date().toISOString(),
  });
});

export default router;
