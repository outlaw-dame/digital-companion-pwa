/**
 * Logging Utility
 * 
 * Centralized logging for the frontend application.
 * 
 * Goals:
 * - Centralize all frontend logging
 * - Prevent logging sensitive user content
 * - Make development logs easy to disable in production
 * - Preserve useful operational errors
 * 
 * Rules:
 * - No post bodies
 * - No message bodies
 * - No draft text
 * - No auth tokens
 * - No private attachment URLs
 * - No raw encrypted payloads
 * - No full platform fingerprint dumps
 * 
 * Usage:
 * import { logger } from '@/utils/logging';
 * logger.info('User logged in', { userId: '123' });
 * logger.error('Failed to load', { error: err, url: '/api/data' });
 */

// ========================================================================
// SENSITIVE PATTERNS
// ========================================================================

/**
 * Patterns that should be redacted from logs
 */
const SENSITIVE_PATTERNS = [
  // Auth tokens and keys
  /(password|token|secret|api[_-]?key|private[_-]?key|access[_-]?token|refresh[_-]?token|bearer)/i,
  /(auth|authorization|credential|session[_-]?id)/i,
  
  // User content
  /(message|body|content|text|draft|post|comment|reply)/i,
  
  // Attachments and media
  /(attachment|media|image|video|audio|file|url|link)/i,
  
  // Encrypted data
  /(encrypted|payload|data|cipher|signature)/i,
  
  // Platform fingerprints
  /(fingerprint|device[_-]?id|udid|imei|serial)/i,
  
  // Personal information
  /(email|phone|address|name|ssn|credit[_-]?card)/i,
];

/**
 * Fields that should always be redacted
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'privateKey',
  'accessToken',
  'refreshToken',
  'auth',
  'authorization',
  'credential',
  'sessionId',
  'body',
  'message',
  'content',
  'text',
  'draft',
  'post',
  'comment',
  'reply',
  'attachment',
  'media',
  'image',
  'video',
  'audio',
  'file',
  'url',
  'link',
  'encrypted',
  'payload',
  'data',
  'cipher',
  'signature',
  'fingerprint',
  'deviceId',
  'udid',
  'imei',
  'serial',
  'email',
  'phone',
  'address',
  'name',
  'ssn',
  'creditCard',
];

// ========================================================================
// ENVIRONMENT
// ========================================================================

/**
 * Check if we're in development mode
 */
export const isDev = import.meta.env.DEV;

/**
 * Check if we're in production mode
 */
export const isProd = import.meta.env.PROD;

/**
 * Check if logging is enabled
 * Can be controlled via VITE_LOGGING_ENABLED=true
 */
export const isLoggingEnabled = import.meta.env.VITE_LOGGING_ENABLED !== 'false';

/**
 * Check if debug logging is enabled
 * Can be controlled via VITE_LOGGING_DEBUG=true
 */
export const isDebugEnabled = import.meta.env.VITE_LOGGING_DEBUG === 'true';

// ========================================================================
// REDACTION
// ========================================================================

/**
 * Redact sensitive data from an object
 */
export function redactSensitiveData(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    // Check if string contains sensitive patterns
    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(obj)) {
        return '[REDACTED]';
      }
    }
    return obj;
  }

  if (typeof obj === 'object') {
    if (Array.isArray(obj)) {
      return obj.map(redactSensitiveData);
    }

    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Check if key is sensitive
      const lowerKey = key.toLowerCase();
      const isSensitiveKey = SENSITIVE_FIELDS.some(
        field => lowerKey.includes(field.toLowerCase())
      );

      // Check if key matches sensitive pattern
      const isSensitivePattern = SENSITIVE_PATTERNS.some(
        pattern => pattern.test(key)
      );

      if (isSensitiveKey || isSensitivePattern) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = redactSensitiveData(value);
      } else if (typeof value === 'string') {
        // Check if value contains sensitive patterns
        for (const pattern of SENSITIVE_PATTERNS) {
          if (pattern.test(value)) {
            redacted[key] = '[REDACTED]';
            break;
          }
        }
        redacted[key] = value;
      } else {
        redacted[key] = value;
      }
    }
    return redacted;
  }

  return obj;
}

