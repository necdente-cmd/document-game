// 🔐 Генератор временных паролей для TURN-сервера
import crypto from 'crypto';

const TURN_SECRET = 'ea76643603637b537c80f876fb67f78f22fad62fe9bac387cff47b79aff7d59d';
const TURN_TTL = 86400; // 24 часа

export function getIceServers() {
  const expiry = Math.floor(Date.now() / 1000) + TURN_TTL;
  const username = `${expiry}:document-game`;

  const hmac = crypto.createHmac('sha1', TURN_SECRET);
  hmac.update(username);
  const password = hmac.digest('base64');

  return [
    // STUN — три провайдера для надёжности
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },

    // TURN UDP (3478)
    {
      urls: 'turn:document-game.duckdns.org:3478?transport=udp',
      username,
      credential: password,
    },

    // TURN TCP (3478)
    {
      urls: 'turn:document-game.duckdns.org:3478?transport=tcp',
      username,
      credential: password,
    },

    // TURN over TLS (5349) — критично для мобильных сетей
    {
      urls: 'turns:document-game.duckdns.org:5349?transport=tcp',
      username,
      credential: password,
    },
  ];
}