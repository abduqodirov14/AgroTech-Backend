/**
 * @file       env.ts
 * @module     config
 * @description Typed environment configuration with fail-fast validation for required variables.
 */
interface FintechServiceEnv {
    PORT: number;
    DATABASE_URL: string;
    NODE_ENV: string;
}
declare const fintechEnv: FintechServiceEnv;
export default fintechEnv;
//# sourceMappingURL=env.d.ts.map