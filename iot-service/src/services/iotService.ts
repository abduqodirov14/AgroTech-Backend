/**
 * @file       iotService.ts
 * @path       backend/iot-service/src/services/iotService.ts
 * @description IoT sensor data processing from ESP32 devices
 */

import logger from '../utils/logger';

export interface SensorData {
  deviceId: string;
  farmerId: string;
  fieldId: string;
  timestamp: Date;
  metrics: {
    soilMoisture: number; // 0-100%
    temperature: number; // °C
    humidity: number; // 0-100%
    soilPH: number; // 0-14
    soilNitrogen: number; // 0-100 mg/kg
    soilPhosphorus: number; // 0-100 mg/kg
    soilPotassium: number; // 0-100 mg/kg
    lightIntensity: number; // lux
    rainfall: number; // mm
  };
}

export interface SensorAlert {
  fieldId: string;
  farmerId: string;
  type: 'MOISTURE_LOW' | 'MOISTURE_HIGH' | 'TEMP_HIGH' | 'TEMP_LOW' | 'PH_IMBALANCE' | 'NITROGEN_LOW';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  recommendation: string;
  timestamp: Date;
  resolved: boolean;
}

export interface IrrigationCommand {
  fieldId: string;
  duration: number; // seconds
  intensity: number; // 0-100%
  timestamp: Date;
}

class IoTService {
  private sensorHistory: Map<string, SensorData[]> = new Map();
  private activeAlerts: Map<string, SensorAlert[]> = new Map();

  /**
   * Process incoming sensor data from ESP32 device
   */
  async processSensorData(data: SensorData): Promise<{
    success: boolean;
    alerts: SensorAlert[];
    recommendation?: string;
  }> {
    try {
      // Store data
      const key = `${data.farmerId}-${data.fieldId}`;
      if (!this.sensorHistory.has(key)) {
        this.sensorHistory.set(key, []);
      }
      this.sensorHistory.get(key)!.push(data);

      // Keep only last 30 days
      const history = this.sensorHistory.get(key)!;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const filtered = history.filter(d => d.timestamp > thirtyDaysAgo);
      this.sensorHistory.set(key, filtered);

      logger.info('📊 Sensor data received', {
        farmerId: data.farmerId,
        fieldId: data.fieldId,
        soilMoisture: data.metrics.soilMoisture,
        temperature: data.metrics.temperature,
      });

      // Check for anomalies
      const alerts = this.checkForAlerts(data);

      // Get recommendation
      const recommendation = this.getRecommendation(data);

      return {
        success: true,
        alerts,
        recommendation,
      };
    } catch (error: any) {
      logger.error('Failed to process sensor data', { error });
      return { success: false, alerts: [] };
    }
  }

