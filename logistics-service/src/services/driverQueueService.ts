export type DriverStatus = 'AVAILABLE' | 'BUSY' | 'OFFLINE';

export interface DriverCandidate {
  id: string;
  fullName: string;
  phone: string;
  telegramId: number | null;
  vehicleId: string | null;
  status: DriverStatus;
  rating: number;
  distanceKm: number;
}

export interface MatchResult {
  driver: DriverCandidate | null;
  score: number;
}

export class DriverQueueService {
  private queue: Map<string, NodeJS.Timeout> = new Map();
  private readonly OFFER_TIMEOUT_MS = 3 * 60 * 1000;

  async enqueueForShipment(shipmentId: string, candidates: DriverCandidate[]) {
    if (this.queue.has(shipmentId)) {
      clearTimeout(this.queue.get(shipmentId)!);
    }

    const ranked = this.rankDrivers(candidates);

    for (const candidate of ranked) {
      const accepted = await this.offerToDriver(candidate, shipmentId);
      if (accepted) {
        return candidate;
      }
    }

    return null;
  }

  private rankDrivers(candidates: DriverCandidate[]): DriverCandidate[] {
    const maxDistance = Math.max(...candidates.map((c) => c.distanceKm), 1);

    return candidates
      .map((driver) => {
        const distanceScore = Math.max(0, 1 - driver.distanceKm / maxDistance);
        const statusScore = driver.status === 'AVAILABLE' ? 1.0 : 0.4;
        const ratingScore = Math.min(1, driver.rating / 5);
        const total = distanceScore * 0.4 + statusScore * 0.35 + ratingScore * 0.25;
        return { driver, score: total };
      })
      .filter((item) => item.score >= 0.4)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.driver);
  }

  private async offerToDriver(driver: DriverCandidate, shipmentId: string): Promise<boolean> {
    if (!driver.telegramId) return false;

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.queue.delete(shipmentId);
        resolve(false);
      }, this.OFFER_TIMEOUT_MS);

      this.queue.set(shipmentId, timer);

      console.log(
        `[DriverQueue] Offering shipment ${shipmentId} to driver ${driver.fullName} (${driver.telegramId})`
      );

      resolve(true);
    });
  }

  cancel(shipmentId: string) {
    const timer = this.queue.get(shipmentId);
    if (timer) {
      clearTimeout(timer);
      this.queue.delete(shipmentId);
    }
  }
}

export const driverQueueService = new DriverQueueService();
