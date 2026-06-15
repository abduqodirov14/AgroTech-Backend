/**
 * @file       gatewayRouter.ts
 * @path       api-gateway/src/routes/gatewayRouter.ts
 * @description Central API Gateway routing all services
 */

import { Router, Request, Response } from 'express';
import axios, { AxiosError } from 'axios';
import logisticsRoutes from './logisticsRoutes';

const router = Router();

// Service URLs
const SERVICES = {
  AUTH: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  FINTECH: process.env.FINTECH_SERVICE_URL || 'http://localhost:3006',
  LOGISTICS: process.env.LOGISTICS_SERVICE_URL || 'http://localhost:3008',
  MARKETPLACE: process.env.MARKETPLACE_SERVICE_URL || 'http://localhost:3009',
  AI: process.env.AI_SERVICE_URL || 'http://localhost:3010',
  IOT: process.env.IOT_SERVICE_URL || 'http://localhost:3011',
};

const SERVICE_KEY = process.env.SERVICE_API_KEY || 'service-key-gateway';

/**
 * Proxy request to upstream service
 */
async function proxyRequest(
  req: Request,
  res: Response,
  serviceUrl: string,
  path: string
) {
  try {
    const method = req.method.toLowerCase();
    const data = ['post', 'put', 'patch'].includes(method) ? req.body : undefined;

    const response = await axios({
      method: req.method,
      url: `${serviceUrl}${path}`,
      data,
      params: req.query,
      headers: {
        'X-API-Key': SERVICE_KEY,
        'X-Forwarded-For': req.ip,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    res.status(response.status).json(response.data);
  } catch (error: any) {
    const statusCode = error.response?.status || 502;
    const message = error.response?.data?.error || error.message;

    console.error(`Gateway error [${statusCode}]`, {
      path,
      error: message,
    });

    res.status(statusCode).json({
      success: false,
      error: message,
      service: path.split('/')[2],
    });
  }
}

// ============================================
// 🔐 AUTH SERVICE (3001)
// ============================================
router.post('/api/v1/auth/login', (req, res) =>
  proxyRequest(req, res, SERVICES.AUTH, '/api/v1/auth/login')
);
router.post('/api/v1/auth/register', (req, res) =>
  proxyRequest(req, res, SERVICES.AUTH, '/api/v1/auth/register')
);
router.get('/api/v1/auth/me', (req, res) =>
  proxyRequest(req, res, SERVICES.AUTH, '/api/v1/auth/me')
);

router.use('/api/v1/logistics', logisticsRoutes);
router.get('/api/v1/credit/products', (req, res) =>
  proxyRequest(req, res, SERVICES.FINTECH, '/api/v1/credit/products')
);
router.post('/api/v1/credit/apply', (req, res) =>
  proxyRequest(req, res, SERVICES.FINTECH, '/api/v1/credit/apply')
);
router.get('/api/v1/credit/applications', (req, res) =>
  proxyRequest(req, res, SERVICES.FINTECH, '/api/v1/credit/applications')
);

router.get('/api/v1/logistics/overview', (req, res) =>
  proxyRequest(req, res, SERVICES.LOGISTICS, '/api/v1/logistics/overview')
);
router.get('/api/v1/logistics/shipments', (req, res) =>
  proxyRequest(req, res, SERVICES.LOGISTICS, '/api/v1/logistics/shipments')
);
router.get('/api/v1/logistics/shipments/:shipmentId', (req, res) =>
  proxyRequest(req, res, SERVICES.LOGISTICS, `/api/v1/logistics/shipments/${req.params.shipmentId}`)
);
router.get('/api/v1/logistics/shipments/active/:farmerId', (req, res) =>
  proxyRequest(req, res, SERVICES.LOGISTICS, `/api/v1/logistics/shipments/active/${req.params.farmerId}`)
);
router.post('/api/v1/logistics/shipments/create', (req, res) =>
  proxyRequest(req, res, SERVICES.LOGISTICS, '/api/v1/logistics/shipments/create')
);
router.post('/api/v1/logistics/shipments/:shipmentId/complete', (req, res) =>
  proxyRequest(req, res, SERVICES.LOGISTICS, `/api/v1/logistics/shipments/${req.params.shipmentId}/complete`)
);

// Cold Chain Alerts
router.get('/api/v1/logistics/cold-chain/alerts', (req, res) =>
  proxyRequest(req, res, SERVICES.LOGISTICS, '/api/v1/logistics/cold-chain/alerts')
);
router.post('/api/v1/logistics/cold-chain/resolve', (req, res) =>
  proxyRequest(req, res, SERVICES.LOGISTICS, '/api/v1/logistics/cold-chain/resolve')
);

// Waybill & 3PL
router.get('/api/v1/logistics/waybill/:shipmentId', (req, res) =>
  proxyRequest(req, res, SERVICES.LOGISTICS, `/api/v1/logistics/waybill/${req.params.shipmentId}`)
);
router.get('/api/v1/logistics/3pl/offers/:shipmentId', (req, res) =>
  proxyRequest(req, res, SERVICES.LOGISTICS, `/api/v1/logistics/3pl/offers/${req.params.shipmentId}`)
);
router.post('/api/v1/logistics/3pl/select', (req, res) =>
  proxyRequest(req, res, SERVICES.LOGISTICS, '/api/v1/logistics/3pl/select')
);

// 🚚 Additional logistics resources
router.get('/api/v1/logistics/vehicles', (req, res) =>
  proxyRequest(req, res, SERVICES.LOGISTICS, '/api/v1/logistics/vehicles')
);
router.get('/api/v1/logistics/routes', (req, res) =>
  proxyRequest(req, res, SERVICES.LOGISTICS, '/api/v1/logistics/routes')
);
router.get('/api/v1/logistics/drivers/nearest', (req, res) =>
  proxyRequest(req, res, SERVICES.LOGISTICS, '/api/v1/logistics/drivers/nearest')
);

// Analytics & Reports
router.get('/api/v1/logistics/analytics/:farmerId', (req, res) =>
  proxyRequest(req, res, SERVICES.LOGISTICS, `/api/v1/logistics/analytics/${req.params.farmerId}`)
);
router.get('/api/v1/logistics/reports/monthly', (req, res) =>
  proxyRequest(req, res, SERVICES.LOGISTICS, '/api/v1/logistics/reports/monthly')
);
router.post('/api/v1/logistics/reports/sync-finance/:farmerId', (req, res) =>
  proxyRequest(req, res, SERVICES.LOGISTICS, `/api/v1/logistics/reports/sync-finance/${req.params.farmerId}`)
);

// ============================================
// 🛍️ MARKETPLACE SERVICE (3009) - PRODUCTS & ORDERS
// ============================================
router.get('/api/v1/marketplace/products', (req, res) =>
  proxyRequest(req, res, SERVICES.MARKETPLACE, '/api/v1/marketplace/products')
);
router.post('/api/v1/marketplace/products', (req, res) =>
  proxyRequest(req, res, SERVICES.MARKETPLACE, '/api/v1/marketplace/products')
);
router.post('/api/v1/marketplace/orders', (req, res) =>
  proxyRequest(req, res, SERVICES.MARKETPLACE, '/api/v1/marketplace/orders')
);
router.get('/api/v1/marketplace/orders/:farmerId', (req, res) =>
  proxyRequest(req, res, SERVICES.MARKETPLACE, `/api/v1/marketplace/orders/${req.params.farmerId}`)
);
router.post('/api/v1/marketplace/orders/:orderId/confirm', (req, res) =>
  proxyRequest(req, res, SERVICES.MARKETPLACE, `/api/v1/marketplace/orders/${req.params.orderId}/confirm`)
);

// ============================================
// 🤖 AI SERVICE (3010) - PREDICTIONS & OPTIMIZATION
// ============================================
router.post('/api/v1/ai/predict-crop-quality', (req, res) =>
  proxyRequest(req, res, SERVICES.AI, '/api/v1/ai/predict-crop-quality')
);
router.post('/api/v1/ai/recommend-crop', (req, res) =>
  proxyRequest(req, res, SERVICES.AI, '/api/v1/ai/recommend-crop')
);
router.post('/api/v1/ai/optimize-irrigation', (req, res) =>
  proxyRequest(req, res, SERVICES.AI, '/api/v1/ai/optimize-irrigation')
);

// ============================================
// 📡 IOT SERVICE (3011) - SENSOR DATA
// ============================================
router.get('/api/v1/iot/sensors/:fieldId', (req, res) =>
  proxyRequest(req, res, SERVICES.IOT, `/api/v1/iot/sensors/${req.params.fieldId}`)
);
router.post('/api/v1/iot/data/submit', (req, res) =>
  proxyRequest(req, res, SERVICES.IOT, '/api/v1/iot/data/submit')
);
router.get('/api/v1/iot/alerts', (req, res) =>
  proxyRequest(req, res, SERVICES.IOT, '/api/v1/iot/alerts')
);

// ============================================
// 📊 DASHBOARD / OVERVIEW
// ============================================
router.get('/api/v1/dashboard/overview/:farmerId', async (req, res) => {
  try {
    const { farmerId } = req.params;

    // Parallel requests to all services
    const [credit, logistics, marketplace, iot] = await Promise.allSettled([
      axios.get(`${SERVICES.FINTECH}/api/v1/credit/score/${farmerId}`, {
        headers: { 'X-API-Key': SERVICE_KEY },
      }),
      axios.get(`${SERVICES.LOGISTICS}/api/v1/logistics/analytics/${farmerId}`, {
        headers: { 'X-API-Key': SERVICE_KEY },
      }),
      axios.get(`${SERVICES.MARKETPLACE}/api/v1/marketplace/orders/${farmerId}`, {
        headers: { 'X-API-Key': SERVICE_KEY },
      }),
      axios.get(`${SERVICES.IOT}/api/v1/iot/sensors/${farmerId}`, {
        headers: { 'X-API-Key': SERVICE_KEY },
      }),
    ]);

    const overview = {
      credit:
        credit.status === 'fulfilled'
          ? credit.value.data
          : { error: 'Failed to fetch credit info' },
      logistics:
        logistics.status === 'fulfilled'
          ? logistics.value.data
          : { error: 'Failed to fetch logistics' },
      marketplace:
        marketplace.status === 'fulfilled'
          ? marketplace.value.data
          : { error: 'Failed to fetch orders' },
      sensors:
        iot.status === 'fulfilled'
          ? iot.value.data
          : { error: 'Failed to fetch sensor data' },
    };

    res.json({ success: true, data: overview });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Dashboard overview failed' });
  }
});

// ============================================
// 🏥 HEALTH CHECK
// ============================================
router.get('/health', async (req, res) => {
  const health: any = {
    gateway: 'healthy',
    timestamp: new Date().toISOString(),
    services: {},
  };

  for (const [name, url] of Object.entries(SERVICES)) {
    try {
      await axios.get(`${url}/health`, { timeout: 2000 });
      health.services[name] = 'healthy';
    } catch {
      health.services[name] = 'unhealthy';
    }
  }

  res.json(health);
});

export default router;
