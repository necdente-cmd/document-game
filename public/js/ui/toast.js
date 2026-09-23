// Toast-уведомления — всплывают вверху экрана
let container = null;

function ensureContainer() {
  if (container && document.body.contains(container)) return container;
  container = document.createElement('div');
  container.id = 'toastContainer';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

export function toast(text, opts = {}) {
  if (!text) return;
  const { type = 'info', duration = 2500 } = opts;
  const c = ensureContainer();
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = text;
  c.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, duration);
}

export const toastErr  = (m) => toast(m, { type: 'error' });
export const toastOk   = (m) => toast(m, { type: 'success' });
export const toastWarn = (m) => toast(m, { type: 'warn' });
export const toastInfo = (m) => toast(m, { type: 'info' });
