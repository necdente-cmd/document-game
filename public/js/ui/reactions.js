// Анимированные реакции (Noto Animated Emoji от Google + Lottie)
import { state } from '../state.js';

const CDN = 'https://fonts.gstatic.com/s/e/notoemoji/latest';
const LOTTIE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';

// emoji → codepoint (для URL)
export const REACTION_CODE = {
  '👍': '1f44d',
  '👎': '1f44e',
  '😂': '1f602',
  '😭': '1f62d',
  '😡': '1f621',
  '😤': '1f624',
  '🤔': '1f914',
  '😎': '1f60e',
  '😱': '1f631',
  '🤯': '1f92f',
  '🥳': '1f973',
  '😴': '1f634',
  '🤡': '1f921',
  '😈': '1f608',
  '👻': '1f47b',
  '💀': '1f480',
  '🔥': '1f525',
  '💯': '1f4af',
  '⚡': '26a1',
  '🎯': '1f3af',
  '💪': '1f4aa',
  '👏': '1f44f',
  '🤝': '1f91d',
  '🙏': '1f64f',
  '❤️': '2764_fe0f',
  '💔': '1f494',
  '🎉': '1f389',
  '🚀': '1f680',
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
loadLottie().catch(() => {});

const jsonCache = new Map();
async function loadJson(url) {
  if (jsonCache.has(url)) return jsonCache.get(url);
  const p = fetch(url).then(r => r.json());
  jsonCache.set(url, p);
  return p;
}

// --- Показ реакции: у аватара игрока → летит к центру стола → исчезает ---
export async function showReaction(seat, emoji) {
  const table = document.getElementById('table');
  if (!table || !state.server) return;

  const cp = REACTION_CODE[emoji];
  if (!cp) return;

  // 🎯 Старт — аватар игрока (или рука, если это я)
  let startRect;
  const avatarEl = document.querySelector(`.seat[data-seat="${seat}"] .avatar`);
  if (avatarEl) {
    startRect = avatarEl.getBoundingClientRect();
  } else {
    const hand = document.getElementById('hand');
    startRect = hand
      ? hand.getBoundingClientRect()
      : { left: innerWidth / 2, top: innerHeight - 100, width: 0, height: 0 };
  }
  const startX = startRect.left + startRect.width / 2;
  const startY = startRect.top  + startRect.height / 2;

  // 🎯 Финиш — центр стола, чуть ниже середины (58%)
  const tableRect = table.getBoundingClientRect();
  const endX = tableRect.left + tableRect.width / 2;
  const endY = tableRect.top + tableRect.height * 0.58;

  // Смещение для полёта
  const dx = endX - startX;
  const dy = endY - startY;

  // Контейнер реакции — ставим в точку старта, центрируем через translate(-50%,-50%)
  const wrap = document.createElement('div');
  wrap.className = 'reaction-fly';
  wrap.style.left = startX + 'px';
  wrap.style.top  = startY + 'px';
  wrap.style.setProperty('--fly-dx', dx + 'px');
  wrap.style.setProperty('--fly-dy', dy + 'px');

  const inner = document.createElement('div');
  inner.className = 'reaction-inner';
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
    inner.textContent = emoji;
    inner.style.fontSize = '72px';
    inner.style.display = 'flex';
    inner.style.alignItems = 'center';
    inner.style.justifyContent = 'center';
  }

  // Жизненный цикл: появляется у аватара (0.5с) → летит к центру (0.9с) → fade-out (0.4с) → remove
  // Итого ~1.8 сек на полёт и исчезновение
  setTimeout(() => {
    wrap.classList.add('reaction-out');
    setTimeout(() => wrap.remove(), 400);
  }, 1400);
}