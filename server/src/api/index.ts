import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import { postVerify } from './verify';
import { getStatus } from './status';
import { apiRateLimiter } from '../middleware/rateLimit';

/**
 * Create and configure Express app
 */
export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10kb' })); // Limit request body size
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Health check (no rate limiting)
  app.get('/api/status', getStatus);
  app.get('/.well-known/health', getStatus); // Alternative health check path

  // API routes with rate limiting
  app.post('/api/verify', apiRateLimiter, postVerify);

  // Serve static files from client build in production
  if (process.env.NODE_ENV === 'production') {
    // __dirname in built code is server/dist/api, so go up to root then into client/dist
    const clientBuildPath = path.join(__dirname, '../../../client/dist');
    app.use(express.static(clientBuildPath));
    
    // Serve index.html for all non-API routes (SPA routing)
    app.get('*', (req, res) => {
      // Don't serve index.html for API routes
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(clientBuildPath, 'index.html'));
      } else {
        res.status(404).json({
          ok: false,
          error: 'Not found',
        });
      }
    });
  } else {
    // 404 handler for development
    app.use((req, res) => {
      res.status(404).json({
        ok: false,
        error: 'Not found',
      });
    });
  }

  // Error handler
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      ok: false,
      error: 'Internal server error',
    });
  });

  return app;
}

