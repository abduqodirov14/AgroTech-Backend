/**
 * @file       transactionLedgerService.ts
 * @module     FintechService/Services
 * @description Domain logic for creating, viewing, updating and deleting transactions.
 */
import { TransactionType, TransactionCategory } from '@prisma/client';
export interface TransactionCreationInput {
    type: TransactionType;
    category: TransactionCategory;
    amount: number;
    currency?: string;
    description?: string;
    referenceId?: string;
    createdAt?: string;
}
export interface TransactionFilterOptions {
    type?: TransactionType;
    category?: TransactionCategory;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
}
/**
 * Retrieves transactions ledger records matching filters and returns paginated result.
 */
export declare function fetchTransactionsForUser(authenticatedUserId: string, filters: TransactionFilterOptions): Promise<{
    transactions: {
        id: string;
        userId: string;
        type: import(".prisma/client").$Enums.TransactionType;
        category: import(".prisma/client").$Enums.TransactionCategory;
        amount: number;
        currency: string;
        description: string | null;
        referenceId: string | null;
        createdAt: Date;
    }[];
    pagination: {
        totalCount: number;
        currentPage: number;
        totalPages: number;
        pageSize: number;
    };
}>;
/**
 * Creates a new transaction and audits spending bounds if it's an expense.
 */
export declare function createTransactionForUser(authenticatedUserId: string, txnPayload: TransactionCreationInput): Promise<{
    id: string;
    userId: string;
    type: import(".prisma/client").$Enums.TransactionType;
    category: import(".prisma/client").$Enums.TransactionCategory;
    amount: number;
    currency: string;
    description: string | null;
    referenceId: string | null;
    createdAt: Date;
}>;
/**
 * Deletes a ledger transaction. Corrects budget thresholds if deleting an expense.
 */
export declare function deleteTransactionForUser(transactionId: string, authenticatedUserId: string): Promise<{
    id: string;
    userId: string;
    type: import(".prisma/client").$Enums.TransactionType;
    category: import(".prisma/client").$Enums.TransactionCategory;
    amount: number;
    currency: string;
    description: string | null;
    referenceId: string | null;
    createdAt: Date;
}>;
//# sourceMappingURL=transactionLedgerService.d.ts.map