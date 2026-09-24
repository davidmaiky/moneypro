import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

/**
 * Parses allowed CORS origins from environment variables.
 * In development, allows localhost and LAN IPs by default.
 */
function getAllowedOrigins(): (string | RegExp)[] {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(',').map(o => o.trim()).filter(Boolean);
  }

  // If APP_URL is defined, use it as primary allowed origin
  if (process.env.APP_URL) {
    try {
      const parsed = new URL(process.env.APP_URL);
      return [parsed.origin];
    } catch {
      // Fallback
    }
  }

  // Default development / local origins
  if (process.env.NODE_ENV !== 'production') {
    return [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      /^http:\/\/192\.168\.\d+\.\d+:(3000|5173)$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:(3000|5173)$/,
    ];
  }

  return [];
}

const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization, X-Request-ID, Accept, Origin';
const MAX_AGE_SECONDS = '86400'; // 24 hours preflight cache

/**
 * Checks if a given origin matches allowed origin patterns
 */
function isOriginAllowed(origin: string, allowedList: (string | RegExp)[]): boolean {
  return allowedList.some(item => {
    if (typeof item === 'string') {
      return item === origin;
    }
    return item.test(origin);
  });
}

/**
 * Restricted CORS Middleware:
 * Rejects untrusted origins, restricts headers and methods, handles preflight requests cleanly.
 */
export function restrictedCors(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;

  // Requests without origin header (e.g. same-origin server-rendered, mobile webview, curl, health checks)
  if (!origin) {
    return next();
  }

  const allowedOrigins = getAllowedOrigins();
  const allowed = isOriginAllowed(origin, allowedOrigins);

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
    res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', MAX_AGE_SECONDS);
    res.setHeader('Vary', 'Origin');

    // Handle Preflight OPTIONS requests immediately
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    return next();
  }

  // Cross-origin request from an unauthorized origin
  logger.warn('Blocked unauthorized CORS cross-origin request', {
    reqId: req.id,
    origin,
    path: req.originalUrl || req.url,
    ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
  });

  res.status(403).json({
    error: 'Acesso bloqueado por política de CORS restrita (Origem não autorizada).',
    origin,
  });
}

/**
 * Production Security Headers Middleware:
 * Adheres to OWASP and CIS benchmarks (Content-Security-Policy, HSTS, Anti-Clickjacking, etc.)
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  // 1. Remove Express fingerprinting
  res.removeHeader('X-Powered-By');

  // 2. Prevent Clickjacking (disallow embedding inside iframes)
  res.setHeader('X-Frame-Options', 'DENY');

  // 3. Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 4. HTTP Strict Transport Security (HSTS) - enforce HTTPS for 1 year with subdomains
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // 5. Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 6. Disable legacy XSS auditor in modern browsers in favor of CSP
  res.setHeader('X-XSS-Protection', '0');

  // 7. Permissions Policy: restrict browser features not needed by the financial app
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=()'
  );

  // 8. Cross-Origin Isolation policies
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  // 9. Content Security Policy (CSP) tailored for Vite React PWA + Google Fonts + Lucide Icons
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Vite/React runtime & HMR
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' ws: wss: https:",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  res.setHeader('Content-Security-Policy', cspDirectives);

  next();
}
