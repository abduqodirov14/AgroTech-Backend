"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSocketServer = createSocketServer;
const socket_io_1 = require("socket.io");
function createSocketServer(server) {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });
    io.on('connection', (socket) => {
        console.log('Socket connected:', socket.id);
        socket.on('subscribe:device', (deviceId) => {
            socket.join(`device:${deviceId}`);
        });
        socket.on('unsubscribe:device', (deviceId) => {
            socket.leave(`device:${deviceId}`);
        });
    });
    return io;
}
