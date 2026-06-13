"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const deviceController_1 = require("../controllers/deviceController");
const router = (0, express_1.Router)();
/**
 * POST /api/v1/devices/register
 * MAC address + plainSecret bilan qurilma qo'shish
 */
router.post('/register', deviceController_1.registerDevice);
exports.default = router;
