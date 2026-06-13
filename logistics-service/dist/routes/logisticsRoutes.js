"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const shipmentService = __importStar(require("../services/shipmentService"));
const coldChainService = __importStar(require("../services/coldChainService"));
const seedService_1 = require("../services/seedService");
const errors_1 = require("../utils/errors");
const router = (0, express_1.Router)();
router.get('/overview', async (_req, res, next) => {
    try {
        const data = await shipmentService.getOverview();
        res.json({ success: true, data });
    }
    catch (e) {
        next(e);
    }
});
router.get('/shipments', async (req, res, next) => {
    try {
        const filter = req.query.filter;
        const data = await shipmentService.listShipments(filter);
        res.json({ success: true, data });
    }
    catch (e) {
        next(e);
    }
});
router.get('/track/:trackId', async (req, res, next) => {
    try {
        const data = await shipmentService.getShipmentByTrackId(req.params.trackId);
        res.json({ success: true, data });
    }
    catch (e) {
        next(e);
    }
});
router.post('/shipments', async (req, res, next) => {
    try {
        const data = await shipmentService.createShipment(req.body);
        res.status(201).json({ success: true, data });
    }
    catch (e) {
        next(e);
    }
});
router.post('/shipments/:trackId/assign', async (req, res, next) => {
    try {
        const data = await shipmentService.assignDriver(req.params.trackId, req.body.driverId);
        res.json({ success: true, data });
    }
    catch (e) {
        next(e);
    }
});
router.post('/shipments/:trackId/tracking', async (req, res, next) => {
    try {
        const { lat, lng, tempCelsius } = req.body;
        const data = await shipmentService.addTrackingPoint(req.params.trackId, lat, lng, tempCelsius);
        // Check for cold chain violation
        if (tempCelsius !== undefined) {
            const alert = await coldChainService.checkColdChainViolation(req.params.trackId, tempCelsius);
            if (alert) {
                return res.json({ success: true, data, coldChainAlert: alert });
            }
        }
        res.json({ success: true, data });
    }
    catch (e) {
        next(e);
    }
});
router.post('/shipments/:trackId/arrive', async (req, res, next) => {
    try {
        const { lat, lng } = req.body;
        await shipmentService.confirmArrival(req.params.trackId, lat, lng);
        res.json({ success: true });
    }
    catch (e) {
        next(e);
    }
});
router.post('/shipments/:trackId/complete', async (req, res, next) => {
    try {
        const data = await shipmentService.confirmDelivery(req.params.trackId);
        res.json({ success: true, data });
    }
    catch (e) {
        next(e);
    }
});
router.get('/vehicles', async (_req, res, next) => {
    try {
        const data = await shipmentService.listVehicles();
        res.json({ success: true, data });
    }
    catch (e) {
        next(e);
    }
});
router.get('/warehouses', async (_req, res, next) => {
    try {
        const data = await shipmentService.listWarehouses();
        res.json({ success: true, data });
    }
    catch (e) {
        next(e);
    }
});
router.get('/routes', async (_req, res, next) => {
    try {
        const data = await shipmentService.listTopRoutes();
        res.json({ success: true, data });
    }
    catch (e) {
        next(e);
    }
});
// ❄️ COLD CHAIN ALERTS ENDPOINTS
router.get('/cold-chain/alerts', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const alerts = await coldChainService.getColdChainAlerts(limit);
        res.json({ success: true, data: alerts });
    }
    catch (e) {
        next(e);
    }
});
router.post('/cold-chain/alerts/:trackId/resolve', async (req, res, next) => {
    try {
        const { notes } = req.body;
        const data = await coldChainService.resolveColdChainAlert(req.params.trackId, notes);
        res.json({ success: true, data, message: 'Cold chain alert resolved' });
    }
    catch (e) {
        next(e);
    }
});
router.post('/seed-demo', async (req, res, next) => {
    try {
        const result = await (0, seedService_1.seedDemoData)(req.query.force === 'true');
        res.json({ success: true, ...result });
    }
    catch (e) {
        next(e);
    }
});
router.use((err, _req, res, _next) => {
    if (err instanceof errors_1.AppError) {
        return res.status(err.statusCode).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: 'Internal server error' });
});
exports.default = router;
