import { createLogger } from './logger';

const log = createLogger('circuit-breaker');

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  halfOpenMaxAttempts?: number;
}

export interface CircuitBreakerStats {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  lastFailure: Date | null;
  state: CircuitState;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private totalRequests = 0;
  private lastFailure: Date | null = null;
  private nextRetryTime = 0;
  private halfOpenAttempts = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly halfOpenMaxAttempts: number;
  private readonly name: string;

  constructor(name: string, options: CircuitBreakerOptions = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeout = options.resetTimeout ?? 60_000;
    this.halfOpenMaxAttempts = options.halfOpenMaxAttempts ?? 3;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    if (this.state === 'OPEN') {
      if (Date.now() >= this.nextRetryTime) {
        this.transitionTo('HALF_OPEN');
      } else {
        throw new Error(
          `Circuit breaker "${this.name}" is OPEN. Requests are blocked until ${new Date(this.nextRetryTime).toISOString()}.`
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  getStats(): CircuitBreakerStats {
    return {
      totalRequests: this.totalRequests,
      successCount: this.successCount,
      failureCount: this.failureCount,
      lastFailure: this.lastFailure,
      state: this.state,
    };
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenAttempts = 0;
    log.info('Circuit breaker manually reset', { name: this.name });
  }

  private onSuccess(): void {
    this.successCount++;
    if (this.state === 'HALF_OPEN') {
      this.halfOpenAttempts++;
      log.info('Half-open test request succeeded', {
        name: this.name,
        attempt: this.halfOpenAttempts,
        max: this.halfOpenMaxAttempts,
      });
      if (this.halfOpenAttempts >= this.halfOpenMaxAttempts) {
        this.transitionTo('CLOSED');
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success in closed state
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailure = new Date();

    if (this.state === 'HALF_OPEN') {
      log.warn('Half-open test request failed, reopening circuit', { name: this.name });
      this.transitionTo('OPEN');
      return;
    }

    if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
      log.error('Failure threshold reached, opening circuit', {
        name: this.name,
        failureCount: this.failureCount,
        threshold: this.failureThreshold,
      });
      this.transitionTo('OPEN');
    }
  }

  private transitionTo(newState: CircuitState): void {
    const prev = this.state;
    this.state = newState;

    if (newState === 'OPEN') {
      this.nextRetryTime = Date.now() + this.resetTimeout;
      this.halfOpenAttempts = 0;
    } else if (newState === 'HALF_OPEN') {
      this.halfOpenAttempts = 0;
    } else if (newState === 'CLOSED') {
      this.failureCount = 0;
      this.halfOpenAttempts = 0;
    }

    log.info(`State transition: ${prev} -> ${newState}`, { name: this.name });
  }
}
