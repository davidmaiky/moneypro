import express from 'express';
import path from 'path';
import fs from 'fs';
import { apiRouter } from './server/api';
import { closeDatabase } from './server/db';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));

// Health check endpoint for Easypanel, Docker, Kubernetes or Load Balancers
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'finanflow',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

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
  console.log(`FinanFlow API & Server running on http://0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Data Directory: ${process.env.DATA_DIR || path.resolve(process.cwd(), 'data')}`);
});

// Graceful shutdown handling for Docker / Easypanel deployments
const shutdown = (signal: string) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    closeDatabase();
    process.exit(0);
  });

  // Force shutdown after 10 seconds if hanging
  setTimeout(() => {
    console.error('Forcefully terminating process after timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

