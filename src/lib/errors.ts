export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context: Record<string, unknown>;

  constructor(
    message: string,
    options: {
      code: string;
      statusCode: number;
      isOperational?: boolean;
      context?: Record<string, unknown>;
    }
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.isOperational = options.isOperational ?? true;
    this.context = options.context ?? {};
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      context: this.context,
      stack: this.stack,
    };
  }
}

export class NetworkError extends AppError {
  constructor(message = 'Network request failed', context: Record<string, unknown> = {}) {
    super(message, { code: 'NETWORK_ERROR', statusCode: 502, context });
  }
}

export class TimeoutError extends AppError {
  constructor(message = 'Request timed out', context: Record<string, unknown> = {}) {
    super(message, { code: 'TIMEOUT_ERROR', statusCode: 504, context });
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', context: Record<string, unknown> = {}) {
    super(message, { code: 'VALIDATION_ERROR', statusCode: 400, context });
  }
}

export class ModelError extends AppError {
  constructor(message = 'Model API request failed', context: Record<string, unknown> = {}) {
    super(message, { code: 'MODEL_ERROR', statusCode: 502, context });
  }
}

export class BudgetError extends AppError {
  constructor(message = 'Token budget exceeded', context: Record<string, unknown> = {}) {
    super(message, { code: 'BUDGET_EXCEEDED', statusCode: 402, context });
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', context: Record<string, unknown> = {}) {
    super(message, { code: 'RATE_LIMITED', statusCode: 429, context });
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed', context: Record<string, unknown> = {}) {
    super(message, { code: 'AUTH_ERROR', statusCode: 401, context });
  }
}
