// 🎤 Голосовой чат (WebRTC mesh)
import { state } from './state.js';
import { socket } from './socket.js';

const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const peers = new Map();
const audioElements = new Map();
const remoteAnalysers = new Map();
let localStream = null;
let localAnalyser = null;
let localData = null;
let audioCtx = null;
let speakingTimer = null;
let bound = false;

export async function enableVoice() {
  if (state.voiceActive) return true;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
  } catch (err) {
    console.error('[voice] mic error:', err);
    return false;
  }
  localStream.getAudioTracks().forEach(t => t.enabled = !!state.micOn);
  state.voiceActive = true;

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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
  for (const [id, pc] of peers) { try { pc.close(); } catch {} }
  peers.clear();
  remoteAnalysers.clear();
  for (const [id, el] of audioElements) { el.srcObject = null; el.remove(); }
  audioElements.clear();
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
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
    localStream.getAudioTracks().forEach(t => t.enabled = state.micOn);
  }
}

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
    const changed = newArr.length !== oldArr.length || newArr.some((v, i) => v !== oldArr[i]);
    if (changed) {
      state.voiceSpeakingSeats = newArr;
      window.dispatchEvent(new CustomEvent('voice-speaking-change'));
    }
  }, 200);
}

function createPeer(playerId) {
  if (peers.has(playerId)) return peers.get(playerId);
  const pc = new RTCPeerConnection(ICE_CONFIG);
  peers.set(playerId, pc);

  if (localStream) {
    for (const track of localStream.getTracks()) pc.addTrack(track, localStream);
  }

  pc.ontrack = (event) => {
    const [stream] = event.streams;
    let el = audioElements.get(playerId);
    if (!el) {
      el = document.createElement('audio');
      el.autoplay = true;
      el.playsInline = true;
      el.style.display = 'none';
      document.body.appendChild(el);
      audioElements.set(playerId, el);
    }
    el.srcObject = stream;
    el.play().catch(() => {});

    try {
      const ctx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const a = ctx.createAnalyser();
      a.fftSize = 512;
      src.connect(a);
      remoteAnalysers.set(playerId, { analyser: a, data: new Uint8Array(a.frequencyBinCount) });
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
    if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
      cleanupPeer(playerId);
    }
  };

  return pc;
}

function cleanupPeer(playerId) {
  const pc = peers.get(playerId);
  if (pc) { try { pc.close(); } catch {} peers.delete(playerId); }
  remoteAnalysers.delete(playerId);
  const el = audioElements.get(playerId);
  if (el) { el.srcObject = null; el.remove(); audioElements.delete(playerId); }
}

async function initiateOffer(playerId) {
  const pc = createPeer(playerId);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit('voice-signal', {
    to: playerId,
    data: { type: 'offer', sdp: pc.localDescription },
  });
}

async function handleSignal(from, data) {
  const pc = createPeer(from);
  if (data.type === 'offer') {
    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('voice-signal', {
      to: from,
      data: { type: 'answer', sdp: pc.localDescription },
    });
  } else if (data.type === 'answer') {
    if (pc.signalingState !== 'stable') {
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    }
  } else if (data.type === 'ice') {
    try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); }
    catch (e) { console.warn('[voice] ICE error', e); }
  }
}

export function bindVoiceSocket() {
  if (bound) return;
  bound = true;

  socket.on('voice-peers', async ({ peers: peerIds }) => {
    if (!state.voiceActive) return;
    for (const id of peerIds) {
      try { await initiateOffer(id); } catch (e) { console.warn(e); }
    }
  });

  socket.on('voice-peer-joined', () => {});

  socket.on('voice-peer-left', ({ playerId }) => {
    cleanupPeer(playerId);
  });

  socket.on('voice-signal', async ({ from, data }) => {
    if (!state.voiceActive) return;
    try { await handleSignal(from, data); } catch (e) { console.warn(e); }
  });

  socket.on('disconnect', () => {
    if (state.voiceActive) disableVoice();
  });
}