/**
 * Sanitize error for logging
 */
export function sanitizeError(error: unknown): unknown {
  if (error === null || error === undefined) {
    return error;
  }

  if (error instanceof Error) {
    const sanitized: Partial<Error> & { message?: string; stack?: string } = {
      name: error.name,
    };

    // Sanitize message
    if (error.message) {
      let message = error.message;
      for (const pattern of SENSITIVE_PATTERNS) {
        message = message.replace(pattern, '[REDACTED]');
      }
      sanitized.message = message;
    }

    // Sanitize stack in dev only
    if (isDev && error.stack) {
      let stack = error.stack;
      for (const pattern of SENSITIVE_PATTERNS) {
        stack = stack.replace(pattern, '[REDACTED]');
      }
      sanitized.stack = stack;
    }

    // Copy other properties
    for (const key in error) {
      if (key !== 'name' && key !== 'message' && key !== 'stack') {
        sanitized[key as keyof Error] = redactSensitiveData(
          (error as Record<string, unknown>)[key]
        ) as any;
      }
    }

    return sanitized;
  }

  return redactSensitiveData(error);
}

// ========================================================================
// LOG LEVELS
// ========================================================================

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

// ========================================================================
// LOGGER
// ========================================================================

/**
 * Logger interface
 */
export interface Logger {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
  
  // Contextual loggers
  createContext: (context: string) => Logger;
}

/**
 * Create a logger with a specific context
 */
export function createLogger(context?: string): Logger {
  const prefix = context ? `[${context}]` : '[APP]';
  
  const log = (level: LogLevel, message: string, data?: unknown) => {
    // Skip if logging is disabled in production
    if (!isLoggingEnabled && isProd) {
      return;
    }

    // Skip debug in production unless explicitly enabled
    if (level === LogLevel.DEBUG && !isDebugEnabled && isProd) {
      return;
    }

    // Sanitize data
    const sanitizedData = data !== undefined ? redactSensitiveData(data) : undefined;
    
    // Build log message
    const timestamp = new Date().toISOString();
    const levelLabel = level.padEnd(5);
    const formattedMessage = sanitizedData 
      ? `${timestamp} ${levelLabel} ${prefix} ${message} ${JSON.stringify(sanitizedData)}`
      : `${timestamp} ${levelLabel} ${prefix} ${message}`;

    // Output to appropriate console method
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }
  };

  const debug = (message: string, data?: unknown) => {
    log(LogLevel.DEBUG, message, data);
  };

  const info = (message: string, data?: unknown) => {
    log(LogLevel.INFO, message, data);
  };

  const warn = (message: string, data?: unknown) => {
    log(LogLevel.WARN, message, data);
  };

  const error = (message: string, data?: unknown) => {
    log(LogLevel.ERROR, message, data);
  };

  const createContext = (subContext: string): Logger => {
    return createLogger(context ? `${context}:${subContext}` : subContext);
  };

  return {
    debug,
    info,
    warn,
    error,
    createContext,
  };
}

// ========================================================================
// EXPORTS
// ========================================================================

/**
 * Default logger instance
 */
export const logger = createLogger();

/**
 * Create a module-specific logger
 */
export function createModuleLogger(moduleName: string): Logger {
  return createLogger(moduleName);
}

// Named loggers for common modules
export const authLogger = createLogger('AUTH');
export const apiLogger = createLogger('API');
export const storeLogger = createLogger('STORE');
export const platformLogger = createLogger('PLATFORM');
export const uiLogger = createLogger('UI');
export const networkLogger = createLogger('NETWORK');

export default logger;
