// 🔐 Генератор временных паролей для TURN-сервера
import crypto from 'crypto';

// Тот же секрет, что в /etc/turnserver.conf
const TURN_SECRET = 'ea76643603637b537c80f876fb67f78f22fad62fe9bac387cff47b79aff7d59d';
const TURN_TTL = 86400; // 24 часа

export function getIceServers() {
  const expiry = Math.floor(Date.now() / 1000) + TURN_TTL;
  const username = `${expiry}:document-game`;

  const hmac = crypto.createHmac('sha1', TURN_SECRET);
  hmac.update(username);
  const password = hmac.digest('base64');

  return [
    // STUN
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // TURN UDP
    {
      urls: 'turn:document-game.duckdns.org:3478?transport=udp',
      username,
      credential: password,
    },
    // TURN TCP (fallback для сетей, где UDP заблокирован)
    {
      urls: 'turn:document-game.duckdns.org:3478?transport=tcp',
      username,
      credential: password,
    },
  ];
}