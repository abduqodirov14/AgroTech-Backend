import { Router } from 'express';
import { IrrigationController } from '../controllers/irrigationController';
import { ToggleIrrigationUseCase } from '../../domain/usecases/ToggleIrrigationUseCase';
import { MqttPublisher } from '../../infrastructure/mqtt/MqttPublisher';

const router = Router();

const mqttPublisher = new MqttPublisher();
const toggleIrrigationUseCase = new ToggleIrrigationUseCase(mqttPublisher);
const irrigationController = new IrrigationController(toggleIrrigationUseCase);

router.post('/toggle', (req, res) => irrigationController.toggle(req, res));
router.get('/zones', (req, res) => irrigationController.zones(req, res));
router.get('/zones/:zone_id', (req, res) => irrigationController.zoneById(req, res));
router.post('/zones', (req, res) => irrigationController.addZone(req, res));
router.get('/schedules', (req, res) => irrigationController.schedules(req, res));
router.post('/schedules', (req, res) => irrigationController.createSchedule(req, res));
router.post('/sensors/upload', (req, res) => irrigationController.uploadSensorReadings(req, res));

export default router;
