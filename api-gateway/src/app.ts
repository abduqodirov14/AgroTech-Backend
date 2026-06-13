/**
 * @file       app.ts
 * @module     api-gateway
 * @description Single entry point that authenticates and proxies all inbound traffic to downstream microservices.
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { authMiddleware } from './middleware/auth';
import { logger } from './utils/logger';

const app = express();

app.use(helmet());
app.use(cors());
app.use(requestLogger);

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    version: '2.0.0',
    services: Object.keys(env.services),
  });
});

// Express mount strips the prefix — rewrite back to full service path
const proxyOptions = (target: string, apiPrefix: string) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path) => {
      const suffix = path.startsWith('/') ? path : `/${path}`;
      return `${apiPrefix}${suffix === '/' ? '' : suffix}`;
    },
    on: {
      proxyReq: (proxyReq, req) => {
        const requestId = req.headers['x-request-id'];
        if (requestId) proxyReq.setHeader('X-Request-Id', requestId as string);
        const user = (req as any).user;
        if (user?.userId) proxyReq.setHeader('X-User-Id', user.userId);
        if (user?.phone) proxyReq.setHeader('X-User-Phone', user.phone);
      },
      error: (err, _req, res) => {
        logger.error('proxy error', { error: err.message, target });
        if ('writeHead' in res && typeof res.writeHead === 'function') {
          (res as any).writeHead(502, { 'Content-Type': 'application/json' });
          (res as any).end(JSON.stringify({ success: false, error: 'Service unavailable' }));
        }
      },
    },
  });

// Protected auth routes that must come BEFORE the public auth proxy
app.use('/api/v1/auth/devices', proxyOptions(env.services.auth, '/api/v1/auth/devices'));

// Public auth routes (no JWT)
app.use('/api/v1/auth', proxyOptions(env.services.auth, '/api/v1/auth'));

// Protected routes
app.use(authMiddleware);

app.use('/api/v1/farm', proxyOptions(env.services.farm, '/api/v1/farm'));
app.use('/api/v1/weather', proxyOptions(env.services.weather, '/api/v1/weather'));
app.use('/api/v1/sensors', proxyOptions(env.services.sensor, '/api/v1/sensors'));
app.use('/api/v1/notifications', proxyOptions(env.services.sensor, '/api/v1/notifications'));
app.use('/api/v1/irrigation', proxyOptions(env.services.irrigation, '/api/v1/irrigation'));
app.use('/api/v1/finance', proxyOptions(env.services.fintech, '/api/v1/finance'));
app.use('/api/v1/credit', proxyOptions(env.services.fintech, '/api/v1/credit'));
app.use('/api/v1/marketplace', proxyOptions(env.services.marketplace, '/api/v1/marketplace'));
app.use('/api/v1/seed-demo', proxyOptions(env.services.marketplace, '/api/v1/seed-demo'));
app.use('/api/v1/logistics', proxyOptions(env.services.logistics, '/api/v1/logistics'));
app.use('/api/v1/analytics', proxyOptions(env.services.analytics, '/api/v1/analytics'));

// Socket.IO proxy (no path rewrite)
app.use('/socket.io', createProxyMiddleware({ target: env.services.sensor, changeOrigin: true, ws: true }));

export default app;
