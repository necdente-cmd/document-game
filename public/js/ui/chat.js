import { state } from '../state.js';
import { socket } from '../socket.js';
import { esc } from '../card.js';

const messages = [];

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

    window.addEventListener('chat', (e) => {
      const { name, text, time } = e.detail;
      messages.push({ name, text, time });
      renderMessages();
    });
  }

  panel.classList.add('open');
  renderMessages();
  setTimeout(() => document.getElementById('chatInput')?.focus(), 100);
}

function renderMessages() {
  const box = document.getElementById('chatMessages');
  if (!box) return;
  box.innerHTML = messages.map(m => `
    <div class="chat-msg">
      <span class="author">${esc(m.name)}:</span>
      ${esc(m.text)}
      <span class="time">${new Date(m.time).toLocaleTimeString().slice(0,5)}</span>
    </div>
  `).join('');
  box.scrollTop = box.scrollHeight;
}