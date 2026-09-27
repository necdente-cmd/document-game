// 🎤 Голосовой чат (WebRTC mesh) — с авто-восстановлением
import { state } from './state.js';
import { socket } from './socket.js';
import { toastOk, toastErr, toastInfo } from './ui/toast.js';
import { t } from './i18n.js';

let ICE_CONFIG = null;

function buildPeerConfig() {
  return ICE_CONFIG
    ? { iceServers: ICE_CONFIG, iceCandidatePoolSize: 10, bundlePolicy: 'max-bundle', rtcpMuxPolicy: 'require' }
    : { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
}

const peers = new Map();
window.__voicePeers = peers;
const audioElements = new Map();
const remoteAnalysers = new Map();
let localStream = null;
let localAnalyser = null;
let localData = null;
let audioCtx = null;
let speakingTimer = null;
let bound = false;
let hiddenAt = 0;
let restoring = false;

// 🔓 Разблокировка аудио на мобильных
export function unlockAudio() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => {
        console.log('[voice] 🔓 AudioContext resumed');
      });
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.01);
  } catch (e) {
    console.warn('[voice] unlock failed', e);
  }
}

['click', 'touchstart', 'keydown'].forEach(evt => {
  document.addEventListener(evt, unlockAudio, { once: true, capture: true });
});

// ==================== ВКЛЮЧЕНИЕ ====================
export async function enableVoice() {
  if (state.voiceActive && localStream && streamIsLive()) return true;

  unlockAudio();

  // TURN credentials
  if (!ICE_CONFIG) {
    try {
      ICE_CONFIG = await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('[voice] ⏱ ICE timeout — STUN only');
          resolve([{ urls: 'stun:stun.l.google.com:19302' }]);
        }, 3000);
        socket.once('ice-servers', (servers) => {
          clearTimeout(timeout);
          resolve(servers);
        });
        socket.emit('get-ice-servers');
      });
      console.log('[voice] 📡 ICE servers:', ICE_CONFIG.length);
    } catch (e) {
      console.warn('[voice] ❌ ICE fail');
      ICE_CONFIG = [{ urls: 'stun:stun.l.google.com:19302' }];
    }
  }

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
    console.log('[voice] 🎤 mic OK, tracks:', localStream.getAudioTracks().length);
  } catch (err) {
    console.error('[voice] ❌ mic error:', err.name, err.message);
    toastErr('Микрофон: ' + err.name);
    return false;
  }

  localStream.getAudioTracks().forEach(track => track.enabled = !!state.micOn);
  state.voiceActive = true;

  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    const src = audioCtx.createMediaStreamSource(localStream);
    localAnalyser = audioCtx.createAnalyser();
    localAnalyser.fftSize = 512;
    src.connect(localAnalyser);
    localData = new Uint8Array(localAnalyser.frequencyBinCount);
  } catch (e) {
    console.warn('[voice] analyser failed', e);
  }

  socket.emit('voice-enabled');
  console.log('[voice] 📤 voice-enabled sent');
  startSpeakingDetection();
  return true;
}

// Проверка живой ли стрим
function streamIsLive() {
  if (!localStream) return false;
  const tracks = localStream.getAudioTracks();
  if (tracks.length === 0) return false;
  return tracks.some(t => t.readyState === 'live');
}

export function disableVoice() {
  if (!state.voiceActive && !localStream) return;
  state.voiceActive = false;

  for (const [id, entry] of peers) {
    try { entry.pc.close(); } catch {}
  }
  peers.clear();
  remoteAnalysers.clear();

  for (const [id, el] of audioElements) {
    el.srcObject = null;
    el.remove();
  }
  audioElements.clear();

  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  if (speakingTimer) { clearInterval(speakingTimer); speakingTimer = null; }

  state.voiceSpeakingSeats = [];
  window.dispatchEvent(new CustomEvent('voice-speaking-change'));
  socket.emit('voice-disabled');
}

export function setMicOn(on) {
  state.micOn = !!on;
  if (localStream) {
    localStream.getAudioTracks().forEach(track => track.enabled = state.micOn);
  }
}

// 🔄 ПРИНУДИТЕЛЬНЫЙ ПЕРЕЗАПУСК
export async function restartVoice() {
  if (restoring) {
    console.log('[voice] ⏳ already restoring');
    return false;
  }
  restoring = true;
  console.log('[voice] 🔄 restartVoice');
  try {
    disableVoice();
    await new Promise(r => setTimeout(r, 400));
    const wasMicOn = state.micOn;
    state.micOn = true;
    const ok = await enableVoice();
    state.micOn = ok ? wasMicOn : false;
    if (ok) {
      setMicOn(wasMicOn);
      console.log('[voice] ✅ restart OK');
    } else {
      console.warn('[voice] ❌ restart failed');
    }
    return ok;
  } finally {
    restoring = false;
  }
}

