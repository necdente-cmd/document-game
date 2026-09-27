
// 📷 Загрузка и обработка кастомной аватарки
import { toastErr } from './toast.js';

const MAX_SIZE = 128;
const QUALITY = 0.72;
const MAX_INPUT = 5 * 1024 * 1024; // 5 МБ

export function pickAvatarImage() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.onchange = async () => {
      const file = input.files && input.files[0];
      input.remove();
      if (!file) return resolve(null);

      if (!file.type.startsWith('image/')) {
        toastErr('Выберите картинку');
        return resolve(null);
      }
      if (file.size > MAX_INPUT) {
        toastErr('Файл слишком большой (макс. 5 МБ)');
        return resolve(null);
      }

      try {
        const base64 = await processImage(file);
        resolve(base64);
      } catch (e) {
        console.error('[avatar] error:', e);
        toastErr('Не удалось обработать картинку');
        resolve(null);
      }
    };

    input.oncancel = () => { input.remove(); resolve(null); };
    input.click();
  });
}

function processImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = MAX_SIZE;
          canvas.height = MAX_SIZE;
          const ctx = canvas.getContext('2d');

          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(0, 0, MAX_SIZE, MAX_SIZE);

          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;

          ctx.save();
          ctx.beginPath();
          ctx.arc(MAX_SIZE / 2, MAX_SIZE / 2, MAX_SIZE / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();

          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, MAX_SIZE, MAX_SIZE);
          ctx.restore();

          const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}