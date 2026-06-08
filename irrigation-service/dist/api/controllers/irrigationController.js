"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IrrigationController = void 0;
class IrrigationController {
    toggleIrrigationUseCase;
    constructor(toggleIrrigationUseCase) {
        this.toggleIrrigationUseCase = toggleIrrigationUseCase;
    }
    async toggle(req, res) {
        try {
            const { command, zone_id, duration_minutes } = req.body;
            if (!command || !['ON', 'OFF'].includes(command.toUpperCase())) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid command. Must be ON or OFF',
                });
                return;
            }
            const result = await this.toggleIrrigationUseCase.execute({
                command: command.toUpperCase(),
                zoneId: zone_id,
                durationMinutes: duration_minutes,
            });
            res.status(result.success ? 200 : 500).json(result);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message,
            });
        }
    }
    async zones(req, res) {
        try {
            const zones = await this.toggleIrrigationUseCase.getZones();
            res.status(200).json({ success: true, data: zones });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch zones',
                error: error.message,
            });
        }
    }
    async addZone(req, res) {
        try {
            const { name, area, soil_type, irrigation_type, device_id, crop_type, duration_minutes } = req.body;
            if (!name || !device_id) {
                res.status(400).json({
                    success: false,
                    message: 'Name and device_id are required',
                });
                return;
            }
            const zones = await this.toggleIrrigationUseCase.getZones();
            const exists = zones.some((z) => z.sensor_id === device_id);
            if (exists) {
                res.status(409).json({
                    success: false,
                    message: `Device ${device_id} is already assigned to another zone`,
                });
                return;
            }
            const newZone = {
                id: `ZONE-${String(zones.length + 1).padStart(2, '0')}`,
                name,
                area: area ?? '1.0 ha',
                soil_type: soil_type ?? 'Loam',
                irrigation_type: irrigation_type ?? 'Drip',
                sensor_id: device_id,
                crop_type: crop_type ?? 'Unknown',
                valve_state: 'OFF',
                last_irrigation: null,
                duration_minutes: duration_minutes ?? 30,
                moisture: Math.round(40 + Math.random() * 20),
                ph: Math.round((6.0 + Math.random() * 1.0) * 100) / 100,
                temperature: Math.round((22 + Math.random() * 4) * 10) / 10,
                next_irrigation: 'Not scheduled',
                planted_date: new Date().toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' }),
                root_depth: '0 - 30 cm',
            };
            const result = await this.toggleIrrigationUseCase.addZone(newZone);
            res.status(201).json({
                success: true,
                message: 'Zone added successfully',
                data: newZone,
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to add zone',
                error: error.message,
            });
        }
    }
    async schedules(_req, res) {
        try {
            const schedules = await this.toggleIrrigationUseCase.getSchedules();
            res.status(200).json({ success: true, data: schedules });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch schedules',
                error: error.message,
            });
        }
    }
    async createSchedule(req, res) {
        try {
            const { day, time, zoneId, duration } = req.body;
            const result = await this.toggleIrrigationUseCase.createSchedule({
                day,
                time,
                zoneId,
                duration,
                active: true,
            });
            res.status(result.success ? 201 : 500).json(result);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to create schedule',
                error: error.message,
            });
        }
    }
    async uploadSensorReadings(req, res) {
        try {
            const { device_mac, readings } = req.body;
            if (!device_mac || !Array.isArray(readings)) {
                res.status(400).json({ success: false, message: 'device_mac and readings array are required' });
                return;
            }
            const result = await this.toggleIrrigationUseCase.uploadSensorReadings(device_mac, readings);
            res.status(result.success ? 200 : 400).json(result);
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to upload sensor readings',
                error: error.message,
            });
        }
    }
}
exports.IrrigationController = IrrigationController;
