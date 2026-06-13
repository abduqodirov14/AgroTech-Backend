/**
 * @file       creditRoutes.ts
 * @module     FintechService/Routes
 * @description Defines HTTP routes for credit ratings auditing and credit product processing.
 */

import { Router, Request, Response } from 'express';
import * as creditController from '../controllers/creditController';
import * as logisticsIntegrationService from '../services/logisticsIntegrationService';
import fintechLogger from '../utils/logger';

const creditRouter = Router();

creditRouter.get('/score', creditController.getCreditScore);
creditRouter.post('/score/calculate', creditController.recalculateCreditScore);

creditRouter.get('/products', creditController.getCreditProducts);
creditRouter.post('/apply', creditController.applyForCredit);
creditRouter.get('/applications', creditController.getCreditApplications);

// 🔗 LOGISTICS INTEGRATION - Webhook for shipment completion
creditRouter.post('/webhooks/shipment-completed', async (req: Request, res: Response) => {
  try {
    const logisticsData = req.body;
    
    fintechLogger.info('📦 Received shipment completion webhook', {
      trackId: logisticsData.trackId,
      farmerId: logisticsData.farmerId,
    });

    const result = await logisticsIntegrationService.handleShipmentCompletedWebhook(logisticsData);
    
    res.json({
      success: true,
      data: result,
      message: '✅ Agro-Score updated based on logistics performance',
    });
  } catch (error) {
    fintechLogger.error('Error processing shipment webhook', { error });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process shipment webhook'
    });
  }
});

// Get logistics-based credit metrics for farmer
creditRouter.get('/metrics/logistics/:farmerId', async (req: Request, res: Response) => {
  try {
    const { farmerId } = req.params;
    const metrics = logisticsIntegrationService.getLogisticsBasedCreditMetrics(farmerId);
    
    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch metrics' });
  }
});

export default creditRouter;
