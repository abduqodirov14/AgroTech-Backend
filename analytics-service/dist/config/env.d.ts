/**
 * @file       env.ts
 * @module     Config
 * @description Typed environment configuration with fail-fast validation for required variables.
 */
interface AnalyticsServiceEnv {
    PORT: number;
    DATABASE_URL: string;
    NODE_ENV: string;
}
declare const analyticsEnv: AnalyticsServiceEnv;
export default analyticsEnv;
//# sourceMappingURL=env.d.ts.map