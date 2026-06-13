/**
 * @file       farmRoutes.ts
 * @module     FarmService/Routes
 * @description Defines Express routes for managing agricultural zones and IoT device registry.
 */

import { Router } from 'express';
import * as farmController from '../controllers/farmController';

const farmRouter = Router();

farmRouter.get('/status', farmController.getFarmStatus);

farmRouter.get('/zones', farmController.getAllZones);
farmRouter.post('/zones', farmController.createZone);
farmRouter.get('/zones/:id', farmController.getZoneById);
farmRouter.patch('/zones/:id', farmController.updateZone);
farmRouter.delete('/zones/:id', farmController.deleteZone);

farmRouter.get('/devices', farmController.getAllDevices);
farmRouter.post('/devices', farmController.registerDevice);
farmRouter.get('/devices/:id', farmController.getDeviceById);
farmRouter.patch('/devices/:id', farmController.updateDevice);

farmRouter.post('/seed-demo', farmController.seedDemoData);

export default farmRouter;
