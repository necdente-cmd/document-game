// 📚 Туториал — обучение новых игроков
import { state } from '../state.js';

const SCREENS = [
  {
    emoji: '🎴',
    title: 'Документ',
    subtitle: 'Карточная игра 2×2',
    text: 'Ты играешь с одним партнёром против двух соперников. Партнёр всегда сидит напротив тебя.',
    accent: '#f1c40f',
  },
  {
    emoji: '🏆',
    title: 'Цель игры',
    subtitle: 'Дойти до ступени Т',
    text: 'У каждой команды есть «документ» — свой ранг карт. Начнёте с 6, а за каждый выигранный кон поднимаетесь выше: 6 → 10 → В → Д → К → Т.\n\nПобеждает команда, которая дойдёт до Т и выиграет кон.',
    accent: '#2ecc71',
  },
  {
    emoji: '👆',
    title: 'Как ходить',
    subtitle: 'Атака картой',
    text: 'В свой ход тяни карту из руки в центр стола. Или тапни её, а потом тапни поле.\n\nПомни: своим документом заходить нельзя! Документ можно только бить (и только козырем).',
    accent: '#3498db',
  },
  {
    emoji: '🛡️',
    title: 'Как защищаться',
    subtitle: 'Всё или ничего',
    text: 'Когда тебя атакуют, ты либо бьёшь все карты, либо поднимаешь всё.\n\nКак бить: тапни карту врага, потом тапни свою карту в руке. Подходящие карты подсветятся зелёным.',
    accent: '#e74c3c',
  },
  {
    emoji: '✨',
    title: 'Особые правила',
    subtitle: 'Своп · Передача',
    text: '🔄 Своп — если партнёр вышел, можно отдать ему свои карты (1 раз за кон).\n\n📤 Передача документов — если у тебя только документы, передай их партнёру.',
    accent: '#8e44ad',
  },
  {
    emoji: '🚀',
    title: 'Готов!',
    subtitle: 'Удачи в игре',
    text: 'Собирай команду, играй с друзьями и побеждай.\n\nНе забывай: 🎤 микрофон — для голосового чата, 💬 чат — для переписки, ⚙️ настройки — для звука и темы.',
    accent: '#f39c12',
  },
];

export function showTutorial(onClose) {
  let current = 0;

  const el = document.createElement('div');
  el.className = 'tutorial-overlay';
  el.id = 'tutorialOverlay';
  document.body.appendChild(el);

  function render() {
    const s = SCREENS[current];
    const isLast = current === SCREENS.length - 1;
    const isFirst = current === 0;

    el.innerHTML = `
      <div class="tut-modal" style="--tut-accent: ${s.accent}">
        <button class="tut-skip" id="tutSkip" title="Пропустить">✕</button>

        <div class="tut-progress">
          ${SCREENS.map((_, i) =>
            `<span class="tut-dot ${i === current ? 'active' : ''} ${i < current ? 'done' : ''}"></span>`
          ).join('')}
        </div>

        <div class="tut-content">
          <div class="tut-emoji">${s.emoji}</div>
          <div class="tut-step">Шаг ${current + 1} из ${SCREENS.length}</div>
          <h2 class="tut-title">${s.title}</h2>
          <div class="tut-subtitle">${s.subtitle}</div>
          <p class="tut-text">${s.text.replace(/\n/g, '<br>')}</p>
        </div>

        <div class="tut-buttons">
          ${!isFirst
            ? `<button class="tut-btn tut-btn-back" id="tutBack">← Назад</button>`
            : `<div></div>`}
          <button class="tut-btn tut-btn-next" id="tutNext">
            ${isLast ? '🎮 В игру!' : 'Далее →'}
          </button>
        </div>
      </div>
    `;

    document.getElementById('tutNext').onclick = () => {
      if (isLast) {
        closeTutorial();
      } else {
        current++;
        render();
      }
    };

    const backBtn = document.getElementById('tutBack');
    if (backBtn) {
      backBtn.onclick = () => {
        if (current > 0) {
          current--;
          render();
        }
      };
    }

    document.getElementById('tutSkip').onclick = closeTutorial;
  }

  function closeTutorial() {
    el.classList.add('closing');
    setTimeout(() => {
      el.remove();
      try { localStorage.setItem('tutorialShown', '1'); } catch {}
      if (onClose) onClose();
    }, 250);
  }

  render();
}

export function shouldShowTutorial() {
  try {
    return localStorage.getItem('tutorialShown') !== '1';
  } catch {
    return true;
  }
}