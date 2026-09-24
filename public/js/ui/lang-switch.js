// 🌐 Компонент переключения языка
import { LANGS, getLang, setLang, toggleLang } from '../i18n.js';
import { playSound } from '../sound.js';

export function createLangButton() {
  const btn = document.createElement('button');
  btn.className = 'icon-btn';
  btn.id = 'langBtn';
  btn.title = 'Язык / Тил';
  updateLangButton(btn);
  btn.onclick = () => {
    playSound('button');
    toggleLang();
    updateLangButton(btn);
    // Перерисовка всех открытых экранов
    window.dispatchEvent(new CustomEvent('lang-change-requested'));
  };
  return btn;
}

export function updateLangButton(btn) {
  const lang = getLang();
  if (lang === 'ky') btn.textContent = '🇰🇬';
  else btn.textContent = '🇷🇺';
}