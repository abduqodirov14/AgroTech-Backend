"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const SensorRepository_1 = require("../../infrastructure/repositories/SensorRepository");
const authenticateDevice_1 = require("../../middleware/authenticateDevice");
const logger_1 = require("../../utils/logger");
const router = (0, express_1.Router)();
const sensorRepository = new SensorRepository_1.SensorRepository();
const readingSchema = zod_1.z.object({
    sensor_pin: zod_1.z.string().optional(),
    type: zod_1.z.enum([
        'soil_moisture',
        'soil_moisture_shallow',
        'soil_moisture_deep',
        'soil_temperature',
        'air_temperature',
        'ph',
        'ec',
        'npk',
        'battery',
    ]),
    value: zod_1.z.number(),
});
const uploadSchema = zod_1.z.object({
    device_mac: zod_1.z.string().min(1),
    secret_key: zod_1.z.string().min(1),
    readings: zod_1.z.array(readingSchema).min(1).max(64),
});
router.post('/upload', authenticateDevice_1.authenticateDevice, async (req, res) => {
    try {
        const deviceMac = String(req.body?.device_mac || req.header('X-Device-MAC') || 'unknown');
        const deviceId = req.app.get('deviceId');
        logger_1.logger.info(`[HTTP][REQUEST] deviceMac=${deviceMac} deviceId=${deviceId} readings=${Array.isArray(req.body?.readings) ? req.body.readings.length : 'unknown'}`);
        const parsed = uploadSchema.safeParse(req.body);
        if (!parsed.success) {
            logger_1.logger.warn(`[HTTP][ERROR] Validation failed deviceMac=${deviceMac} error=${parsed.error.issues[0]?.message || 'Validation failed'}`);
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: parsed.error.flatten(),
            });
        }
        const { readings } = parsed.data;
        const accepted = [];
        const rejected = [];
        for (const r of readings) {
            const data = { deviceId };
            switch (r.type) {
                case 'soil_moisture':
                case 'soil_moisture_shallow':
                case 'soil_moisture_deep':
                    data.moisture = r.value;
                    break;
                case 'soil_temperature':
                case 'air_temperature':
                    data.temperature = r.value;
                    break;
                case 'ph':
                    data.ph = r.value;
                    break;
                case 'ec':
                    data.ec = r.value;
                    break;
                case 'battery':
                    data.battery = r.value;
                    break;
                case 'npk':
                    data.npk = r.value;
                    break;
                default:
                    rejected.push(r);
                    continue;
            }
            try {
                const reading = await sensorRepository.create(data);
                accepted.push(reading);
            }
            catch (err) {
                logger_1.logger.error(`[HTTP][ERROR] DB write failed deviceId=${deviceId} error=${err.message}`);
                rejected.push({ reading: r, error: 'database_error' });
            }
        }
        logger_1.logger.info(`[HTTP][SUCCESS] deviceId=${deviceId} accepted=${accepted.length} rejected=${rejected.length}`);
        const io = req.app.get('io');
        if (io && accepted.length > 0) {
            io.to(`device:${deviceId}`).emit('sensor:update', {
                deviceId,
                readings: accepted,
                count: accepted.length,
            });
        }
        return res.status(201).json({
            success: true,
            batch_id: `batch_${Date.now()}_${deviceId}`,
            accepted: accepted.length,
            rejected: rejected.length,
        });
    }
    catch (error) {
        logger_1.logger.error(`[HTTP][ERROR] Upload failed: ${error.message}`);
        return res.status(500).json({ success: false, error: 'Upload failed', message: error.message });
    }
});
router.get('/latest/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params;
        const reading = await sensorRepository.findLatestByDevice(deviceId);
        if (!reading) {
            return res.status(404).json({ success: false, error: 'No readings found' });
        }
        return res.json({
            success: true,
            data: reading,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/readings/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params;
        const limit = Math.min(parseInt(req.query.limit) || 50, 500);
        const readings = await sensorRepository.findRecentByDevice(deviceId, limit);
        return res.json({
            success: true,
            data: readings,
            count: readings.length,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/readings/latest', async (req, res) => {
    try {
        const deviceId = req.query.deviceId;
        if (!deviceId) {
            return res.status(400).json({ success: false, error: 'deviceId query param is required' });
        }
        const limit = Math.min(parseInt(req.query.limit) || 1, 500);
        const readings = await sensorRepository.findRecentByDevice(deviceId, limit);
        return res.json({
            success: true,
            data: readings.length === 1 ? readings[0] : readings,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
