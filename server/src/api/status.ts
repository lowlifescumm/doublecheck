import { Request, Response } from 'express';

/**
 * Health check endpoint
 * GET /api/status
 */
export function getStatus(req: Request, res: Response): void {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}

