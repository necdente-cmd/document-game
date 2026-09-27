// 🎨 Компонент выбора аватарки (6 готовых + своё фото)
import {
  AVATARS, loadAvatar, saveAvatar,
  loadAvatarImage, saveAvatarImage,
} from '../state.js';
import { pickAvatarImage } from './avatar-upload.js';
import { playSound } from '../sound.js';

export function renderAvatarPicker() {
  const img = loadAvatarImage();
  const selectedId = loadAvatar();

  const avatarsHtml = AVATARS.map(id => {
    const isSel = !img && id === selectedId;
    return `
      <div class="avatar-choice ${isSel ? 'sel' : ''}" data-avatar-id="${id}">
        <img src="/avatars/${id}.png" alt="">
      </div>
    `;
  }).join('');

  const previewSrc = img || `/avatars/${selectedId}.png`;

  return `
    <div class="avatar-picker" id="avatarPick">
      <div class="avatar-preview-wrap">
        <div class="avatar-preview">
          <img src="${previewSrc}" alt="">
        </div>
        <button class="avatar-upload-btn" id="avatarUploadBtn" type="button">
          ${img ? '🔄 Заменить фото' : '📷 Загрузить своё фото'}
        </button>
        ${img ? `<button class="avatar-remove-btn" id="avatarRemoveBtn" type="button" title="Удалить фото">✕</button>` : ''}
      </div>
      <div class="avatar-emojis" id="avatarGrid">${avatarsHtml}</div>
    </div>
  `;
}

export function bindAvatarPicker() {
  const picker = document.getElementById('avatarPick');
  if (!picker) return;

  // Выбор готовой
  picker.querySelectorAll('.avatar-choice').forEach(el => {
    el.onclick = () => {
      playSound('button');
      const id = el.dataset.avatarId;
      saveAvatarImage(null);
      saveAvatar(id);
      picker.querySelectorAll('.avatar-choice').forEach(x => x.classList.toggle('sel', x === el));
      updatePreview(`/avatars/${id}.png`, false);
    };
  });

  // Загрузка фото
  const uploadBtn = document.getElementById('avatarUploadBtn');
  if (uploadBtn) {
    uploadBtn.onclick = async () => {
      playSound('button');
      const base64 = await pickAvatarImage();
      if (!base64) return;
      saveAvatarImage(base64);
      picker.querySelectorAll('.avatar-choice').forEach(x => x.classList.remove('sel'));
      updatePreview(base64, true);
    };
  }

  // Удалить фото
  bindRemoveBtn();
}

function bindRemoveBtn() {
  const btn = document.getElementById('avatarRemoveBtn');
  if (!btn) return;
  btn.onclick = () => {
    playSound('button');
    saveAvatarImage(null);
    const id = loadAvatar();
    updatePreview(`/avatars/${id}.png`, false);
    const picker = document.getElementById('avatarPick');
    picker?.querySelectorAll('.avatar-choice').forEach(x => {
      x.classList.toggle('sel', x.dataset.avatarId === id);
    });
  };
}

function updatePreview(src, isPhoto) {
  const preview = document.querySelector('.avatar-preview img');
  if (preview) preview.src = src;

  const uploadBtn = document.getElementById('avatarUploadBtn');
  if (uploadBtn) uploadBtn.textContent = isPhoto ? '🔄 Заменить фото' : '📷 Загрузить своё фото';

  let removeBtn = document.getElementById('avatarRemoveBtn');
  if (isPhoto && !removeBtn) {
    removeBtn = document.createElement('button');
    removeBtn.className = 'avatar-remove-btn';
    removeBtn.id = 'avatarRemoveBtn';
    removeBtn.type = 'button';
    removeBtn.title = 'Удалить фото';
    removeBtn.textContent = '✕';
    document.querySelector('.avatar-preview-wrap').appendChild(removeBtn);
    bindRemoveBtn();
  } else if (!isPhoto && removeBtn) {
    removeBtn.remove();
  }
}