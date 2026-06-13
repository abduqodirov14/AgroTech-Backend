"use strict";
/**
 * @file       farmRoutes.ts
 * @module     FarmService/Routes
 * @description Defines Express routes for managing agricultural zones and IoT device registry.
 */
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
const farmController = __importStar(require("../controllers/farmController"));
const farmRouter = (0, express_1.Router)();
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
exports.default = farmRouter;
//# sourceMappingURL=farmRoutes.js.map