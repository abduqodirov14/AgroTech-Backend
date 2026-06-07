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

export default router;
