/**
 * @file       errors.ts
 * @module     utils
 * @description Domain error classes for structured HTTP error responses in the fintech service.
 */
export declare class DomainError extends Error {
    readonly statusCode: number;
    constructor(message: string, statusCode: number);
}
export declare class ResourceNotFoundError extends DomainError {
    constructor(message: string);
}
export declare class InvalidRequestError extends DomainError {
    constructor(message: string);
}
export declare class UnauthorizedAccessError extends DomainError {
    constructor(message: string);
}
//# sourceMappingURL=errors.d.ts.map