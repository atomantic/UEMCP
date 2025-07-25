const DEBUG = process.env.DEBUG?.includes('uemcp');

export interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private namespace: string;

  constructor(namespace: string) {
    this.namespace = namespace;
  }

  private format(level: string, message: string, context?: LogContext): string {
    // For startup logs (lines, banners), don't add formatting
    if (message.match(/^[=-]{3,}$/) || message.includes('✓') || message.includes('✗')) {
      return message;
    }
    
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${this.namespace} ${level}: ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (DEBUG) {
      console.error(this.format('DEBUG', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    console.error(this.format('INFO', message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.error(this.format('WARN', message, context));
  }

  error(message: string, context?: LogContext): void {
    console.error(this.format('ERROR', message, context));
  }
}

export const logger = new Logger('uemcp');