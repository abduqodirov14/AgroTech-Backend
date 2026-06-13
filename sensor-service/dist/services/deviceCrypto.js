"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareDeviceSecret = exports.hashDeviceSecret = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const hashDeviceSecret = async (plain, rounds = 10) => {
    return bcrypt_1.default.hash(plain, rounds);
};
exports.hashDeviceSecret = hashDeviceSecret;
const compareDeviceSecret = async (plain, hash) => {
    return bcrypt_1.default.compare(plain, hash);
};
exports.compareDeviceSecret = compareDeviceSecret;
