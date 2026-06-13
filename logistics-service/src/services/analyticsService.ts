import prisma from '../infrastructure/database/prisma';
import { logger } from '../utils/logger';

export interface ShipmentAnalytics {
  totalShipments: number;
  completedShipments: number;
  onTimePercent: number;
  averageDeliveryDays: number;
  totalDistance: number;
  totalFreightCost: number;
  totalInsuranceCost: number;
  averageTemperature: number;
  coldChainViolations: number;
  agroScoringGrade: string;
  revenue: {
    commissionEarned: number;
    insuranceMargin: number;
    dataMonetization: number;
    totalRevenue: number;
  };
}

export interface MonthlyReport {
  year: number;
  month: number;
  shipments: number;
  revenue: number;
  costBreakdown: {
    fuel: number;
    transport: number;
    insurance: number;
  };
  kpis: {
    onTimePercent: number;
    temperatureCompliance: number;
    customerSatisfaction: number;
  };
}

export interface FarmerReport {
  farmerId: string;
  farmerName: string;
  reportPeriod: string;
  shipments: {
    total: number;
    successful: number;
    onTime: number;
    withIssues: number;
  };
  products: Array<{
    type: string;
    totalTons: number;
    totalRevenue: number;
    costPerTon: number;
    netProfit: number;
  }>;
  logistics: {
    totalDistance: number;
    avgDeliveryTime: number;
    costPerKm: number;
    coldChainCompliance: number;
  };
  creditScore: {
    agroScoringGrade: string;
    creditLimit: number;
    utilizationPercent: number;
  };
}

// Get overall analytics
export async function getAnalytics(timePeriodDays: number = 30): Promise<ShipmentAnalytics> {
  const since = new Date();
  since.setDate(since.getDate() - timePeriodDays);

  const [totalShipments, completed, onTimeDeliveries, costData, tempData, coldChainIssues] =
    await Promise.all([
      prisma.shipment.count({ where: { createdAt: { gte: since } } }),
      prisma.shipment.count({
        where: { status: 'COMPLETED', createdAt: { gte: since } },
      }),
      prisma.shipment.count({
        where: {
          status: 'COMPLETED',
          deliveredAt: { lte: new Date() },
          createdAt: { gte: since },
        },
      }),
      prisma.shipment.aggregate({
        _sum: { freightCost: true },
        where: { createdAt: { gte: since } },
      }),
      prisma.shipmentTracking.aggregate({
        _avg: { tempCelsius: true },
        where: { recordedAt: { gte: since } },
      }),
      prisma.shipment.count({
        where: { status: 'COLD_CHAIN_ALERT', createdAt: { gte: since } },
      }),
    ]);

  const onTimePercent = completed > 0 ? Math.round((onTimeDeliveries / completed) * 100) : 0;
  const avgFreight = totalShipments > 0 ? (costData._sum.freightCost ?? 0) / totalShipments : 0;
  const totalFreight = costData._sum.freightCost ?? 0;
  const insuranceCost = Math.round(totalFreight * 0.05);

  const commissionEarned = Math.round(totalFreight * 0.03); // 3% commission
  const dataMonetization = Math.round(totalShipments * 2.5); // $2.5 per shipment

  // Agro-Scoring Grade (Credit Rating)
  let agroScoringGrade = 'F';
  if (onTimePercent >= 95 && coldChainIssues === 0) agroScoringGrade = 'A+';
  else if (onTimePercent >= 90 && coldChainIssues <= 1) agroScoringGrade = 'A';
  else if (onTimePercent >= 85) agroScoringGrade = 'B';
  else if (onTimePercent >= 75) agroScoringGrade = 'C';
  else agroScoringGrade = 'D';

  logger.info('Analytics calculated', {
    period: `${timePeriodDays} days`,
    totalShipments,
    onTimePercent,
    agroScore: agroScoringGrade,
  });

  return {
    totalShipments,
    completedShipments: completed,
    onTimePercent,
    averageDeliveryDays: timePeriodDays,
    totalDistance: 1248, // Mock value
    totalFreightCost: totalFreight,
    totalInsuranceCost: insuranceCost,
    averageTemperature: parseFloat((tempData._avg.tempCelsius ?? 0).toFixed(1)),
    coldChainViolations: coldChainIssues,
    agroScoringGrade,
    revenue: {
      commissionEarned,
      insuranceMargin: Math.round(insuranceCost * 0.3),
      dataMonetization,
      totalRevenue: commissionEarned + Math.round(insuranceCost * 0.3) + dataMonetization,
    },
  };
}

