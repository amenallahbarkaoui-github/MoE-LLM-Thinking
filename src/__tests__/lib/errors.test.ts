import {
  AppError,
  NetworkError,
  TimeoutError,
  ValidationError,
  ModelError,
  BudgetError,
  RateLimitError,
  AuthenticationError,
} from '@/lib/errors'

describe('Error taxonomy', () => {
  describe('AppError', () => {
    it('should create with required fields', () => {
      const err = new AppError('test error', { code: 'TEST', statusCode: 500 })
      expect(err.message).toBe('test error')
      expect(err.code).toBe('TEST')
      expect(err.statusCode).toBe(500)
      expect(err.isOperational).toBe(true)
      expect(err.context).toEqual({})
    })

    it('should support non-operational errors', () => {
      const err = new AppError('fatal', { code: 'FATAL', statusCode: 500, isOperational: false })
      expect(err.isOperational).toBe(false)
    })

    it('should include context', () => {
      const err = new AppError('ctx', { code: 'C', statusCode: 400, context: { key: 'val' } })
      expect(err.context).toEqual({ key: 'val' })
    })

    it('should serialize to JSON', () => {
      const err = new AppError('json', { code: 'J', statusCode: 500 })
      const json = err.toJSON()
      expect(json.name).toBe('AppError')
      expect(json.message).toBe('json')
      expect(json.code).toBe('J')
      expect(json.statusCode).toBe(500)
      expect(json.isOperational).toBe(true)
      expect(json).toHaveProperty('stack')
    })

    it('should be an instance of Error', () => {
      const err = new AppError('e', { code: 'E', statusCode: 500 })
      expect(err).toBeInstanceOf(Error)
      expect(err).toBeInstanceOf(AppError)
    })
  })

  describe('NetworkError', () => {
    it('should have correct defaults', () => {
      const err = new NetworkError()
      expect(err.message).toBe('Network request failed')
      expect(err.code).toBe('NETWORK_ERROR')
      expect(err.statusCode).toBe(502)
      expect(err.isOperational).toBe(true)
    })

    it('should accept custom message', () => {
      const err = new NetworkError('custom network error')
      expect(err.message).toBe('custom network error')
    })
  })

  describe('TimeoutError', () => {
    it('should have correct defaults', () => {
      const err = new TimeoutError()
      expect(err.message).toBe('Request timed out')
      expect(err.code).toBe('TIMEOUT_ERROR')
      expect(err.statusCode).toBe(504)
    })
  })

  describe('ValidationError', () => {
    it('should have correct defaults', () => {
      const err = new ValidationError()
      expect(err.message).toBe('Validation failed')
      expect(err.code).toBe('VALIDATION_ERROR')
      expect(err.statusCode).toBe(400)
    })
  })

  describe('ModelError', () => {
    it('should have correct defaults', () => {
      const err = new ModelError()
      expect(err.message).toBe('Model API request failed')
      expect(err.code).toBe('MODEL_ERROR')
      expect(err.statusCode).toBe(502)
    })
  })

  describe('BudgetError', () => {
    it('should have correct defaults', () => {
      const err = new BudgetError()
      expect(err.message).toBe('Token budget exceeded')
      expect(err.code).toBe('BUDGET_EXCEEDED')
      expect(err.statusCode).toBe(402)
    })
  })

  describe('RateLimitError', () => {
    it('should have correct defaults', () => {
      const err = new RateLimitError()
      expect(err.message).toBe('Rate limit exceeded')
      expect(err.code).toBe('RATE_LIMITED')
      expect(err.statusCode).toBe(429)
    })
  })

  describe('AuthenticationError', () => {
    it('should have correct defaults', () => {
      const err = new AuthenticationError()
      expect(err.message).toBe('Authentication failed')
      expect(err.code).toBe('AUTH_ERROR')
      expect(err.statusCode).toBe(401)
    })

    it('should accept context', () => {
      const err = new AuthenticationError('bad key', { provider: 'openai' })
      expect(err.message).toBe('bad key')
      expect(err.context).toEqual({ provider: 'openai' })
    })
  })
})
