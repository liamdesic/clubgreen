/**
 * Enhanced logging utilities for agentic development workflow
 * Provides structured logging that can be easily parsed by AI tools
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogContext = 'auth' | 'database' | 'api' | 'ui' | 'store' | 'validation' | 'general';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: LogContext;
  message: string;
  data?: any;
  stackTrace?: string;
}

class DevLogger {
  private isDev = import.meta.env.DEV;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private createEntry(level: LogLevel, context: LogContext, message: string, data?: any): LogEntry {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      context,
      message,
      data
    };

    if (level === 'error') {
      entry.stackTrace = new Error().stack;
    }

    return entry;
  }

  private logToConsole(entry: LogEntry) {
    if (!this.isDev) return;

    const prefix = `[${entry.timestamp}] [${entry.context.toUpperCase()}]`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case 'debug':
        console.debug(message, entry.data || '');
        break;
      case 'info':
        console.info(message, entry.data || '');
        break;
      case 'warn':
        console.warn(message, entry.data || '');
        break;
      case 'error':
        console.error(message, entry.data || '', entry.stackTrace || '');
        break;
    }
  }

  private addToMemory(entry: LogEntry) {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }
  }

  private log(level: LogLevel, context: LogContext, message: string, data?: any) {
    const entry = this.createEntry(level, context, message, data);
    this.logToConsole(entry);
    this.addToMemory(entry);
  }

  // Public logging methods
  debug(context: LogContext, message: string, data?: any) {
    this.log('debug', context, message, data);
  }

  info(context: LogContext, message: string, data?: any) {
    this.log('info', context, message, data);
  }

  warn(context: LogContext, message: string, data?: any) {
    this.log('warn', context, message, data);
  }

  error(context: LogContext, message: string, data?: any) {
    this.log('error', context, message, data);
  }

  // Get recent logs for debugging
  getRecentLogs(count = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Get logs by context
  getLogsByContext(context: LogContext, count = 50): LogEntry[] {
    return this.logs
      .filter(log => log.context === context)
      .slice(-count);
  }

  // Get error logs
  getErrorLogs(count = 20): LogEntry[] {
    return this.logs
      .filter(log => log.level === 'error')
      .slice(-count);
  }

  // Export logs as JSON for analysis
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
    console.clear();
  }
}

// Global logger instance
export const devLogger = new DevLogger();

// Convenience functions for common contexts
export const authLogger = {
  debug: (message: string, data?: any) => devLogger.debug('auth', message, data),
  info: (message: string, data?: any) => devLogger.info('auth', message, data),
  warn: (message: string, data?: any) => devLogger.warn('auth', message, data),
  error: (message: string, data?: any) => devLogger.error('auth', message, data),
};

export const dbLogger = {
  debug: (message: string, data?: any) => devLogger.debug('database', message, data),
  info: (message: string, data?: any) => devLogger.info('database', message, data),
  warn: (message: string, data?: any) => devLogger.warn('database', message, data),
  error: (message: string, data?: any) => devLogger.error('database', message, data),
};

export const apiLogger = {
  debug: (message: string, data?: any) => devLogger.debug('api', message, data),
  info: (message: string, data?: any) => devLogger.info('api', message, data),
  warn: (message: string, data?: any) => devLogger.warn('api', message, data),
  error: (message: string, data?: any) => devLogger.error('api', message, data),
};

export const uiLogger = {
  debug: (message: string, data?: any) => devLogger.debug('ui', message, data),
  info: (message: string, data?: any) => devLogger.info('ui', message, data),
  warn: (message: string, data?: any) => devLogger.warn('ui', message, data),
  error: (message: string, data?: any) => devLogger.error('ui', message, data),
};

export const storeLogger = {
  debug: (message: string, data?: any) => devLogger.debug('store', message, data),
  info: (message: string, data?: any) => devLogger.info('store', message, data),
  warn: (message: string, data?: any) => devLogger.warn('store', message, data),
  error: (message: string, data?: any) => devLogger.error('store', message, data),
};

// Make logger available globally for debugging in browser console
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).devLogger = devLogger;
}