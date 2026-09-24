// 📚 Туториал — обучение новых игроков
import { state } from '../state.js';
import { t } from '../i18n.js';

function getScreens() {
  return [
    {
      emoji: t('tut.s1.emoji'),
      title: t('tut.s1.title'),
      subtitle: t('tut.s1.subtitle'),
      text: t('tut.s1.text'),
      accent: '#f1c40f',
    },
    {
      emoji: t('tut.s2.emoji'),
      title: t('tut.s2.title'),
      subtitle: t('tut.s2.subtitle'),
      text: t('tut.s2.text'),
      accent: '#2ecc71',
    },
    {
      emoji: t('tut.s3.emoji'),
      title: t('tut.s3.title'),
      subtitle: t('tut.s3.subtitle'),
      text: t('tut.s3.text'),
      accent: '#3498db',
    },
    {
      emoji: t('tut.s4.emoji'),
      title: t('tut.s4.title'),
      subtitle: t('tut.s4.subtitle'),
      text: t('tut.s4.text'),
      accent: '#e74c3c',
    },
    {
      emoji: t('tut.s5.emoji'),
      title: t('tut.s5.title'),
      subtitle: t('tut.s5.subtitle'),
      text: t('tut.s5.text'),
      accent: '#8e44ad',
    },
    {
      emoji: t('tut.s6.emoji'),
      title: t('tut.s6.title'),
      subtitle: t('tut.s6.subtitle'),
      text: t('tut.s6.text'),
      accent: '#f39c12',
    },
  ];
}

export function showTutorial(onClose) {
  const SCREENS = getScreens();
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
        <button class="tut-skip" id="tutSkip" title="${t('tut.skip')}">✕</button>

        <div class="tut-progress">
          ${SCREENS.map((_, i) =>
            `<span class="tut-dot ${i === current ? 'active' : ''} ${i < current ? 'done' : ''}"></span>`
          ).join('')}
        </div>

        <div class="tut-content">
          <div class="tut-emoji">${s.emoji}</div>
          <div class="tut-step">${t('tut.step', { n: current + 1, total: SCREENS.length })}</div>
          <h2 class="tut-title">${s.title}</h2>
          <div class="tut-subtitle">${s.subtitle}</div>
          <p class="tut-text">${s.text.replace(/\n/g, '<br>')}</p>
        </div>

        <div class="tut-buttons">
          ${!isFirst
            ? `<button class="tut-btn tut-btn-back" id="tutBack">${t('tut.back')}</button>`
            : `<div></div>`}
          <button class="tut-btn tut-btn-next" id="tutNext">
            ${isLast ? t('tut.finish') : t('tut.next')}
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