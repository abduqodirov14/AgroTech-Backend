"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.NotFoundError = exports.AppError = void 0;
class AppError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}
exports.AppError = AppError;
class NotFoundError extends AppError {
    constructor(msg = 'Not found') { super(404, msg); }
}
exports.NotFoundError = NotFoundError;
class ValidationError extends AppError {
    constructor(msg = 'Validation failed') { super(400, msg); }
}
exports.ValidationError = ValidationError;
