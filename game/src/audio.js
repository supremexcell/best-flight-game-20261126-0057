// Synthesised sound: engine hum, ring chime, landing fanfare, crash thud.
// One clear job: every sound the game makes, generated in code — no audio files.

let ctx = null;
let engineOsc = null, engineOsc2 = null, engineGain = null;
let muted = false;

export function initAudio() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) { ctx = null; }
}

export function resumeAudio() {
  initAudio();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

export function startEngine() {
  if (!ctx || engineOsc) return;
  engineOsc = ctx.createOscillator();
  engineOsc.type = 'sawtooth';
  engineOsc.frequency.value = 55;
  engineOsc2 = ctx.createOscillator();
  engineOsc2.type = 'square';
  engineOsc2.frequency.value = 110;
  engineGain = ctx.createGain();
  engineGain.gain.value = 0.0;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass'; filter.frequency.value = 420;
  engineOsc.connect(filter); engineOsc2.connect(filter);
  filter.connect(engineGain); engineGain.connect(ctx.destination);
  engineOsc.start(); engineOsc2.start();
}

// throttle 0..1, speed in m/s — the hum follows both.
export function updateEngine(throttle, speed, flying) {
  if (!ctx || !engineOsc) return;
  const t = ctx.currentTime;
  engineOsc.frequency.setTargetAtTime(48 + throttle * 70 + speed * 0.35, t, 0.08);
  engineOsc2.frequency.setTargetAtTime(96 + throttle * 140 + speed * 0.7, t, 0.08);
  engineGain.gain.setTargetAtTime(muted ? 0 : (flying ? 0.045 + throttle * 0.05 : 0.02), t, 0.1);
}

function tone(freq, startAt, dur, type = 'sine', vol = 0.16) {
  if (!ctx || muted) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, ctx.currentTime + startAt);
  g.gain.linearRampToValueAtTime(vol, ctx.currentTime + startAt + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(ctx.currentTime + startAt); o.stop(ctx.currentTime + startAt + dur + 0.05);
}

export function playRingChime() {
  tone(659.25, 0, 0.35); tone(830.61, 0.08, 0.35); tone(987.77, 0.16, 0.5);
}

export function playLandingFanfare() {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => tone(f, i * 0.13, 0.55, 'triangle', 0.18));
}

export function playCrash() {
  if (!ctx || muted) return;
  const dur = 0.5;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const g = ctx.createGain(); g.gain.value = 0.3;
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 320;
  src.connect(filter); filter.connect(g); g.connect(ctx.destination);
  src.start();
  tone(55, 0, 0.5, 'sine', 0.25);
}

export function toggleMute() { muted = !muted; return muted; }
