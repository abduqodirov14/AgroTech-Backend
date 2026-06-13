/**
 * @file       customerInsightsService.ts
 * @module     AnalyticsService/Services
 * @description Compiles customer intelligence including segment distributions and repeat transaction rates.
 */
import { CustomerType } from '@prisma/client';
export interface CustomerInsights {
    customers: Array<{
        id: string;
        name: string;
        phone: string | null;
        type: CustomerType;
        totalPurchases: number;
    }>;
    segmentation: Array<{
        type: CustomerType;
        count: number;
        totalSpent: number;
    }>;
    repeatRate: number;
}
/**
 * Calculates customer analytics metrics.
 * @param authenticatedUserId The farmer's unique key.
 */
export declare function fetchCustomerInsights(authenticatedUserId: string): Promise<CustomerInsights>;
export declare function registerCustomer(authenticatedUserId: string, customerPayload: {
    name: string;
    phone?: string;
    type: CustomerType;
    totalPurchases?: number;
}): Promise<{
    id: string;
    name: string;
    userId: string;
    createdAt: Date;
    type: import(".prisma/client").$Enums.CustomerType;
    phone: string | null;
    totalPurchases: number;
}>;
//# sourceMappingURL=customerInsightsService.d.ts.map