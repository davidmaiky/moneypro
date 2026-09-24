import express from 'express';
import path from 'path';
import fs from 'fs';
import { apiRouter } from './server/api';
import { closeDatabase } from './server/db';
import { logger, requestLogger } from './server/logger';
import { securityHeaders, restrictedCors } from './server/security';

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Production Security Headers (CSP, HSTS, X-Frame-Options, etc.)
app.use(securityHeaders);

// 2. Restricted CORS Policy
app.use(restrictedCors);

// 3. Structured Request Logger with Request Correlation ID (X-Request-Id)
app.use(requestLogger);

// 4. Request Body Parsers
app.use(express.json({ limit: '50mb' }));

// Health check endpoint for Easypanel, Docker, Kubernetes or Load Balancers
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'finanflow',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    reqId: req.id,
  });
});

// Mount secure API router
app.use('/api', apiRouter);

// Serve frontend static build if dist exists
const distDir = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

const server = app.listen(Number(PORT), '0.0.0.0', () => {
  logger.info('FinanFlow HTTP Server started', {
    port: Number(PORT),
    env: process.env.NODE_ENV || 'development',
    dataDir: process.env.DATA_DIR || path.resolve(process.cwd(), 'data'),
    corsEnabled: true,
    securityHeadersEnabled: true,
  });
});

// Graceful shutdown handling for Docker / Easypanel deployments
const shutdown = (signal: string) => {
  logger.warn(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed.');
    closeDatabase();
    process.exit(0);
  });

  // Force shutdown after 10 seconds if hanging
  setTimeout(() => {
    logger.fatal('Forcefully terminating process after shutdown timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
