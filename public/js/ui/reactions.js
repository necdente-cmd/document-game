// Анимированные реакции (Noto Animated Emoji от Google + Lottie)
import { state } from '../state.js';

const CDN = 'https://fonts.gstatic.com/s/e/notoemoji/latest';
const LOTTIE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';

// emoji → codepoint (для URL)
export const REACTION_CODE = {
  '👍': '1f44d',
  '😂': '1f602',
  '😡': '1f621',
  '😭': '1f62d',
  '🔥': '1f525',
  '💪': '1f4aa',
  '🤔': '1f914',
  '😎': '1f60e',
  '👏': '1f44f',
  '🎯': '1f3af',
  '😱': '1f631',
  '🤝': '1f91d',
  '😤': '1f624',
  '🙈': '1f648',
  '💯': '1f4af',
  '⚡': '26a1',
};

// --- Загрузка Lottie ---
let lottiePromise = null;
function loadLottie() {
  if (window.lottie) return Promise.resolve(window.lottie);
  if (lottiePromise) return lottiePromise;
  lottiePromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = LOTTIE_CDN;
    s.onload = () => resolve(window.lottie);
    s.onerror = () => reject(new Error('Lottie load failed'));
    document.head.appendChild(s);
  });
  return lottiePromise;
}

// Прелоад lottie-web сразу при импорте
loadLottie().catch(() => {});

// Кэш загруженных Lottie JSON
const jsonCache = new Map();
async function loadJson(url) {
  if (jsonCache.has(url)) return jsonCache.get(url);
  const p = fetch(url).then(r => r.json());
  jsonCache.set(url, p);
  return p;
}

// --- Показ реакции над игроком ---
export async function showReaction(seat, emoji) {
  const table = document.getElementById('table');
  if (!table || !state.server) return;

  const cp = REACTION_CODE[emoji];
  if (!cp) return;

  // Якорь: аватар игрока, или рука (для своей реакции)
  let r;
  const avatarEl = document.querySelector(`.seat[data-seat="${seat}"] .avatar`);
  if (avatarEl) {
    r = avatarEl.getBoundingClientRect();
  } else {
    const hand = document.getElementById('hand');
    r = hand ? hand.getBoundingClientRect()
             : { left: innerWidth / 2, top: innerHeight - 100, width: 0, height: 0 };
  }
  const cx = r.left + r.width  / 2;
  const cy = r.top  + r.height / 2;

  // Контейнер реакции
  const wrap = document.createElement('div');
  wrap.className = 'reaction-fly';
  wrap.style.left = cx + 'px';
  wrap.style.top  = cy + 'px';

  const inner = document.createElement('div');
  inner.style.width = '120px';
  inner.style.height = '120px';
  inner.style.position = 'absolute';
  inner.style.left = '-60px';
  inner.style.top  = '-60px';
  wrap.appendChild(inner);
  document.body.appendChild(wrap);

  // Загружаем lottie и данные
  try {
    const [lottie, json] = await Promise.all([
      loadLottie(),
      loadJson(`${CDN}/${cp}/lottie.json`),
    ]);
    lottie.loadAnimation({
      container: inner,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: json,
    });
  } catch (err) {
    // Фолбэк — обычный эмодзи, если сеть отвалилась
    inner.textContent = emoji;
    inner.style.fontSize = '72px';
    inner.style.lineHeight = '120px';
    inner.style.textAlign = 'center';
  }

  setTimeout(() => wrap.remove(), 3000);
}