  /**
   * Check sensor readings against thresholds
   */
  private checkForAlerts(data: SensorData): SensorAlert[] {
    const alerts: SensorAlert[] = [];

    // Soil moisture check
    if (data.metrics.soilMoisture < 30) {
      alerts.push({
        fieldId: data.fieldId,
        farmerId: data.farmerId,
        type: 'MOISTURE_LOW',
        severity: 'WARNING',
        message: `🌱 Soil moisture too low: ${data.metrics.soilMoisture}%`,
        recommendation: '💧 Activate irrigation for 30-45 minutes',
        timestamp: data.timestamp,
        resolved: false,
      });
    }

    if (data.metrics.soilMoisture > 85) {
      alerts.push({
        fieldId: data.fieldId,
        farmerId: data.farmerId,
        type: 'MOISTURE_HIGH',
        severity: 'INFO',
        message: `💦 Soil moisture high: ${data.metrics.soilMoisture}%`,
        recommendation: '⏸️ Wait before next irrigation, check drainage',
        timestamp: data.timestamp,
        resolved: false,
      });
    }

    // Temperature check
    if (data.metrics.temperature > 35) {
      alerts.push({
        fieldId: data.fieldId,
        farmerId: data.farmerId,
        type: 'TEMP_HIGH',
        severity: 'CRITICAL',
        message: `🔥 Temperature too high: ${data.metrics.temperature}°C`,
        recommendation: '❄️ Increase irrigation to cool soil, consider shade cloth',
        timestamp: data.timestamp,
        resolved: false,
      });
    }

    if (data.metrics.temperature < 5) {
      alerts.push({
        fieldId: data.fieldId,
        farmerId: data.farmerId,
        type: 'TEMP_LOW',
        severity: 'WARNING',
        message: `❄️ Temperature too low: ${data.metrics.temperature}°C`,
        recommendation: '🌡️ Frost risk! Check seedlings, consider protective measures',
        timestamp: data.timestamp,
        resolved: false,
      });
    }

    // Soil pH check (optimal: 6-7.5 for most crops)
    if (data.metrics.soilPH < 5.5 || data.metrics.soilPH > 8.0) {
      alerts.push({
        fieldId: data.fieldId,
        farmerId: data.farmerId,
        type: 'PH_IMBALANCE',
        severity: 'WARNING',
        message: `⚖️ Soil pH imbalance: ${data.metrics.soilPH}`,
        recommendation: data.metrics.soilPH < 5.5
          ? '📈 Add lime to increase pH'
          : '📉 Add sulfur to decrease pH',
        timestamp: data.timestamp,
        resolved: false,
      });
    }

    // Nitrogen check (critical for growth)
    if (data.metrics.soilNitrogen < 20) {
      alerts.push({
        fieldId: data.fieldId,
        farmerId: data.farmerId,
        type: 'NITROGEN_LOW',
        severity: 'WARNING',
        message: `🌾 Soil nitrogen low: ${data.metrics.soilNitrogen} mg/kg`,
        recommendation: '💚 Apply nitrogen fertilizer (urea or compost)',
        timestamp: data.timestamp,
        resolved: false,
      });
    }

    // Store alerts
    const key = `${data.farmerId}-${data.fieldId}`;
    if (!this.activeAlerts.has(key)) {
      this.activeAlerts.set(key, []);
    }
    this.activeAlerts.get(key)!.push(...alerts);

    return alerts;
  }

  /**
   * AI-powered recommendation based on sensor data
   */
  private getRecommendation(data: SensorData): string {
    // Collect data for last 7 days
    const key = `${data.farmerId}-${data.fieldId}`;
    const history = this.sensorHistory.get(key) || [];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekData = history.filter(d => d.timestamp > sevenDaysAgo);

    if (weekData.length < 2) {
      return '📊 Collecting baseline data... Check again in 24 hours.';
    }

    // Calculate averages
    const avgMoisture = weekData.reduce((sum, d) => sum + d.metrics.soilMoisture, 0) / weekData.length;
    const avgTemp = weekData.reduce((sum, d) => sum + d.metrics.temperature, 0) / weekData.length;
    const trend = data.metrics.soilMoisture > avgMoisture ? '↗️ increasing' : '↘️ decreasing';

    // Generate contextual recommendation
    if (avgTemp > 30 && data.metrics.soilMoisture < 50) {
      return `🌤️ HOT & DRY: High temp (${avgTemp.toFixed(1)}°C) + low moisture (${trend}). Irrigate 45min at 80% intensity early morning.`;
    }

    if (avgTemp < 15 && data.metrics.soilMoisture > 70) {
      return `❄️ COLD & WET: Low temp (${avgTemp.toFixed(1)}°C) + high moisture. Reduce irrigation, check soil drainage, monitor for root rot.`;
    }

    if (data.metrics.soilNitrogen < 30 && data.metrics.soilPH > 7.5) {
      return `🔧 NUTRIENT ISSUE: Alkaline soil (pH ${data.metrics.soilPH}) reduces nitrogen availability. Add acid-forming fertilizer.`;
    }

    return `✅ CONDITIONS OPTIMAL: Temp ${avgTemp.toFixed(1)}°C, Moisture ${avgMoisture.toFixed(0)}%, pH ${data.metrics.soilPH}. Continue monitoring.`;
  }

