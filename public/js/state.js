export const state = {
  server: null,
  me: null,
  selected: new Set(),
  emojiOpen: false,
  historyOpen: false,
  chatOpen: false,
  settingsOpen: false,
  dealKey: 0,
  lastPhaseForDeal: null,
  soundOn: true,
  vibrationOn: true,
  micOn: false,
  // состояние игроков для UI
  lastState: {},
};

export function loadMe() {
  try { state.me = JSON.parse(localStorage.getItem('me') || 'null'); }
  catch { state.me = null; }
  return state.me;
}
export function saveMe(me) {
  state.me = me;
  if (me) localStorage.setItem('me', JSON.stringify(me));
  else localStorage.removeItem('me');
}
export function applyTheme(theme) { document.documentElement.dataset.theme = theme || 'classic'; }
export function applyScale(scale) { document.documentElement.dataset.scale = scale || 'medium'; }
export function loadOpts() {
  try { return JSON.parse(localStorage.getItem('opts') || '{}'); } catch { return {}; }
}
export function saveOpts(opts) { localStorage.setItem('opts', JSON.stringify(opts)); }
export function loadName() { return localStorage.getItem('lastName') || ''; }
export function saveName(name) { localStorage.setItem('lastName', name); }

// Настройки звука/вибры
export function loadPrefs() {
  state.soundOn = localStorage.getItem('soundOn') !== '0';
  state.vibrationOn = localStorage.getItem('vibrationOn') !== '0';
  state.micOn = localStorage.getItem('micOn') === '1';
}
export function savePrefs() {
  localStorage.setItem('soundOn', state.soundOn ? '1' : '0');
  localStorage.setItem('vibrationOn', state.vibrationOn ? '1' : '0');
  localStorage.setItem('micOn', state.micOn ? '1' : '0');
}

// Вспомогательные
export function vibrate(ms = 50) {
  if (state.vibrationOn && 'vibrate' in navigator) navigator.vibrate(ms);
}
export function beep() {
  if (!state.soundOn) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 440;
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start(); osc.stop(ctx.currentTime + 0.1);
  } catch {}
}

// Определение состояния игрока
export function playerState(s, seat) {
  const p = s.players.find(x => x.seat === seat);
  if (!p) return '';
  if (!p.connected) return 'отошёл';
  if (p.out) return 'вышел';
  if (s.field) {
    if (s.field.defender === seat) return 'бьёт';
    if (s.field.attacker === seat) return 'ходит';
    const partner = (s.field.attacker + 2) % 4;
    if (partner === seat) return 'думает';
  } else {
    if (s.turnSeat === seat) return 'думает';
  }
  return '';
}

// Аватарки (стандартный набор)
export const AVATARS = ['😎','🦊','🐻','🐼','🦁','🐯','🐸','🐙','🦄','🐲','👽','🤖'];
export function getAvatar(seat) {
  return AVATARS[seat % AVATARS.length];
}