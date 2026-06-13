"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateDevice = authenticateDevice;
const DeviceRepository_1 = require("../domain/repositories/DeviceRepository");
const DEVICE_TIMESTAMP_MAX_AGE_MS = 5 * 60 * 1000;
async function authenticateDevice(req, res, next) {
    const deviceMac = req.header('X-Device-MAC') || req.body?.device_mac;
    const secret = req.header('X-Secret') || req.body?.secret_key;
    const timestamp = req.header('X-Timestamp') || req.body?.timestamp;
    if (!deviceMac || !secret) {
        return res.status(401).json({ error: 'Missing device credentials' });
    }
    const now = Date.now();
    const ts = timestamp ? parseInt(timestamp, 10) : now;
    const hasTimestamp = typeof timestamp === 'string' && timestamp.length > 0;
    if (!Number.isFinite(ts) || (hasTimestamp && Math.abs(now - ts) > DEVICE_TIMESTAMP_MAX_AGE_MS)) {
        return res.status(401).json({ error: 'Stale or missing timestamp' });
    }
    const device = await (0, DeviceRepository_1.findDeviceByMac)(deviceMac);
    if (!device) {
        return res.status(401).json({ error: 'Unknown device' });
    }
    if (device.secretKey !== secret) {
        return res.status(401).json({ error: 'Invalid device secret' });
    }
    await (0, DeviceRepository_1.updateDeviceStatus)(device.id, 'ONLINE');
    req.app.set('deviceId', device.id);
    return next();
}
