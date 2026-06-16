import express from 'express';
import cors from 'cors';
import logisticsRoutes from './routes/logisticsRoutes';
import driverPublicRoutes from './routes/driverPublicRoutes';
import { logger } from './utils/logger';
import { env } from './config/env';

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('request', { method: req.method, path: req.originalUrl, status: res.statusCode, durationMs: Date.now() - start });
  });
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'logistics-service', version: '2.0.0' });
});

// Telegram webhook endpoint
app.post('/webhook/telegram', async (req, res) => {
  try {
    const { handleDriverContact, handleDriverStart } = await import('./bot/handlers/driverContactHandler');
    const bot = require("node-telegram-bot-api").default || require("node-telegram-bot-api");
    const botInstance = new bot(env.TELEGRAM_LOGISTICS_BOT_TOKEN, { polling: false });
    
    if (req.body.message) {
      if (req.body.message.contact) {
        await handleDriverContact(botInstance as any, req.body.message as any);
      } else if (req.body.message.text === "/start") {
        await handleDriverStart(botInstance as any, req.body.message as any);
      }
    }
    
    res.json({ ok: true });
  } catch (e) {
    logger.error('Telegram webhook error', { error: e });
    res.status(500).json({ ok: false });
  }
});

// API routes
app.use('/api/v1/logistics', logisticsRoutes);

// Public driver page (no authentication required)
app.use('/driver-page', driverPublicRoutes);

// Admin driver verification web app
app.get('/admin/drivers', (_req, res) => {
  res.sendFile('admin-web/index.html', { root: __dirname + '/..' });
});

// Static public files
app.use(express.static('public'));
app.use(express.static('admin-web'));

export default app;
