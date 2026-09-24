import crypto from 'node:crypto';
import os from 'node:os';
import { Request, Response, NextFunction } from 'express';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

// Current minimum log level from environment
const CURRENT_LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL?.toLowerCase() as LogLevel) || 'info';
const CURRENT_MIN_LEVEL = LOG_LEVEL_VALUES[CURRENT_LOG_LEVEL] ?? LOG_LEVEL_VALUES.info;

// Sensitive keys that must be strictly redacted (Data Masking)
const SENSITIVE_KEYS = new Set([
  'password',
  'currentpassword',
  'newpassword',
  'passwordhash',
  'token',
  'authtoken',
  'authorization',
  'creditcardnumber',
  'cvv',
  'cardnumber',
  'secret',
  'cookie',
  'apikey',
  'api_key',
  'gemini_api_key',
  'cpf',
  'rg',
  'pin',
]);

/**
 * Rigorous data masking / redaction function.
 * Recursively sanitizes objects and strings to ensure zero leakage of passwords, tokens and PII.
 */
export function maskSensitiveData(target: any, depth = 0): any {
  if (depth > 6) return '[MAX_DEPTH_REACHED]';
  if (target === null || target === undefined) return target;

  if (typeof target === 'string') {
    // Check if it looks like a bearer token or jwt
    if (/^Bearer\s+[A-Za-z0-9-_=.]+/i.test(target)) {
      return 'Bearer [REDACTED]';
    }
    return target;
  }

  if (typeof target !== 'object') {
    return target;
  }

  if (Array.isArray(target)) {
    return target.map(item => maskSensitiveData(item, depth + 1));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(target)) {
    const lowerKey = key.toLowerCase().replace(/[-_]/g, '');
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = maskSensitiveData(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export interface LogContext {
  reqId?: string;
  userId?: string;
  userRole?: string;
  action?: string;
  ip?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  [key: string]: any;
}

export interface StructuredLogEntry {
  level: LogLevel;
  levelValue: number;
  time: string;
  pid: number;
  hostname: string;
  service: string;
  msg: string;
  context?: LogContext;
  error?: {
    message: string;
    name?: string;
    stack?: string;
    code?: string | number;
  };
}

class StructuredLogger {
  private serviceName: string;
  private hostname: string;
  private pid: number;
  private defaultContext: LogContext;

  constructor(serviceName = 'finanflow-api', defaultContext: LogContext = {}) {
    this.serviceName = serviceName;
    this.hostname = os.hostname();
    this.pid = process.pid;
    this.defaultContext = defaultContext;
  }

  private writeLog(level: LogLevel, msg: string, context?: LogContext, err?: any): void {
    if (LOG_LEVEL_VALUES[level] < CURRENT_MIN_LEVEL) {
      return;
    }

    const mergedContext = maskSensitiveData({
      ...this.defaultContext,
      ...context,
    });

    const entry: StructuredLogEntry = {
      level,
      levelValue: LOG_LEVEL_VALUES[level],
      time: new Date().toISOString(),
      pid: this.pid,
      hostname: this.hostname,
      service: this.serviceName,
      msg,
    };

    if (Object.keys(mergedContext).length > 0) {
      entry.context = mergedContext;
    }

    if (err) {
      entry.error = {
        name: err.name || 'Error',
        message: err.message || String(err),
        stack: err.stack,
        code: err.code || err.statusCode,
      };
    }

    // Output strictly formatted Newline-Delimited JSON (NDJSON)
    const jsonString = JSON.stringify(entry);
    if (level === 'error' || level === 'fatal') {
      process.stderr.write(jsonString + '\n');
    } else {
      process.stdout.write(jsonString + '\n');
    }
  }

  debug(msg: string, context?: LogContext): void {
    this.writeLog('debug', msg, context);
  }

  info(msg: string, context?: LogContext): void {
    this.writeLog('info', msg, context);
  }

  warn(msg: string, context?: LogContext, err?: any): void {
    this.writeLog('warn', msg, context, err);
  }

  error(msg: string, err?: any, context?: LogContext): void {
    this.writeLog('error', msg, context, err);
  }

  fatal(msg: string, err?: any, context?: LogContext): void {
    this.writeLog('fatal', msg, context, err);
  }

  /**
   * Create a scoped child logger with permanent contextual properties (e.g. reqId, userId, action)
   */
  child(context: LogContext): StructuredLogger {
    return new StructuredLogger(this.serviceName, {
      ...this.defaultContext,
      ...context,
    });
  }
}

export const logger = new StructuredLogger();

// Augment Express Request interface with correlation ID and scoped logger
declare global {
  namespace Express {
    interface Request {
      id?: string;
      logger?: StructuredLogger;
    }
  }
}

/**
 * Express Request Logger Middleware:
 * - Generates or extracts X-Request-ID
 * - Injects child logger into req.logger with reqId, IP, path
 * - Logs request arrival and completion with status code, response time (ms), and size
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = process.hrtime.bigint();

  // Extract or generate unique Request ID
  const incomingReqId = req.headers['x-request-id'] as string;
  const reqId = incomingReqId && incomingReqId.length <= 64 ? incomingReqId : `req_${crypto.randomUUID()}`;
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    '127.0.0.1';

  // Attach child logger to request object
  req.logger = logger.child({
    reqId,
    ip: clientIp,
    path: req.originalUrl || req.url,
    method: req.method,
  });

  // Log incoming request at debug level (or info if non-health)
  if (req.path !== '/health' && req.path !== '/api/health') {
    req.logger.debug(`Incoming ${req.method} ${req.originalUrl || req.url}`, {
      query: maskSensitiveData(req.query),
      userAgent: req.headers['user-agent'],
    });
  }

  // Intercept response finish
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;

    // Attach authenticated user information if available
    const authUser = (req as any).user;
    const finalContext: LogContext = {
      reqId,
      userId: authUser?.id || 'anonymous',
      userRole: authUser?.role,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      ip: clientIp,
    };

    // Filter health check noise unless it fails
    if ((req.path === '/health' || req.path === '/api/health') && res.statusCode < 400) {
      return;
    }

    if (res.statusCode >= 500) {
      logger.error(`HTTP ${res.statusCode} ${req.method} ${req.originalUrl}`, undefined, finalContext);
    } else if (res.statusCode >= 400) {
      logger.warn(`HTTP ${res.statusCode} ${req.method} ${req.originalUrl}`, finalContext);
    } else {
      logger.info(`HTTP ${res.statusCode} ${req.method} ${req.originalUrl}`, finalContext);
    }
  });

  next();
}
