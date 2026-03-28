const DEBUG = process.env.DEBUG?.includes('uemcp');

export interface LogContext {
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

function format(namespace: string, level: string, message: string, context?: LogContext): string {
  // For startup logs (lines, banners), don't add formatting
  if (message.match(/^[=-]{3,}$/) || message.includes('✓') || message.includes('✗')) {
    return message;
  }

  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] ${namespace} ${level}: ${message}${contextStr}`;
}

export function createLogger(namespace: string): Logger {
  return {
    debug(message: string, context?: LogContext): void {
      if (DEBUG) {
        console.error(format(namespace, 'DEBUG', message, context));
      }
    },
    info(message: string, context?: LogContext): void {
      console.error(format(namespace, 'INFO', message, context));
    },
    warn(message: string, context?: LogContext): void {
      console.error(format(namespace, 'WARN', message, context));
    },
    error(message: string, context?: LogContext): void {
      console.error(format(namespace, 'ERROR', message, context));
    },
  };
}

export const logger = createLogger('uemcp');