/**
 * @file       financeIntegrationService.ts
 * @path       logistics-service/src/services/financeIntegrationService.ts
 * @description Inter-service communication with Finance module for credit scoring
 */

import axios from 'axios';
import logisticsLogger from '../utils/logger';

const FINANCE_SERVICE_URL = process.env.FINANCE_SERVICE_URL || 'http://localhost:3002';
const API_KEY = process.env.SERVICE_API_KEY || 'service-key-logistics';

/**
 * Notify Finance service when shipment is completed
 * Triggers Agro-Score update based on logistics performance
 */
export async function notifyShipmentCompleted(shipmentData: {
  farmerId: string;
  shipmentId: string;
  trackId: string;
  completedAt: Date;
  status: 'COMPLETED' | 'CANCELLED' | 'DELIVERED';
  metrics: {
    onTimeDelivery: boolean;
    etaAtDate: Date;
    deliveredAtDate: Date;
    coldChainViolations: number;
    avgTemperature: number;
    maxTemperatureAllowed: number;
    distanceKm: number;
    freightCost: number;
  };
}) {
  try {
    logisticsLogger.info('📤 Sending shipment completion to Finance', {
      trackId: shipmentData.trackId,
      farmerId: shipmentData.farmerId,
    });

    const response = await axios.post(
      `${FINANCE_SERVICE_URL}/api/v1/credit/webhooks/shipment-completed`,
      shipmentData,
      {
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );

    logisticsLogger.info('✅ Finance service updated with shipment data', {
      trackId: shipmentData.trackId,
      response: response.data,
    });

    return response.data;
  } catch (error: any) {
    logisticsLogger.error('❌ Failed to notify Finance service', {
      error: error.message,
      trackId: shipmentData.trackId,
    });
    // Don't throw - allow shipment to complete even if finance update fails
    return { success: false, error: error.message };
  }
}

/**
 * Get farmer's current credit limit from Finance
 */
export async function getFarmerCreditLimit(farmerId: string): Promise<{
  creditLimitSom: number;
  grade: string;
  approvalSpeed: string;
}> {
  try {
    const response = await axios.get(
      `${FINANCE_SERVICE_URL}/api/v1/credit/score/${farmerId}`,
      {
        headers: { 'X-API-Key': API_KEY },
        timeout: 3000,
      }
    );

    return {
      creditLimitSom: response.data.creditLimit || 0,
      grade: response.data.grade || 'F',
      approvalSpeed: response.data.approvalSpeed || '7 days',
    };
  } catch (error: any) {
    logisticsLogger.warn('Could not fetch credit limit from Finance', {
      error: error.message,
      farmerId,
    });
    return {
      creditLimitSom: 0,
      grade: 'F',
      approvalSpeed: '7 days',
    };
  }
}

/**
 * Check if farmer's cold chain compliance affects credit approval
 * Used before creating new shipment
 */
export async function checkLogisticsHealthForCredit(farmerId: string): Promise<{
  eligible: boolean;
  coldChainScore: number;
  reason?: string;
}> {
  try {
    const response = await axios.get(
      `${FINANCE_SERVICE_URL}/api/v1/credit/metrics/logistics/${farmerId}`,
      {
        headers: { 'X-API-Key': API_KEY },
        timeout: 3000,
      }
    );

    const metrics = response.data.data;
    const coldChainCompliance = metrics.coldChainCompliance || 0;

    return {
      eligible: coldChainCompliance >= 90,
      coldChainScore: coldChainCompliance,
      reason: coldChainCompliance < 90 
        ? `Cold chain compliance too low (${coldChainCompliance}%). Must be ≥90% for new credits.`
        : undefined,
    };
  } catch (error) {
    logisticsLogger.warn('Could not check logistics health for credit', { error });
    return { eligible: true, coldChainScore: 0 };
  }
}
