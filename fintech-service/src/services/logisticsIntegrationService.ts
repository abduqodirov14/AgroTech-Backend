/**
 * @file       logisticsIntegrationService.ts
 * @path       fintech-service/src/services/logisticsIntegrationService.ts
 * @description Integration with Logistics module to incorporate shipping data into Agro-Scoring
 */

import fintechLogger from '../utils/logger';

/**
 * LOGISTICS DATA → AGRO-SCORING FACTOR
 * 
 * When shipment is completed, Logistics sends:
 * ✓ On-time delivery (delivery date ≤ ETA)
 * ✓ Cold chain compliance (temp violations: 0 or >0)
 * ✓ Distance traveled (efficiency metric)
 * 
 * This impacts farmer's credit score:
 * • On-time delivery +10 points
 * • Temperature violation -20 points
 * • Professional documentation +5 points
 */

export interface LogisticsData {
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
}

export interface AgroScoreUpdate {
  farmerId: string;
  scoreAdjustment: number;
  factors: {
    onTimeBonus: number;
    coldChainPenalty: number;
    professionalismBonus: number;
  };
  newScore: number;
  rationale: string;
}

/**
 * Calculate Agro-Score adjustment from logistics performance
 */
export function calculateAgroScoreAdjustment(logisticsData: LogisticsData): AgroScoreUpdate {
  let scoreAdjustment = 0;
  const factors = {
    onTimeBonus: 0,
    coldChainPenalty: 0,
    professionalismBonus: 0,
  };

  const rationales: string[] = [];

  // Factor 1: On-Time Delivery (±15 points)
  if (logisticsData.metrics.onTimeDelivery) {
    scoreAdjustment += 15;
    factors.onTimeBonus = 15;
    rationales.push('✅ On-time delivery (+15 points)');
  } else {
    scoreAdjustment -= 10;
    factors.onTimeBonus = -10;
    rationales.push('⏱️ Late delivery (-10 points)');
  }

  // Factor 2: Cold Chain Compliance (±30 points)
  if (logisticsData.metrics.coldChainViolations === 0) {
    scoreAdjustment += 20;
    factors.coldChainPenalty = 20;
    rationales.push('❄️ Perfect cold chain compliance (+20 points)');
  } else if (logisticsData.metrics.coldChainViolations === 1) {
    scoreAdjustment -= 15;
    factors.coldChainPenalty = -15;
    rationales.push('⚠️ One cold chain violation (-15 points)');
  } else {
    scoreAdjustment -= 35;
    factors.coldChainPenalty = -35;
    rationales.push(`❌ ${logisticsData.metrics.coldChainViolations} cold chain violations (-35 points)`);
  }

  // Factor 3: Professionalism (Complete documentation)
  scoreAdjustment += 10;
  factors.professionalismBonus = 10;
  rationales.push('📄 Complete documentation (+10 points)');

  // Factor 4: Distance Efficiency (bonus for long-distance exports)
  if (logisticsData.metrics.distanceKm > 500) {
    scoreAdjustment += 5;
    factors.professionalismBonus += 5;
    rationales.push('🌍 Long-distance export success (+5 points)');
  }

  // Note: Actual new score would be fetched from database
  const newScore = 75 + scoreAdjustment; // Mock base score of 75

  fintechLogger.info('Agro-Score adjustment calculated', {
    farmerId: logisticsData.farmerId,
    shipmentId: logisticsData.shipmentId,
    adjustment: scoreAdjustment,
    newScore,
  });

  return {
    farmerId: logisticsData.farmerId,
    scoreAdjustment,
    factors,
    newScore: Math.max(0, Math.min(100, newScore)), // Clamp between 0-100
    rationale: rationales.join('; '),
  };
}

/**
 * Convert Agro-Score (0-100) to Credit Grade and Limit
 */
