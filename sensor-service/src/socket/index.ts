import { Server as SocketIOServer } from 'socket.io';

export function createSocketServer(server: import('http').Server) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('subscribe:device', (deviceId: string) => {
      socket.join(`device:${deviceId}`);
    });

    socket.on('unsubscribe:device', (deviceId: string) => {
      socket.leave(`device:${deviceId}`);
    });
  });

  return io;
}
