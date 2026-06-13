"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || '3004', 10),
    database: {
        url: process.env.DATABASE_URL,
    },
    mqtt: {
        broker: process.env.MQTT_BROKER || 'mqtt://localhost:1883',
        topic: process.env.MQTT_TOPIC || 'v1/sensors/data',
    },
};
