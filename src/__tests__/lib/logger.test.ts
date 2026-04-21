import { createLogger } from '@/lib/logger'

describe('Logger', () => {
  beforeEach(() => {
    jest.spyOn(console, 'debug').mockImplementation()
    jest.spyOn(console, 'info').mockImplementation()
    jest.spyOn(console, 'warn').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
    // Set to development mode so all levels log
    process.env.LOG_LEVEL = 'debug'
  })

  afterEach(() => {
    jest.restoreAllMocks()
    delete process.env.LOG_LEVEL
  })

  it('should create a logger with all methods', () => {
    const log = createLogger('test-module')
    expect(log.debug).toBeDefined()
    expect(log.info).toBeDefined()
    expect(log.warn).toBeDefined()
    expect(log.error).toBeDefined()
    expect(log.fatal).toBeDefined()
  })

  it('should log debug messages', () => {
    const log = createLogger('test-module')
    log.debug('debug message')
    expect(console.debug).toHaveBeenCalled()
  })

  it('should log info messages', () => {
    const log = createLogger('test-module')
    log.info('info message')
    expect(console.info).toHaveBeenCalled()
  })

  it('should log warn messages', () => {
    const log = createLogger('test-module')
    log.warn('warn message')
    expect(console.warn).toHaveBeenCalled()
  })

  it('should log error messages', () => {
    const log = createLogger('test-module')
    log.error('error message')
    expect(console.error).toHaveBeenCalled()
  })

  it('should log fatal messages via console.error', () => {
    const log = createLogger('test-module')
    log.fatal('fatal message')
    expect(console.error).toHaveBeenCalled()
  })

  it('should include module name in output', () => {
    const log = createLogger('my-module')
    log.info('test message')
    const output = (console.info as jest.Mock).mock.calls[0][0] as string
    expect(output).toContain('my-module')
  })

  it('should include metadata in output', () => {
    const log = createLogger('meta-test')
    log.info('with meta', { key: 'value' })
    const output = (console.info as jest.Mock).mock.calls[0][0] as string
    expect(output).toContain('key')
    expect(output).toContain('value')
  })
})
