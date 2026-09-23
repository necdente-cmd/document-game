import { state } from '../state.js';
import { socket } from '../socket.js';
import { esc } from '../card.js';
import { playSound } from '../sound.js';

const messages = [];

window.addEventListener('chat', (e) => {
  const { name, text, time } = e.detail;
  messages.push({ name, text, time });
  const box = document.getElementById('chatMessages');
  if (box) {
    box.innerHTML = renderMessagesHtml();
    box.scrollTop = box.scrollHeight;
  }
  // Если панель закрыта и сообщение не от меня — увеличить счётчик
  const panel = document.getElementById('chatPanel');
  const isOpen = panel?.classList.contains('open');
  if (!isOpen && name !== state.me?.name) {
    state.chatUnread = (state.chatUnread || 0) + 1;
    updateChatBadge();
  }
});

function renderMessagesHtml() {
  if (messages.length === 0) {
    return '<div style="opacity:.5;font-size:13px;">Сообщений пока нет…</div>';
  }
  return messages.map(m => `
    <div class="chat-msg">
      <span class="author">${esc(m.name)}:</span>
      ${esc(m.text)}
      <span class="time">${new Date(m.time).toLocaleTimeString().slice(0,5)}</span>
    </div>
  `).join('');
}

export function updateChatBadge() {
  const btn = document.getElementById('chatBtn');
  if (!btn) return;
  const n = state.chatUnread || 0;
  let badge = btn.querySelector('.chat-badge');
  if (n <= 0) {
    if (badge) badge.remove();
    return;
  }
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'chat-badge';
    btn.appendChild(badge);
  }
  badge.textContent = n > 9 ? '9+' : String(n);
}

export function openChat() {
  state.chatUnread = 0;
  updateChatBadge();

  let panel = document.getElementById('chatPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'chat-panel';
    panel.id = 'chatPanel';
    document.body.appendChild(panel);

    panel.innerHTML = `
      <div class="chat-head">
        <span>💬 Чат</span>
        <button id="closeChat">✕</button>
      </div>
      <div class="chat-messages" id="chatMessages"></div>
      <form class="chat-input" id="chatForm">
        <input id="chatInput" type="text" placeholder="Сообщение..." maxlength="200" autocomplete="off">
        <button type="submit">→</button>
      </form>
    `;

    document.getElementById('closeChat').onclick = () => {
      playSound('button');
      panel.classList.remove('open');
      if (window.onChatClose) window.onChatClose();
    };

    document.getElementById('chatForm').onsubmit = (e) => {
      e.preventDefault();
      const input = document.getElementById('chatInput');
      const text = input.value.trim();
      if (!text) return;
      playSound('button');
      socket.emit('chat', { text });
      input.value = '';
    };
  }

  panel.classList.add('open');
  const box = document.getElementById('chatMessages');
  box.innerHTML = renderMessagesHtml();
  box.scrollTop = box.scrollHeight;
  setTimeout(() => document.getElementById('chatInput')?.focus(), 100);
}