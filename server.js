import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

import { PORT } from './src/constants.js';
import { makeBroadcast } from './src/rooms.js';
import { setupHandlers } from './src/handlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  pingInterval: 10000,
  pingTimeout: 60000,
});

app.use(express.static(path.join(__dirname, 'public')));

const broadcast = makeBroadcast(io);

setupHandlers(io, broadcast);

server.listen(PORT, () => {
  console.log(`\n✅ Сервер запущен: http://localhost:${PORT}\n`);
});