// ==================== ДЕТЕКТ РЕЧИ ====================
function startSpeakingDetection() {
  if (speakingTimer) clearInterval(speakingTimer);
  speakingTimer = setInterval(() => {
    const seats = new Set();
    if (state.micOn && localAnalyser && localData && state.server) {
      localAnalyser.getByteFrequencyData(localData);
      let sum = 0;
      for (let i = 0; i < localData.length; i++) sum += localData[i];
      if (sum / localData.length > 18) seats.add(state.server.mySeat);
    }
    for (const [playerId, { analyser, data }] of remoteAnalysers) {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      if (sum / data.length > 18) {
        const p = state.server?.players.find(x => x.id === playerId);
        if (p) seats.add(p.seat);
      }
    }
    const newArr = Array.from(seats).sort();
    const oldArr = (state.voiceSpeakingSeats || []).slice().sort();
    if (newArr.length !== oldArr.length || newArr.some((v, i) => v !== oldArr[i])) {
      state.voiceSpeakingSeats = newArr;
      window.dispatchEvent(new CustomEvent('voice-speaking-change'));
    }
  }, 200);
}

// ==================== PEER ====================
function createPeer(playerId) {
  if (peers.has(playerId)) return peers.get(playerId);

  const pc = new RTCPeerConnection(buildPeerConfig());
  const entry = { pc, pendingCandidates: [], makingOffer: false };
  peers.set(playerId, entry);
  console.log(`[voice] 🆕 createPeer ${playerId}`);

  if (localStream) {
    for (const track of localStream.getTracks()) {
      pc.addTrack(track, localStream);
    }
  }

  pc.ontrack = (event) => {
    const [stream] = event.streams;
    console.log(`[voice] 🔊 track from ${playerId}`);

    let el = audioElements.get(playerId);
    if (!el) {
      el = document.createElement('audio');
      el.autoplay = true;
      el.setAttribute('playsinline', '');
      el.setAttribute('webkit-playsinline', '');
      el.muted = false;
      el.volume = 1.0;
      el.style.display = 'none';
      document.body.appendChild(el);
      audioElements.set(playerId, el);
    }
    el.srcObject = stream;
    if (el.setSinkId) el.setSinkId('').catch(() => {});

    const playPromise = el.play();
    if (playPromise) {
      playPromise.then(() => {
        console.log(`[voice] ✅ playing ${playerId}`);
      }).catch((e) => {
        console.error(`[voice] ❌ play error ${playerId}:`, e.name);
        const tryPlay = () => {
          el.play().then(() => {
            console.log(`[voice] ✅ playing retry ${playerId}`);
            document.removeEventListener('click', tryPlay);
          }).catch(() => {});
        };
        document.addEventListener('click', tryPlay);
      });
    }

    try {
      const ctx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const a = ctx.createAnalyser();
      a.fftSize = 512;
      src.connect(a);
      remoteAnalysers.set(playerId, {
        analyser: a,
        data: new Uint8Array(a.frequencyBinCount),
      });
    } catch (e) {}
  };

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit('voice-signal', {
        to: playerId,
        data: { type: 'ice', candidate: e.candidate },
      });
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.log(`[voice] ❄ ICE ${playerId}: ${pc.iceConnectionState}`);
    if (pc.iceConnectionState === 'failed' && state.voiceActive) {
      console.warn(`[voice] ❌ ICE failed ${playerId}, retry`);
      cleanupPeer(playerId);
      setTimeout(() => {
        if (state.voiceActive) initiateOffer(playerId);
      }, 2000);
    }
  };

  pc.onconnectionstatechange = () => {
    console.log(`[voice] 🔗 ${playerId} state: ${pc.connectionState}`);
    if (pc.connectionState === 'failed') {
      cleanupPeer(playerId);
      if (state.voiceActive) {
        setTimeout(() => { if (state.voiceActive) initiateOffer(playerId); }, 2000);
      }
    }
  };

  return entry;
}

function cleanupPeer(playerId) {
  const entry = peers.get(playerId);
  if (entry) { try { entry.pc.close(); } catch {} peers.delete(playerId); }
  remoteAnalysers.delete(playerId);
  const el = audioElements.get(playerId);
  if (el) { el.srcObject = null; el.remove(); audioElements.delete(playerId); }
}

async function flushPendingCandidates(playerId) {
  const entry = peers.get(playerId);
  if (!entry) return;
  const pc = entry.pc;
  if (!pc.remoteDescription || !pc.remoteDescription.type) return;
  const pending = entry.pendingCandidates;
  entry.pendingCandidates = [];
  for (const c of pending) {
    try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
  }
}

function isPolite(myId, otherId) {
  return String(myId) < String(otherId);
}

async function initiateOffer(playerId) {
  let entry = peers.get(playerId);
  if (!entry) {
    createPeer(playerId);
    entry = peers.get(playerId);
  }
  const pc = entry.pc;
  if (pc.signalingState !== 'stable') return;

  try {
    entry.makingOffer = true;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('voice-signal', {
      to: playerId,
      data: { type: 'offer', sdp: pc.localDescription },
    });
    console.log(`[voice] 📤 offer → ${playerId}`);
  } catch (e) {
    console.warn('[voice] offer error', e);
  } finally {
    entry.makingOffer = false;
  }
}

