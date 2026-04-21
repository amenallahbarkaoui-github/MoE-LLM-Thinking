export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  metadata?: Record<string, unknown>;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

const isProduction = process.env.NODE_ENV === 'production';

function getMinLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL as LogLevel | undefined;
  if (envLevel && envLevel in LOG_LEVEL_PRIORITY) return envLevel;
  return isProduction ? 'info' : 'debug';
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[getMinLevel()];
}

function formatEntry(entry: LogEntry): string {
  if (isProduction) {
    return JSON.stringify(entry);
  }

  const levelTag = entry.level.toUpperCase().padEnd(5);
  const ts = entry.timestamp.split('T')[1]?.replace('Z', '') ?? entry.timestamp;
  const meta =
    entry.metadata && Object.keys(entry.metadata).length > 0
      ? ` ${JSON.stringify(entry.metadata)}`
      : '';
  return `[${ts}] ${levelTag} [${entry.context}] ${entry.message}${meta}`;
}

function emit(entry: LogEntry): void {
  const formatted = formatEntry(entry);
  switch (entry.level) {
    case 'debug':
      console.debug(formatted);
      break;
    case 'info':
      console.info(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'error':
    case 'fatal':
      console.error(formatted);
      break;
  }
}

export interface Logger {
  debug(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
  fatal(message: string, metadata?: Record<string, unknown>): void;
}

export function createLogger(context: string): Logger {
  function log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    if (!shouldLog(level)) return;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      ...(metadata !== undefined && { metadata }),
    };
    emit(entry);
  }

  return {
    debug: (message, metadata?) => log('debug', message, metadata),
    info: (message, metadata?) => log('info', message, metadata),
    warn: (message, metadata?) => log('warn', message, metadata),
    error: (message, metadata?) => log('error', message, metadata),
    fatal: (message, metadata?) => log('fatal', message, metadata),
  };
}
