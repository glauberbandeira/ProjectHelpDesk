import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import cookieParser from 'cookie-parser';
import { authRoutes } from './routes/auth.routes.js';
import { ticketRoutes } from './routes/ticket.routes.js';

export function createApp() {
  const app = express();

  app.use(helmet());

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });
  app.use(limiter);

  app.use(express.json());
  app.use(cookieParser()); 
  
  app.use('/auth', authRoutes);   // ← adicione esta linha
  app.use('/tickets', ticketRoutes);
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}