// Generate monthly report
export async function generateMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const shipments = await prisma.shipment.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      trackingPoints: true,
    },
  });

  const completed = shipments.filter((s) => s.status === 'COMPLETED').length;
  const totalCost = shipments.reduce((sum, s) => sum + s.freightCost, 0);
  const revenue = Math.round(totalCost * 0.03 + shipments.length * 2.5);

  const onTimeCount = shipments.filter(
    (s) => s.status === 'COMPLETED' && s.deliveredAt && s.etaAt && s.deliveredAt <= s.etaAt
  ).length;

  const costBreakdown = {
    fuel: Math.round(totalCost * 0.4),
    transport: Math.round(totalCost * 0.3),
    insurance: Math.round(totalCost * 0.05),
  };

  return {
    year,
    month,
    shipments: shipments.length,
    revenue,
    costBreakdown,
    kpis: {
      onTimePercent: completed > 0 ? Math.round((onTimeCount / completed) * 100) : 0,
      temperatureCompliance: 95, // Mock
      customerSatisfaction: 92, // Mock
    },
  };
}

// Generate farmer-specific report
export async function generateFarmerReport(
  farmerId: string,
  startDate: Date,
  endDate: Date
): Promise<FarmerReport> {
  const shipments = await prisma.shipment.findMany({
    where: {
      orderId: { contains: farmerId },
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      trackingPoints: true,
      documents: true,
    },
  });

  const completed = shipments.filter((s) => s.status === 'COMPLETED').length;
  const successful = completed;
  const onTime = shipments.filter(
    (s) => s.status === 'COMPLETED' && s.deliveredAt && s.etaAt && s.deliveredAt <= s.etaAt
  ).length;
  const withIssues = shipments.filter((s) => s.status === 'COLD_CHAIN_ALERT').length;

  const totalTons = shipments.reduce((sum, s) => sum + s.weightTons, 0);
  const totalDistance = shipments.reduce((sum, s) => sum + (s.distanceKm ?? 0), 0);
  const totalCost = shipments.reduce((sum, s) => sum + s.freightCost, 0);
  const totalRevenue = Math.round(totalTons * 500); // Mock: $500 per ton

  // Group by product type
  const productMap = new Map<string, { tons: number; revenue: number; cost: number }>();
  shipments.forEach((s) => {
    const existing = productMap.get(s.cargoType) || { tons: 0, revenue: 0, cost: 0 };
    productMap.set(s.cargoType, {
      tons: existing.tons + s.weightTons,
      revenue: existing.revenue + totalRevenue,
      cost: existing.cost + s.freightCost,
    });
  });

  const products = Array.from(productMap.entries()).map(([type, data]) => ({
    type,
    totalTons: data.tons,
    totalRevenue: data.revenue,
    costPerTon: Math.round(data.cost / data.tons),
    netProfit: data.revenue - data.cost,
  }));

  // Agro-Scoring for credit
  let agroScoringGrade = 'C';
  const onTimePercent = completed > 0 ? (onTime / completed) * 100 : 0;
  if (onTimePercent >= 95 && withIssues === 0) agroScoringGrade = 'A+';
  else if (onTimePercent >= 90) agroScoringGrade = 'A';
  else if (onTimePercent >= 80) agroScoringGrade = 'B';

  const creditLimit = agroScoringGrade === 'A+' ? 120_000_000 : 60_000_000; // soʻm

  logger.info('Farmer report generated', {
    farmerId,
    shipments: shipments.length,
    agroScore: agroScoringGrade,
    creditLimit,
  });

  return {
    farmerId,
    farmerName: `Farmer ${farmerId}`,
    reportPeriod: `${startDate.toDateString()} to ${endDate.toDateString()}`,
    shipments: {
      total: shipments.length,
      successful,
      onTime,
      withIssues,
    },
    products,
    logistics: {
      totalDistance,
      avgDeliveryTime: completed > 0 ? Math.round(totalDistance / completed) : 0,
      costPerKm: totalDistance > 0 ? Math.round(totalCost / totalDistance) : 0,
      coldChainCompliance: 100 - (withIssues / shipments.length) * 100,
    },
    creditScore: {
      agroScoringGrade,
      creditLimit,
      utilizationPercent: 45, // Mock
    },
  };
}

// Export to CSV
export function exportToCSV(data: any[], filename: string): Buffer {
  const headers = Object.keys(data[0] || {});
  const csv = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        })
        .join(',')
    ),
  ].join('\n');

  return Buffer.from(csv, 'utf-8');
}

