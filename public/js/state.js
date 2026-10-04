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
  voiceActive: false,
  voiceSpeakingSeats: [],
  lastState: {},
  swapPick: null,
  mode: 'beginner',       // 'beginner' | 'veteran'
  __lastHintText: null,
  __hintUntil: 0,
};

export const AVATARS = [
  'default', 'avatar-2', 'avatar-3', 'avatar-4', 'avatar-5', 'avatar-6',
];

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

// ==================== РЕЖИМ ИГРЫ ====================
export function loadMode() {
  const m = localStorage.getItem('mode');
  state.mode = (m === 'veteran' || m === 'beginner') ? m : 'beginner';
  return state.mode;
}
export function saveMode(mode) {
  if (mode !== 'beginner' && mode !== 'veteran') return;
  state.mode = mode;
  try { localStorage.setItem('mode', mode); } catch {}
}
export function isVeteran() { return state.mode === 'veteran'; }

// ==================== ПРЕДПОЧТЕНИЯ ====================
export function loadPrefs() {
  state.soundOn = localStorage.getItem('soundOn') !== '0';
  state.vibrationOn = localStorage.getItem('vibrationOn') !== '0';
  state.micOn = localStorage.getItem('micOn') === '1';
  loadMode();
}
export function savePrefs() {
  localStorage.setItem('soundOn', state.soundOn ? '1' : '0');
  localStorage.setItem('vibrationOn', state.vibrationOn ? '1' : '0');
  localStorage.setItem('micOn', state.micOn ? '1' : '0');
}

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

// ==================== АВАТАРКИ ====================
export function normalizeAvatar(value) {
  if (!value) return 'default';
  if (typeof value !== 'string') return 'default';
  if (value.startsWith('IMG:')) return value;
  if (AVATARS.includes(value)) return value;
  return 'default';
}
export function getAvatar(seat) {
  if (state.server && state.server.players) {
    const p = state.server.players.find(x => x.seat === seat);
    if (p && p.avatar) return normalizeAvatar(p.avatar);
  }
  return 'default';
}
export function avatarHtml(value) {
  const v = normalizeAvatar(value);
  if (v.startsWith('IMG:')) {
    return `<img src="${v.slice(4)}" class="avatar-img" alt="">`;
  }
  return `<img src="/avatars/${v}.png" class="avatar-img" alt="">`;
}

export function loadAvatarImage() {
  try { return localStorage.getItem('myAvatarImage') || null; }
  catch { return null; }
}
export function saveAvatarImage(base64) {
  try {
    if (base64) localStorage.setItem('myAvatarImage', base64);
    else localStorage.removeItem('myAvatarImage');
  } catch {}
}
export function loadAvatar() { return localStorage.getItem('myAvatar') || 'default'; }
export function saveAvatar(id) {
  if (id) localStorage.setItem('myAvatar', id);
  else localStorage.removeItem('myAvatar');
}
export function getFinalAvatar() {
  const img = loadAvatarImage();
  if (img) return 'IMG:' + img;
  return normalizeAvatar(loadAvatar());
}

export function getPlayerId() {
  let id = localStorage.getItem('playerId');
  if (!id) {
    id = 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('playerId', id);
  }
  return id;
}