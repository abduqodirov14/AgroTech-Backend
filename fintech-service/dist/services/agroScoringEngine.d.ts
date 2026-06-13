/**
 * @file       agroScoringEngine.ts
 * @module     FintechService/Services
 * @description The core engine that evaluates farmer creditworthiness based on sensor activity, irrigation compliance, alert rate, and data consistency.
 */
export interface CreditScoreBreakdown {
    score: number;
    sensorUptimePercent: number;
    irrigationExecutionPercent: number;
    alertPenaltyPercent: number;
    consistencyDaysCount: number;
    period: string;
    metrics: {
        uptimeWeight: number;
        irrigationWeight: number;
        alertWeight: number;
        consistencyWeight: number;
    };
}
/**
 * Recalculates the farmer's credit scoring metric based on IoT telemetry and operations.
 * @param authenticatedUserId The user whose score is being evaluated.
 * @param period Billing/scoring period key.
 */
export declare function computeFarmerCreditScore(authenticatedUserId: string, period?: string): Promise<CreditScoreBreakdown>;
//# sourceMappingURL=agroScoringEngine.d.ts.map