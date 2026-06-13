/**
 * @file       errors.ts
 * @module     FarmService/Utils
 * @description Domain error classes for structured error handling with HTTP status codes.
 */

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ResourceNotFoundError extends DomainError {
  constructor(message: string) {
    super(message, 404);
  }
}

export class InvalidRequestError extends DomainError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedAccessError extends DomainError {
  constructor(message: string) {
    super(message, 401);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, 409);
  }
}