  /**
   * Generate AI irrigation command
   */
  async generateIrrigationCommand(fieldId: string, farmerId: string): Promise<IrrigationCommand | null> {
    try {
      const key = `${farmerId}-${fieldId}`;
      const history = this.sensorHistory.get(key);

      if (!history || history.length === 0) {
        logger.warn('No sensor data for field', { farmerId, fieldId });
        return null;
      }

      const latest = history[history.length - 1];

      // Decide if irrigation needed
      if (latest.metrics.soilMoisture >= 50) {
        logger.info('Irrigation not needed', {
          fieldId,
          moisture: latest.metrics.soilMoisture,
        });
        return null;
      }

      // Calculate duration based on how dry
      const dryness = 50 - latest.metrics.soilMoisture;
      const duration = Math.min(dryness * 0.6 * 60, 3600); // 0-60 min
      const intensity = Math.min(50 + (dryness * 0.5), 100); // 50-100%

      const command: IrrigationCommand = {
        fieldId,
        duration: Math.round(duration),
        intensity: Math.round(intensity),
        timestamp: new Date(),
      };

      logger.info('💧 Irrigation command generated', {
        fieldId,
        duration: command.duration,
        intensity: command.intensity,
      });

      return command;
    } catch (error) {
      logger.error('Failed to generate irrigation command', { error });
      return null;
    }
  }

  /**
   * Get sensor data for field
   */
  getSensorHistory(farmerId: string, fieldId: string, days: number = 7): SensorData[] {
    const key = `${farmerId}-${fieldId}`;
    const history = this.sensorHistory.get(key) || [];
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return history.filter(d => d.timestamp > cutoff);
  }

  /**
   * Get active alerts for field
   */
  getActiveAlerts(farmerId: string, fieldId: string): SensorAlert[] {
    const key = `${farmerId}-${fieldId}`;
    const alerts = this.activeAlerts.get(key) || [];
    return alerts.filter(a => !a.resolved);
  }

  /**
   * Resolve alert
   */
  resolveAlert(farmerId: string, fieldId: string, alertType: string) {
    const key = `${farmerId}-${fieldId}`;
    const alerts = this.activeAlerts.get(key) || [];
    alerts.forEach(a => {
      if (a.type === alertType) a.resolved = true;
    });
  }

  /**
   * Predict crop quality based on sensor data
   */
  predictCropQuality(farmerId: string, fieldId: string): {
    quality: 'POOR' | 'STANDARD' | 'PREMIUM' | 'EXPORT';
    score: number;
    factors: any;
  } {
    const history = this.getSensorHistory(farmerId, fieldId, 90);

    if (history.length < 5) {
      return { quality: 'STANDARD', score: 50, factors: { reason: 'Insufficient data' } };
    }

    // Calculate quality metrics
    const avgMoisture = history.reduce((s, d) => s + d.metrics.soilMoisture, 0) / history.length;
    const avgTemp = history.reduce((s, d) => s + d.metrics.temperature, 0) / history.length;
    const avgPH = history.reduce((s, d) => s + d.metrics.soilPH, 0) / history.length;
    const avgNitrogen = history.reduce((s, d) => s + d.metrics.soilNitrogen, 0) / history.length;

    // Score factors (0-100)
    const moistureScore = Math.min(Math.abs(avgMoisture - 60) / 2, 100); // 60% is optimal
    const tempScore = Math.min(Math.abs(avgTemp - 25) / 2, 100); // 25°C is optimal
    const phScore = Math.min(Math.abs(avgPH - 6.5) * 10, 100); // 6.5 is optimal
    const nitrogenScore = Math.min((avgNitrogen / 50) * 100, 100); // 50+ is good

    // Weighted score
    const totalScore = (moistureScore + tempScore + phScore + nitrogenScore) / 4;

    let quality: 'POOR' | 'STANDARD' | 'PREMIUM' | 'EXPORT' = 'STANDARD';
    if (totalScore >= 90) quality = 'EXPORT';
    else if (totalScore >= 75) quality = 'PREMIUM';
    else if (totalScore >= 50) quality = 'STANDARD';
    else quality = 'POOR';

    return {
      quality,
      score: Math.round(totalScore),
      factors: {
        moisture: avgMoisture.toFixed(1),
        temperature: avgTemp.toFixed(1),
        ph: avgPH.toFixed(1),
        nitrogen: avgNitrogen.toFixed(0),
      },
    };
  }
}

export default new IoTService();
