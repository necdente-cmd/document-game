// 🎤 Голосовой чат (WebRTC mesh) — с TURN-сервером
import { state } from './state.js';
import { socket } from './socket.js';
import { toastOk, toastErr } from './ui/toast.js';
import { t } from './i18n.js';

// Конфиг приходит с сервера (STUN + TURN с временными credentials)
let ICE_CONFIG = null;

function buildPeerConfig() {
  return ICE_CONFIG
    ? { iceServers: ICE_CONFIG, iceCandidatePoolSize: 10, bundlePolicy: 'max-bundle', rtcpMuxPolicy: 'require' }
    : { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
}

const peers = new Map();
const audioElements = new Map();
const remoteAnalysers = new Map();
let localStream = null;
let localAnalyser = null;
let localData = null;
let audioCtx = null;
let speakingTimer = null;
let bound = false;

// ==================== Включение ====================
export async function enableVoice() {
  if (state.voiceActive && localStream) return true;

  // 🔐 Запрашиваем свежие TURN credentials у сервера
  if (!ICE_CONFIG) {
    try {
      ICE_CONFIG = await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('[voice] ICE servers timeout — STUN fallback');
          resolve([{ urls: 'stun:stun.l.google.com:19302' }]);
        }, 3000);
        socket.once('ice-servers', (servers) => {
          clearTimeout(timeout);
          resolve(servers);
        });
        socket.emit('get-ice-servers');
      });
      console.log('[voice] ICE servers received:', ICE_CONFIG.length);
    } catch (e) {
      console.warn('[voice] failed to fetch ICE servers, STUN fallback');
      ICE_CONFIG = [{ urls: 'stun:stun.l.google.com:19302' }];
    }
  }

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
  } catch (err) {
    console.error('[voice] mic error:', err);
    return false;
  }

  localStream.getAudioTracks().forEach(track => track.enabled = !!state.micOn);
  state.voiceActive = true;

  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    const src = audioCtx.createMediaStreamSource(localStream);
    localAnalyser = audioCtx.createAnalyser();
    localAnalyser.fftSize = 512;
    src.connect(localAnalyser);
    localData = new Uint8Array(localAnalyser.frequencyBinCount);
  } catch (e) {
    console.warn('[voice] analyser setup failed', e);
  }

  socket.emit('voice-enabled');
  startSpeakingDetection();
  return true;
}

export function disableVoice() {
  if (!state.voiceActive) return;
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

// ==================== Детект речи ====================
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
    const changed = newArr.length !== oldArr.length ||
                    newArr.some((v, i) => v !== oldArr[i]);

    if (changed) {
      state.voiceSpeakingSeats = newArr;
      window.dispatchEvent(new CustomEvent('voice-speaking-change'));
    }
  }, 200);
}

// ==================== PeerConnection ====================
function createPeer(playerId) {
  if (peers.has(playerId)) return peers.get(playerId);

  const pc = new RTCPeerConnection(buildPeerConfig());
  const entry = { pc, pendingCandidates: [], makingOffer: false };
  peers.set(playerId, entry);

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
      el.playsInline = true;
      el.muted = false;
      el.volume = 1.0;
      el.style.display = 'none';
      document.body.appendChild(el);
      audioElements.set(playerId, el);
    }
    el.srcObject = stream;
    el.play().then(() => {
      console.log(`[voice] ✅ playing ${playerId}`);
    }).catch((e) => console.warn('[voice] play error', e));

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

  pc.onconnectionstatechange = () => {
    console.log(`[voice] ${playerId} state: ${pc.connectionState}`);
    if (pc.connectionState === 'failed') {
      console.warn(`[voice] ❌ failed with ${playerId}, retry`);
      cleanupPeer(playerId);
      if (state.voiceActive) {
        setTimeout(() => {
          if (state.voiceActive) initiateOffer(playerId);
        }, 1000);
      }
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.log(`[voice] ${playerId} ICE: ${pc.iceConnectionState}`);
  };

  return entry;
}

function cleanupPeer(playerId) {
  const entry = peers.get(playerId);
  if (entry) {
    try { entry.pc.close(); } catch {}
    peers.delete(playerId);
  }
  remoteAnalysers.delete(playerId);
  const el = audioElements.get(playerId);
  if (el) {
    el.srcObject = null;
    el.remove();
    audioElements.delete(playerId);
  }
}

// ==================== ICE queue ====================
async function flushPendingCandidates(playerId) {
  const entry = peers.get(playerId);
  if (!entry) return;
  const pc = entry.pc;
  if (!pc.remoteDescription || !pc.remoteDescription.type) return;
  const pending = entry.pendingCandidates;
  entry.pendingCandidates = [];
  for (const c of pending) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(c));
    } catch (e) {
      console.warn('[voice] flush ICE error', e);
    }
  }
}

// ==================== Perfect Negotiation ====================
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
    console.log(`[voice] → offer to ${playerId}`);
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
    console.log(`[voice] ← offer from ${from}`);

    const myId = state.me?.id;
    const polite = isPolite(myId, from);
    const offerCollision = entry.makingOffer || pc.signalingState !== 'stable';

    if (offerCollision && !polite) {
      console.log(`[voice] ignoring offer (impolite)`);
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
      console.log(`[voice] → answer to ${from}`);
    } catch (e) {
      console.warn('[voice] handle offer error', e);
    }

  } else if (data.type === 'answer') {
    console.log(`[voice] ← answer from ${from}`);
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
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        console.warn('[voice] ICE error', e);
      }
    } else {
      entry.pendingCandidates.push(data.candidate);
    }
  }
}

// ==================== Socket events ====================
export function bindVoiceSocket() {
  if (bound) return;
  bound = true;

  socket.on('voice-peers', async ({ peers: peerIds }) => {
    if (!state.voiceActive) return;
    console.log('[voice] peers list:', peerIds);
    for (const id of peerIds) {
      const myId = state.me?.id;
      if (String(myId) < String(id)) {
        try { await initiateOffer(id); } catch (e) { console.warn(e); }
      }
    }
  });

  socket.on('voice-peer-joined', ({ playerId }) => {
    console.log('[voice] peer joined:', playerId);
  });

  socket.on('voice-peer-left', ({ playerId }) => {
    console.log('[voice] peer left:', playerId);
    cleanupPeer(playerId);
  });

  socket.on('voice-signal', async ({ from, data }) => {
    if (!state.voiceActive) return;
    try { await handleSignal(from, data); } catch (e) { console.warn(e); }
  });

  socket.on('disconnect', () => {
    if (state.voiceActive) {
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
    }
  });

  socket.on('connect', () => {
    if (state.voiceActive && localStream) {
      console.log('[voice] reconnected — re-enabling');
      socket.emit('voice-enabled');
    }
  });
}