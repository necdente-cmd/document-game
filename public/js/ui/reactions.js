// Анимированные реакции (Noto Animated Emoji от Google + Lottie)
import { state } from '../state.js';

const CDN = 'https://fonts.gstatic.com/s/e/notoemoji/latest';
const LOTTIE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';

export const REACTION_CODE = {
  '👍': '1f44d', '👎': '1f44e', '😂': '1f602', '😭': '1f62d',
  '😡': '1f621', '😤': '1f624', '🤔': '1f914', '😎': '1f60e',
  '😱': '1f631', '🤯': '1f92f', '🥳': '1f973', '😴': '1f634',
  '🤡': '1f921', '😈': '1f608', '👻': '1f47b', '💀': '1f480',
  '🔥': '1f525', '💯': '1f4af', '⚡': '26a1',  '🎯': '1f3af',
  '💪': '1f4aa', '👏': '1f44f', '🤝': '1f91d', '🙏': '1f64f',
  '❤️': '2764_fe0f', '💔': '1f494', '🎉': '1f389', '🚀': '1f680',
};

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

// --- Полный жизненный цикл одной анимацией (WAAPI) ---
export async function showReaction(seat, emoji) {
  const table = document.getElementById('table');
  if (!table || !state.server) return;

  const cp = REACTION_CODE[emoji];
  if (!cp) return;

  // 📍 Старт — аватар игрока
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

  // 📍 Финиш — центр стола (58% высоты)
  const tableRect = table.getBoundingClientRect();
  const endX = tableRect.left + tableRect.width / 2;
  const endY = tableRect.top + tableRect.height * 0.58;

  const dx = endX - startX;
  const dy = endY - startY;

  // Контейнер — в точке старта
  const wrap = document.createElement('div');
  wrap.className = 'reaction-fly';
  wrap.style.left = startX + 'px';
  wrap.style.top  = startY + 'px';

  const inner = document.createElement('div');
  inner.className = 'reaction-inner';
  wrap.appendChild(inner);
  document.body.appendChild(wrap);

  // 🎬 ОДНА анимация — от старта до конца, без стыков
  const DURATION = 1900;
  const anim = wrap.animate([
    // 0% — появляется у аватара, маленький
    { transform: 'translate(-50%, -50%) scale(.3)', opacity: 0, offset: 0 },
    // 12% (~230ms) — развернулся у аватара
    { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.12 },
    // 50% (~950ms) — полёт по дуге, лёгкий поворот, чуть выше центра
    {
      transform: `translate(calc(-50% + ${dx * 0.55}px), calc(-50% + ${dy * 0.55 - 30}px)) scale(.78) rotate(-8deg)`,
      opacity: 1,
      offset: 0.5,
      easing: 'cubic-bezier(.3,.6,.3,1)'
    },
    // 78% (~1480ms) — достиг центра, чуть увеличен
    {
      transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.15)`,
      opacity: 1,
      offset: 0.78,
      easing: 'cubic-bezier(.2,.9,.3,1.2)'
    },
    // 88% (~1670ms) — осел в центре
    {
      transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1)`,
      opacity: 1,
      offset: 0.88
    },
    // 100% (~1900ms) — растаял
    {
      transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px - 20px)) scale(.4)`,
      opacity: 0,
      offset: 1
    }
  ], {
    duration: DURATION,
    fill: 'forwards'
  });

  // Загружаем Lottie
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

  // Удаляем из DOM после завершения
  setTimeout(() => wrap.remove(), DURATION + 50);
}