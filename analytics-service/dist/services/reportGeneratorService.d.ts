/**
 * @file       reportGeneratorService.ts
 * @module     AnalyticsService/Services
 * @description Compiles and persists farm-level operations reports, aggregating financial KPIs, crop yields, and inventory status.
 */
import { ReportType, ReportFormat } from '@prisma/client';
export interface ReportCreationInput {
    type: ReportType;
    title: string;
    format?: ReportFormat;
    zoneId?: string;
}
export declare function fetchAllReportsForUser(authenticatedUserId: string): Promise<{
    format: import(".prisma/client").$Enums.ReportFormat;
    id: string;
    userId: string;
    createdAt: Date;
    zoneId: string | null;
    type: import(".prisma/client").$Enums.ReportType;
    data: import("@prisma/client/runtime/library").JsonValue | null;
    title: string;
    fileUrl: string | null;
}[]>;
/**
 * Aggregates farm data into a persisted JSON report record.
 */
export declare function compileNewReport(authenticatedUserId: string, reportPayload: ReportCreationInput): Promise<{
    format: import(".prisma/client").$Enums.ReportFormat;
    id: string;
    userId: string;
    createdAt: Date;
    zoneId: string | null;
    type: import(".prisma/client").$Enums.ReportType;
    data: import("@prisma/client/runtime/library").JsonValue | null;
    title: string;
    fileUrl: string | null;
}>;
export declare function fetchReportDetailsById(reportId: string, authenticatedUserId: string): Promise<{
    format: import(".prisma/client").$Enums.ReportFormat;
    id: string;
    userId: string;
    createdAt: Date;
    zoneId: string | null;
    type: import(".prisma/client").$Enums.ReportType;
    data: import("@prisma/client/runtime/library").JsonValue | null;
    title: string;
    fileUrl: string | null;
}>;
//# sourceMappingURL=reportGeneratorService.d.ts.map