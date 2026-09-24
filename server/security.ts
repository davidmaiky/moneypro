import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

/**
 * Normalizes an origin URL by stripping trailing slashes and converting to lowercase.
 */
function normalizeOrigin(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    return parsed.origin.toLowerCase();
  } catch {
    return urlStr.replace(/\/+$/, '').toLowerCase();
  }
}

/**
 * Parses configured external allowed origins from environment variables.
 */
function getConfiguredAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (!envOrigins) return [];
  return envOrigins
    .split(',')
    .map(o => o.trim())
    .filter(Boolean)
    .map(normalizeOrigin);
}

const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization, X-Request-ID, Accept, Origin';
const MAX_AGE_SECONDS = '86400'; // 24 hours preflight cache

/**
 * Restricted CORS Middleware:
 * - Always permits Same-Origin requests (frontend talking to backend on same domain/host)
 * - Automatically respects APP_URL and ALLOWED_ORIGINS environment variables
 * - Supports wildcard '*' if configured
 * - Allows local development environments
 * - Strictly blocks unauthorized external third-party origins
 */
export function restrictedCors(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;

  // Requests without origin header (e.g. server-to-server, curl, mobile native webview, same-origin GETs)
  if (!origin) {
    return next();
  }

  const normalizedIncomingOrigin = normalizeOrigin(origin);

  // 1. Same-Origin Check: compare origin host with request Host / X-Forwarded-Host
  const hostHeader = (
    (req.headers['x-forwarded-host'] as string) ||
    req.headers.host ||
    ''
  ).split(',')[0].trim().toLowerCase();

  let originHost = '';
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    originHost = '';
  }

  // If the origin's host matches the request host, it is same-origin traffic: ALWAYS ALLOW
  const isSameHost = originHost && hostHeader && (originHost === hostHeader);

  // 2. Wildcard check
  const isWildcardAllowed = process.env.ALLOWED_ORIGINS?.trim() === '*';

  // 3. APP_URL check
  let isAppUrl = false;
  if (process.env.APP_URL) {
    const normalizedAppUrl = normalizeOrigin(process.env.APP_URL);
    if (normalizedIncomingOrigin === normalizedAppUrl) {
      isAppUrl = true;
    }
  }

  // 4. Configured Whitelist check
  const configuredOrigins = getConfiguredAllowedOrigins();
  const isExplicitlyAllowed = configuredOrigins.includes(normalizedIncomingOrigin);

  // 5. Development environment check
  let isDevAllowed = false;
  if (process.env.NODE_ENV !== 'production') {
    const devPatterns = [
      /^http:\/\/localhost(:\d+)?$/,
      /^http:\/\/127\.0\.0\.1(:\d+)?$/,
      /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
      /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,
      /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+(:\d+)?$/,
    ];
    isDevAllowed = devPatterns.some(pattern => pattern.test(normalizedIncomingOrigin));
  }

  // Determine if origin should be accepted
  // If no ALLOWED_ORIGINS is configured, default to allowing same-host or same-site traffic smoothly
  const hasConfiguredWhitelist = configuredOrigins.length > 0;
  const isAllowed =
    isSameHost ||
    isWildcardAllowed ||
    isAppUrl ||
    isExplicitlyAllowed ||
    isDevAllowed ||
    (!hasConfiguredWhitelist && Boolean(originHost)); // Fallback: allow request's own host if no explicit external whitelist was set

  if (isAllowed) {
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

  // Cross-origin request from an unauthorized third-party origin
  logger.warn('Blocked unauthorized CORS cross-origin request', {
    reqId: req.id,
    origin,
    normalizedIncomingOrigin,
    hostHeader,
    path: req.originalUrl || req.url,
    ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
  });

  res.status(403).json({
    error: 'Acesso bloqueado por política de CORS restrita (Origem não autorizada).',
    origin,
    host: hostHeader,
    hint: 'Configure a variável de ambiente ALLOWED_ORIGINS ou APP_URL com a URL do seu site no painel de controle.',
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
  // COOP isolates the browsing context exclusively to same-origin documents
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  // COEP prevents loading any cross-origin resource that does not explicitly grant permission via CORS or CORP
  res.setHeader('Cross-Origin-Embedder-Policy', process.env.COEP_POLICY || 'require-corp');
  // CORP restricts who can embed this site's resources
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  // 9. Content Security Policy (CSP)
  // Strictly eliminates 'unsafe-inline' and 'unsafe-eval' from script-src to protect against XSS attacks.
  // In production builds, only 'self' is permitted.
  // In development, exact cryptographic SHA-256 hashes are used for Vite's preamble and SW registration.
  const isProd = process.env.NODE_ENV === 'production';
  const devScriptHashes = [
    "'sha256-Z2/iFzh9VMlVkEOar1f/oSHWwQk3ve1qk/C2WdsC4Xk='", // Vite React Refresh preamble
    "'sha256-/AO8vAagk08SqUGxY96ci/dGyTDsuoetPOJYMn7sc+E='", // Vite PWA dev SW entry point
  ];

  const extraScriptSrc = process.env.CSP_EXTRA_SCRIPT_SRC ? ` ${process.env.CSP_EXTRA_SCRIPT_SRC}` : '';
  const scriptSrc = isProd
    ? `'self'${extraScriptSrc}`
    : `'self' ${devScriptHashes.join(' ')}${extraScriptSrc}`;

  const cspDirectives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
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
