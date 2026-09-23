import express from 'express';
import path from 'path';
import fs from 'fs';
import { apiRouter } from './server/api';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use('/api', apiRouter);

// Serve frontend static build if dist exists
const distDir = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`FinanFlow API & Server running on http://localhost:${PORT}`);
});
