/**
 * @file       creditProductGateway.ts
 * @module     FintechService/Services
 * @description Manages available credit product listings, qualifications auditing, and loan application processing.
 */
/**
 * Lists credit products indicating whether they are unlocked based on the farmer's current score.
 * @param authenticatedUserId Unique user identifier.
 */
export declare function fetchEligibleCreditProductsForUser(authenticatedUserId: string): Promise<{
    id: string;
    name: string;
    description: string | null;
    maxAmount: number;
    currency: string;
    minScoreRequired: number;
    isUnlocked: boolean;
}[]>;
/**
 * Creates a credit request application after confirming scoring minimums and limits.
 */
export declare function submitCreditApplication(authenticatedUserId: string, productId: string, requestedAmount: number): Promise<{
    product: {
        id: string;
        currency: string;
        description: string | null;
        name: string;
        maxAmount: number;
        minScore: number;
    };
} & {
    id: string;
    userId: string;
    amount: number;
    createdAt: Date;
    status: import(".prisma/client").$Enums.CreditStatus;
    scoreAtApply: number;
    productId: string;
}>;
/**
 * Lists all credit applications submitted by the user.
 */
export declare function fetchCreditApplications(authenticatedUserId: string): Promise<({
    product: {
        id: string;
        currency: string;
        description: string | null;
        name: string;
        maxAmount: number;
        minScore: number;
    };
} & {
    id: string;
    userId: string;
    amount: number;
    createdAt: Date;
    status: import(".prisma/client").$Enums.CreditStatus;
    scoreAtApply: number;
    productId: string;
})[]>;
//# sourceMappingURL=creditProductGateway.d.ts.map