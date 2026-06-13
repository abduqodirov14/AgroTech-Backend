export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(msg = 'Not found') { super(404, msg); }
}

export class ValidationError extends AppError {
  constructor(msg = 'Validation failed') { super(400, msg); }
}