// Generate HTML report
export function generateHTMLReport(report: any, title: string): string {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2ecc71; border-bottom: 3px solid #2ecc71; padding-bottom: 10px; }
        .section { margin: 30px 0; }
        .kpi { display: inline-block; width: 23%; margin: 1%; padding: 15px; background: #f9f9f9; border-left: 4px solid #2ecc71; }
        .kpi-value { font-size: 32px; font-weight: bold; color: #333; }
        .kpi-label { font-size: 12px; color: #999; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f0f0f0; font-weight: bold; }
        tr:hover { background: #f9f9f9; }
        .grade-a { color: #27ae60; font-weight: bold; }
        .grade-b { color: #f39c12; font-weight: bold; }
        .grade-c { color: #e74c3c; font-weight: bold; }
        .footer { margin-top: 40px; text-align: center; color: #999; font-size: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${title}</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        
        ${
          report.agroScoringGrade
            ? `
          <div class="section">
            <h2>📊 Credit Score (Agro-Scoring)</h2>
            <div class="kpi">
              <div class="kpi-value grade-${report.agroScoringGrade.toLowerCase()}">${report.agroScoringGrade}</div>
              <div class="kpi-label">Rating</div>
            </div>
            <div class="kpi">
              <div class="kpi-value">${report.creditLimit.toLocaleString()}</div>
              <div class="kpi-label">Credit Limit (soʻm)</div>
            </div>
          </div>
        `
            : ''
        }

        <div class="section">
          <h2>📈 Key Performance Indicators</h2>
          ${Object.entries(report.revenue || report.kpis || {})
            .map(
              ([key, value]) => `
            <div class="kpi">
              <div class="kpi-value">${value}</div>
              <div class="kpi-label">${key.replace(/([A-Z])/g, ' $1').toUpperCase()}</div>
            </div>
          `
            )
            .join('')}
        </div>

        <div class="section">
          <h2>📋 Details</h2>
          <table>
            ${Object.entries(report)
              .filter(([key]) => !['agroScoringGrade', 'creditLimit', 'creditScore'].includes(key))
              .map(
                ([key, value]) => `
              <tr>
                <td><strong>${key}</strong></td>
                <td>${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}</td>
              </tr>
            `
              )
              .join('')}
          </table>
        </div>

        <div class="footer">
          <p>AgroHub Analytics Report | Confidential</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
}

// Integration with Finance module for credit scoring
export async function updateFinanceWithAgroScore(farmerId: string, agroScore: string, creditLimit: number) {
  logger.info('Updating Finance module with Agro-Score', {
    farmerId,
    agroScore,
    creditLimit,
  });

  // This would call Finance service API
  // POST /api/v1/finance/farmers/{farmerId}/agro-score
  // { "score": "A+", "creditLimit": 120000000 }

  return {
    success: true,
    message: `Farmer ${farmerId} updated with score ${agroScore}. Credit limit: ${creditLimit}`,
  };
}

/**
 * When shipment is marked as completed, notify Finance service
 * This triggers Agro-Score update based on logistics performance
 */
export async function notifyShipmentCompletedToFinance(shipmentId: string, farmerId: string) {
  try {
    const financeIntegration = await import('./financeIntegrationService');

    // Fetch shipment details
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        coldChainAlerts: true,
      },
    });

    if (!shipment) {
      logger.warn('Shipment not found for finance notification', { shipmentId });
      return;
    }

    // Calculate metrics
    const onTimeDelivery = shipment.deliveryDate 
      ? new Date(shipment.deliveryDate) <= new Date(shipment.estimatedDeliveryDate)
      : false;

    const metrics = {
      onTimeDelivery,
      etaAtDate: new Date(shipment.estimatedDeliveryDate),
      deliveredAtDate: new Date(shipment.deliveryDate || new Date()),
      coldChainViolations: shipment.coldChainAlerts.length,
      avgTemperature: shipment.averageTemperature || 0,
      maxTemperatureAllowed: shipment.temperatureMax || 4,
      distanceKm: shipment.distance || 0,
      freightCost: shipment.freightCost || 0,
    };

    // Send to Finance service
    await financeIntegration.notifyShipmentCompleted({
      farmerId,
      shipmentId,
      trackId: shipment.trackingId,
      completedAt: new Date(),
      status: 'COMPLETED',
      metrics,
    });

    logger.info('✅ Shipment completion notified to Finance', {
      shipmentId,
      farmerId,
    });
  } catch (error) {
    logger.error('Error notifying Finance of shipment completion', {
      error,
      shipmentId,
    });
    // Don't throw - shipment should complete even if finance notification fails
  }
}
