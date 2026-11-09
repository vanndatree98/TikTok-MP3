import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';

// Automatically ensure Windows tool directories (e.g. WinGet packages, FFmpeg, ImageMagick) are in PATH
if (process.platform === 'win32') {
  const localAppData = process.env.LOCALAPPDATA || '';
  const candidateDirs = [
    path.join(localAppData, 'Microsoft', 'WinGet', 'Links'),
    path.join(localAppData, 'Microsoft', 'WinGet', 'Packages', 'Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe', 'ffmpeg-9.0.2-full_build', 'bin'),
    'C:\\ffmpeg\\bin',
    'C:\\Program Files\\ffmpeg\\bin'
  ];
  for (const dir of candidateDirs) {
    if (fs.existsSync(dir) && !process.env.PATH?.includes(dir)) {
      process.env.PATH = `${dir};${process.env.PATH}`;
    }
  }
}

import { handleApiRequest } from './server/downloader.ts';
import { handleAiThumbnail } from './server/aiThumbnail.ts';
import { handleTranslateRequest } from './server/translation.ts';

const PORT = 3000;

async function startServer() {
  const app = express();

  // 1. Health check routes for Cloud Run container probes
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // AI Branded Thumbnail generation & visual watermark assistant
  app.post('/api/ai/branded-thumbnail', express.json({ limit: '10mb' }), (req, res) => {
    handleAiThumbnail(req, res);
  });

  // Multilingual Drama Title Translation (Khmer, English, Chinese, Thai, Korean, Filipino)
  app.post('/api/translate', express.json({ limit: '1mb' }), (req, res) => {
    handleTranslateRequest(req, res);
  });

  // 2. Downloader API routes
  app.use(async (req, res, next) => {
    if (req.url && req.url.startsWith('/api/')) {
      try {
        const handled = await handleApiRequest(req, res);
        if (handled) return;
      } catch (err) {
        next(err);
        return;
      }
    }
    next();
  });

  // 3. Fallback for unhandled /api/* endpoints
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // 4. Vite middleware for development vs static asset serving for production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(503).send('Application is starting, please retry shortly.');
      }
    });
  }

  // 5. Global error handling middleware
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Server error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || 'Internal server error' });
    }
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });

  // Optimize socket timeouts for streaming large files (50MB+) without premature disconnects
  server.timeout = 0; // Disable automatic socket timeout during large file streams
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;

  // Graceful shutdown handling for Cloud Run zero-downtime rollouts
  const gracefulShutdown = (signal: string) => {
    console.log(`Received ${signal}, closing server gracefully...`);
    server.close(() => {
      console.log('Server closed successfully.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('Forced shutdown timeout exceeded.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

// Global unhandled error guards so network resets don't crash the container
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
