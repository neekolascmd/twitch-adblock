/**
 * Enhanced logger with log levels and configurable verbosity.
 * Improvement: Added log levels (DEBUG, INFO, WARN, ERROR) with filtering,
 * timestamps, and structured output.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.SILENT]: 'SILENT',
};

let currentLevel: LogLevel = LogLevel.INFO;

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function getLogLevel(): LogLevel {
  return currentLevel;
}

function formatTimestamp(): string {
  return new Date().toISOString().substring(11, 23);
}

function formatMessage(level: LogLevel, ...args: unknown[]): string[] {
  const timestamp = formatTimestamp();
  const levelName = LOG_LEVEL_NAMES[level];
  return [`[twitch-adblock][${timestamp}][${levelName}]`, ...args.map(a =>
    typeof a === 'object' ? JSON.stringify(a) : String(a)
  )];
}

export const logger = {
  debug(...args: unknown[]): void {
    if (currentLevel <= LogLevel.DEBUG) {
      console.debug(...formatMessage(LogLevel.DEBUG, ...args));
    }
  },

  log(...args: unknown[]): void {
    if (currentLevel <= LogLevel.INFO) {
      console.log(...formatMessage(LogLevel.INFO, ...args));
    }
  },

  info(...args: unknown[]): void {
    if (currentLevel <= LogLevel.INFO) {
      console.info(...formatMessage(LogLevel.INFO, ...args));
    }
  },

  warn(...args: unknown[]): void {
    if (currentLevel <= LogLevel.WARN) {
      console.warn(...formatMessage(LogLevel.WARN, ...args));
    }
  },

  error(...args: unknown[]): void {
    if (currentLevel <= LogLevel.ERROR) {
      console.error(...formatMessage(LogLevel.ERROR, ...args));
    }
  },
};
