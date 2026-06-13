"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @file       app.ts
 * @module     api-gateway
 * @description Single entry point that authenticates and proxies all inbound traffic to downstream microservices.
 */
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const http_proxy_middleware_1 = require("http-proxy-middleware");
const env_1 = require("./config/env");
const requestLogger_1 = require("./middleware/requestLogger");
const auth_1 = require("./middleware/auth");
const logger_1 = require("./utils/logger");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(requestLogger_1.requestLogger);
app.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        service: 'api-gateway',
        version: '2.0.0',
        services: Object.keys(env_1.env.services),
    });
});
// Express mount strips the prefix — rewrite back to full service path
const proxyOptions = (target, apiPrefix) => (0, http_proxy_middleware_1.createProxyMiddleware)({
    target,
    changeOrigin: true,
    pathRewrite: (path) => {
        const suffix = path.startsWith('/') ? path : `/${path}`;
        return `${apiPrefix}${suffix === '/' ? '' : suffix}`;
    },
    on: {
        proxyReq: (proxyReq, req) => {
            const requestId = req.headers['x-request-id'];
            if (requestId)
                proxyReq.setHeader('X-Request-Id', requestId);
            const user = req.user;
            if (user?.userId)
                proxyReq.setHeader('X-User-Id', user.userId);
            if (user?.phone)
                proxyReq.setHeader('X-User-Phone', user.phone);
        },
        error: (err, _req, res) => {
            logger_1.logger.error('proxy error', { error: err.message, target });
            if ('writeHead' in res && typeof res.writeHead === 'function') {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Service unavailable' }));
            }
        },
    },
});
// Protected auth routes that must come BEFORE the public auth proxy
app.use('/api/v1/auth/devices', proxyOptions(env_1.env.services.auth, '/api/v1/auth/devices'));
// Public auth routes (no JWT)
app.use('/api/v1/auth', proxyOptions(env_1.env.services.auth, '/api/v1/auth'));
// Protected routes
app.use(auth_1.authMiddleware);
app.use('/api/v1/farm', proxyOptions(env_1.env.services.farm, '/api/v1/farm'));
app.use('/api/v1/weather', proxyOptions(env_1.env.services.weather, '/api/v1/weather'));
app.use('/api/v1/sensors', proxyOptions(env_1.env.services.sensor, '/api/v1/sensors'));
app.use('/api/v1/notifications', proxyOptions(env_1.env.services.sensor, '/api/v1/notifications'));
app.use('/api/v1/irrigation', proxyOptions(env_1.env.services.irrigation, '/api/v1/irrigation'));
app.use('/api/v1/finance', proxyOptions(env_1.env.services.fintech, '/api/v1/finance'));
app.use('/api/v1/credit', proxyOptions(env_1.env.services.fintech, '/api/v1/credit'));
app.use('/api/v1/marketplace', proxyOptions(env_1.env.services.marketplace, '/api/v1/marketplace'));
app.use('/api/v1/seed-demo', proxyOptions(env_1.env.services.marketplace, '/api/v1/seed-demo'));
app.use('/api/v1/logistics', proxyOptions(env_1.env.services.logistics, '/api/v1/logistics'));
app.use('/api/v1/analytics', proxyOptions(env_1.env.services.analytics, '/api/v1/analytics'));
// Socket.IO proxy (no path rewrite)
app.use('/socket.io', (0, http_proxy_middleware_1.createProxyMiddleware)({ target: env_1.env.services.sensor, changeOrigin: true, ws: true }));
exports.default = app;
