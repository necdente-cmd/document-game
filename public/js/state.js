export const state = {
  server: null,
  me: null,
  selected: new Set(),
  defendTarget: null,
  emojiOpen: false,
  historyOpen: false,
  chatOpen: false,
  chatUnread: 0,
  settingsOpen: false,
  dealKey: 0,
  lastPhaseForDeal: null,
  soundOn: true,
  vibrationOn: true,
  micOn: false,
  lastFieldCards: [],   // для отслеживания новых карт на поле
};

// ==================== НАБОР АВАТАРОК ====================
export const AVATARS = [
  '😎','🤠','👽','🤖','🎃','👻',
  '💀','🐱','🦊','🐻','🐼','🦁',
  '🐯','🐸','🐙','🦄','🐲','🦉',
  '🐺','🐨','🦅','🐷','🐵','🦝',
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
export function loadAvatar() { return localStorage.getItem('lastAvatar') || AVATARS[0]; }
export function saveAvatar(a) { localStorage.setItem('lastAvatar', a); }

// ==================== ЗВУК И ВИБРАЦИЯ ====================
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

export function vibrate(ms = 50) {
  if (state.vibrationOn && 'vibrate' in navigator) navigator.vibrate(ms);
}

// Синтез звуков через Web Audio API
export function playSound(type) {
  if (!state.soundOn) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    // Каждый тип — последовательность нот: {f = частота, t = длительность, d = задержка}
    const tones = {
      deal:     [{ f: 400, t: 0.10 }],
      card:     [{ f: 660, t: 0.10 }],
      beat:     [{ f: 540, t: 0.10 }],
      move:     [{ f: 440, t: 0.12 }],
      reaction: [{ f: 800, t: 0.06 }],
      win:      [{ f: 523, t: 0.15 }, { f: 659, t: 0.15, d: 0.15 }, { f: 784, t: 0.40, d: 0.30 }],
      lose:     [{ f: 330, t: 0.20 }, { f: 220, t: 0.50, d: 0.20 }],
      champ:    [{ f: 523, t: 0.18 }, { f: 659, t: 0.18, d: 0.18 },
                 { f: 784, t: 0.18, d: 0.36 }, { f: 1046, t: 0.60, d: 0.54 }],
    };

    const seq = tones[type] || tones.move;
    for (const n of seq) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = n.f;
      osc.connect(gain); gain.connect(ctx.destination);
      const start = now + (n.d || 0);
      gain.gain.setValueAtTime(0.06, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + n.t);
      osc.start(start);
      osc.stop(start + n.t);
    }
  } catch {}
}

// ==================== СОСТОЯНИЕ ИГРОКА ====================
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

export function getAvatar(seat, players) {
  const p = players?.find(x => x.seat === seat);
  return (p && p.avatar) || '😎';
}