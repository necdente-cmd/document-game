import { state } from '../state.js';
import { socket } from '../socket.js';
import { esc } from '../card.js';

const messages = [];

// Глобальный слушатель — добавляется ОДИН раз
window.addEventListener('chat', (e) => {
  const { name, text, time } = e.detail;
  messages.push({ name, text, time });
  // Обновляем только если чат открыт
  const box = document.getElementById('chatMessages');
  if (box) {
    box.innerHTML = renderMessagesHtml();
    box.scrollTop = box.scrollHeight;
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

export function openChat() {
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

    document.getElementById('closeChat').onclick = () => panel.classList.remove('open');

    document.getElementById('chatForm').onsubmit = (e) => {
      e.preventDefault();
      const input = document.getElementById('chatInput');
      const text = input.value.trim();
      if (!text) return;
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