async function handleSignal(from, data) {
  let entry = peers.get(from);
  if (!entry) {
    createPeer(from);
    entry = peers.get(from);
  }
  const pc = entry.pc;

  if (data.type === 'offer') {
    console.log(`[voice] 📥 offer ← ${from}`);
    const myId = state.me?.id;
    const polite = isPolite(myId, from);
    const offerCollision = entry.makingOffer || pc.signalingState !== 'stable';

    if (offerCollision && !polite) {
      console.log(`[voice] ⏸ ignore offer (impolite)`);
      return;
    }
    if (offerCollision && polite) {
      try { await pc.setLocalDescription({ type: 'rollback' }); } catch (e) {}
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      await flushPendingCandidates(from);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('voice-signal', {
        to: from,
        data: { type: 'answer', sdp: pc.localDescription },
      });
      console.log(`[voice] 📤 answer → ${from}`);
    } catch (e) {
      console.warn('[voice] handle offer error', e);
    }

  } else if (data.type === 'answer') {
    console.log(`[voice] 📥 answer ← ${from}`);
    if (pc.signalingState === 'have-local-offer') {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        await flushPendingCandidates(from);
      } catch (e) {
        console.warn('[voice] handle answer error', e);
      }
    }

  } else if (data.type === 'ice') {
    if (pc.remoteDescription && pc.remoteDescription.type) {
      try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (e) {}
    } else {
      entry.pendingCandidates.push(data.candidate);
    }
  }
}

// ==================== SOCKET ====================
export function bindVoiceSocket() {
  if (bound) return;
  bound = true;

  socket.on('voice-peers', async ({ peers: peerIds }) => {
    if (!state.voiceActive) return;
    console.log('[voice] 👥 peers list:', peerIds);
    for (const id of peerIds) {
      if (!peers.has(id)) {
        try { await initiateOffer(id); } catch (e) {}
      }
    }
  });

  socket.on('voice-peer-joined', async ({ playerId }) => {
    console.log('[voice] 👋 peer joined:', playerId);
    if (!state.voiceActive) return;
    // ✨ ФИКС: всегда инициируем оффер
    if (!peers.has(playerId)) {
      try { await initiateOffer(playerId); } catch (e) {}
    }
  });

  socket.on('voice-peer-left', ({ playerId }) => {
    console.log('[voice] 👋 peer left:', playerId);
    cleanupPeer(playerId);
  });

  socket.on('voice-signal', async ({ from, data }) => {
    if (!state.voiceActive) return;
    try { await handleSignal(from, data); } catch (e) {}
  });

  socket.on('disconnect', () => {
    // НЕ закрываем peer-ы сразу, попробуем восстановить
    console.log('[voice] ⚠ socket disconnect');
  });

  socket.on('connect', async () => {
    if (state.voiceActive) {
      console.log('[voice] ♻ socket reconnected');
      if (!streamIsLive()) {
        // Микрофон мёртв — полный перезапуск
        await restartVoice();
      } else {
        // Микрофон жив — просто переотправляем voice-enabled
        socket.emit('voice-enabled');
      }
    }
  });

  // ==================== 🔄 ВОЗВРАТ ИЗ ФОНА ====================
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
      return;
    }
    const hiddenMs = hiddenAt ? Date.now() - hiddenAt : 0;
    hiddenAt = 0;
    console.log('[voice] 👀 visible after', hiddenMs, 'ms');

    if (!state.voiceActive && !state.micOn) return;

    // Если были в фоне > 2 сек и голос был активен — проверяем
    if (hiddenMs > 2000) {
      await new Promise(r => setTimeout(r, 500)); // дать системе время отдать микрофон

      if (!streamIsLive()) {
        console.log('[voice] 🔄 mic dead, restart');
        const ok = await restartVoice();
        if (ok) toastOk('🎤 Голос восстановлен');
        else toastErr('🎤 Микрофон отвалился — нажми 🎤');
      } else if (state.voiceActive) {
        // Микрофон жив — переотправляем voice-enabled
        socket.emit('voice-enabled');
        // Размораживаем audio
        for (const [id, el] of audioElements) {
          el.play().catch(() => {});
        }
      }
    }
  });

  window.addEventListener('focus', () => {
    if (!state.voiceActive) return;
    if (!streamIsLive()) {
      console.log('[voice] 🔄 focus: mic dead, restart');
      restartVoice();
    }
  });
}

// ==================== 🔍 ДИАГНОСТИКА ====================
export function getVoiceDebugInfo() {
  const info = [];
  for (const [id, entry] of peers) {
    info.push({
      id,
      ice: entry.pc.iceConnectionState,
      conn: entry.pc.connectionState,
      signal: entry.pc.signalingState,
    });
  }
  return info;
}

export function getAudioElements() {
  const arr = [];
  for (const [id, el] of audioElements) {
    arr.push({
      id,
      paused: el.paused,
      muted: el.muted,
      volume: el.volume,
      hasSrc: !!el.srcObject,
      srcTracks: el.srcObject?.getAudioTracks?.()?.length || 0,
    });
  }
  return arr;
}

export function streamIsLivePublic() {
  return streamIsLive();
}