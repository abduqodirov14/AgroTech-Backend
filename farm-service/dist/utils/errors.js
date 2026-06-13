"use strict";
/**
 * @file       errors.ts
 * @module     FarmService/Utils
 * @description Domain error classes for structured error handling with HTTP status codes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = exports.UnauthorizedAccessError = exports.InvalidRequestError = exports.ResourceNotFoundError = exports.DomainError = void 0;
class DomainError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
    }
}
exports.DomainError = DomainError;
class ResourceNotFoundError extends DomainError {
    constructor(message) {
        super(message, 404);
    }
}
exports.ResourceNotFoundError = ResourceNotFoundError;
class InvalidRequestError extends DomainError {
    constructor(message) {
        super(message, 400);
    }
}
exports.InvalidRequestError = InvalidRequestError;
class UnauthorizedAccessError extends DomainError {
    constructor(message) {
        super(message, 401);
    }
}
exports.UnauthorizedAccessError = UnauthorizedAccessError;
class ConflictError extends DomainError {
    constructor(message) {
        super(message, 409);
    }
}
exports.ConflictError = ConflictError;
//# sourceMappingURL=errors.js.map