export function scoreToGradeAndLimit(score: number): {
  grade: string;
  creditLimitUSD: number;
  creditLimitSom: number;
  interestRate: number;
  approvalSpeed: string;
} {
  let grade = 'F';
  let creditLimitUSD = 0;
  let interestRate = 25;
  let approvalSpeed = '7 days';

  if (score >= 95) {
    grade = 'A+';
    creditLimitUSD = 50_000; // $50k = ~500M soʻm
    interestRate = 5;
    approvalSpeed = 'instant';
  } else if (score >= 90) {
    grade = 'A';
    creditLimitUSD = 40_000;
    interestRate = 7;
    approvalSpeed = '1 hour';
  } else if (score >= 80) {
    grade = 'B';
    creditLimitUSD = 25_000;
    interestRate = 10;
    approvalSpeed = '2 hours';
  } else if (score >= 70) {
    grade = 'C';
    creditLimitUSD = 15_000;
    interestRate = 15;
    approvalSpeed = '1 day';
  } else if (score >= 60) {
    grade = 'D';
    creditLimitUSD = 5_000;
    interestRate = 20;
    approvalSpeed = '2 days';
  }

  // Convert to soʻm (1 USD ≈ 10,000 soʻm)
  const creditLimitSom = creditLimitUSD * 10_000;

  return {
    grade,
    creditLimitUSD,
    creditLimitSom,
    interestRate,
    approvalSpeed,
  };
}

/**
 * Mock: Receive webhook from Logistics when shipment completes
 * In production: This would be called via inter-service communication
 */
export async function onLogisticsShipmentCompleted(logisticsData: LogisticsData) {
  fintechLogger.info('📦 Logistics shipment completed - updating Agro-Score', {
    trackId: logisticsData.trackId,
    farmerId: logisticsData.farmerId,
  });

  // Calculate score adjustment
  const scoreUpdate = calculateAgroScoreAdjustment(logisticsData);

  // Get new credit grade
  const creditInfo = scoreToGradeAndLimit(scoreUpdate.newScore);

  // Log the update (in production, save to database)
  fintechLogger.info('✅ Agro-Score updated', {
    farmerId: scoreUpdate.farmerId,
    scoreAdjustment: scoreUpdate.scoreAdjustment,
    newScore: scoreUpdate.newScore,
    newGrade: creditInfo.grade,
    creditLimit: creditInfo.creditLimitSom,
    rationale: scoreUpdate.rationale,
  });

  return {
    success: true,
    scoreUpdate,
    creditInfo,
    message: `✅ Farmer's Agro-Score updated to ${scoreUpdate.newScore} (${creditInfo.grade}). New credit limit: ${creditInfo.creditLimitSom.toLocaleString()} soʻm`,
  };
}

/**
 * Webhook integration example
 * Called from Logistics service: POST /api/v1/fintech/webhooks/shipment-completed
 */
export async function handleShipmentCompletedWebhook(payload: LogisticsData) {
  try {
    const result = await onLogisticsShipmentCompleted(payload);
    return result;
  } catch (error) {
    fintechLogger.error('Error processing logistics webhook', { error });
    throw error;
  }
}

/**
 * Get farmer's logistics-based credit metrics
 */
export function getLogisticsBasedCreditMetrics(farmerId: string) {
  // In production, fetch from database
  return {
    farmerId,
    logisticsScore: 85, // Based on 30 successful shipments
    shipmentsCompleted: 30,
    onTimePercent: 96,
    coldChainCompliance: 98,
    averageDeliveryDays: 3.2,
    totalExported: 250, // tons
    totalExportRevenue: 125_000, // USD
  };
}

/**
 * Example: Multiple factors affecting credit score
 * 
 * Agro-Score Calculation:
 * 1. Sensor Data (40% weight)
 *    - Device uptime
 *    - Irrigation compliance
 *    - Soil health data consistency
 * 
 * 2. Financial History (30% weight)
 *    - Transaction history
 *    - Payment timeliness
 *    - Budget adherence
 * 
 * 3. Logistics Performance (20% weight) ← NEW
 *    - On-time delivery rate
 *    - Cold chain compliance
 *    - Export volume
 * 
 * 4. Market Intelligence (10% weight)
 *    - Crop quality ratings
 *    - Buyer reputation
 *    - Weather resilience
 */
export function getAgroScoreWeights() {
  return {
    sensorData: 0.4,
    financialHistory: 0.3,
    logisticsPerformance: 0.2,
    marketIntelligence: 0.1,
  };
}
