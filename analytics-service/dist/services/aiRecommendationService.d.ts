/**
 * @file       aiRecommendationService.ts
 * @module     AnalyticsService/Services
 * @description Analyzes farm telemetry and ledger metrics to generate actionable AI-driven agronomic recommendations.
 */
export interface SmartRecommendation {
    id: string;
    category: 'EKIN' | 'OGIT' | 'NAMNLIK' | 'MOLIYA' | 'ROTATION';
    title: string;
    description: string;
    impactScore: number;
    actionUrl?: string;
}
/**
 * Computes AI suggestions based on crops margins, low soil moisture levels, and depleted items.
 */
export declare function generateAiRecommendations(authenticatedUserId: string): Promise<SmartRecommendation[]>;
//# sourceMappingURL=aiRecommendationService.d.ts.map