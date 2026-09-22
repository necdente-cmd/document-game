// Глобальное состояние клиента
export const state = {
  server: null,       // последнее состояние от сервера
  me: null,           // { name, id, roomId }
  selected: new Set(),
  defendTarget: null,
  emojiOpen: false,
  historyOpen: false,
  dealKey: 0,
  lastPhaseForDeal: null,
};

// Загрузка/сохранение me из localStorage
export function loadMe() {
  try {
    state.me = JSON.parse(localStorage.getItem('me') || 'null');
  } catch {
    state.me = null;
  }
  return state.me;
}

export function saveMe(me) {
  state.me = me;
  if (me) localStorage.setItem('me', JSON.stringify(me));
  else localStorage.removeItem('me');
}

// Применение темы (classic/dark/neon/paper)
export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme || 'classic';
}

// Применение масштаба (small/medium/large)
export function applyScale(scale) {
  document.documentElement.dataset.scale = scale || 'medium';
}

// Загрузка настроек из localStorage
export function loadOpts() {
  try {
    return JSON.parse(localStorage.getItem('opts') || '{}');
  } catch {
    return {};
  }
}

export function saveOpts(opts) {
  localStorage.setItem('opts', JSON.stringify(opts));
}

// Последнее имя игрока
export function loadName() {
  return localStorage.getItem('lastName') || '';
}

export function saveName(name) {
  localStorage.setItem('lastName', name);
}