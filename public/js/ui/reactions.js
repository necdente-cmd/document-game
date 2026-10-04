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

export async function showReaction(seat, emoji) {
  const table = document.getElementById('table');
  if (!table || !state.server) return;

  const cp = REACTION_CODE[emoji];
  if (!cp) return;

  // 📍 Позиция — центр стола, чуть ниже середины (58%)
  const tableRect = table.getBoundingClientRect();
  const cx = tableRect.left + tableRect.width / 2;
  const cy = tableRect.top + tableRect.height * 0.58;

  const wrap = document.createElement('div');
  wrap.className = 'reaction-fly';
  wrap.style.left = cx + 'px';
  wrap.style.top  = cy + 'px';

  const inner = document.createElement('div');
  inner.className = 'reaction-inner';
  wrap.appendChild(inner);
  document.body.appendChild(wrap);

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

  // Жизненный цикл: 2.6с показа → 0.5с fade out → remove
  setTimeout(() => {
    wrap.classList.add('reaction-out');
    setTimeout(() => wrap.remove(), 500);
  }, 2600);
}