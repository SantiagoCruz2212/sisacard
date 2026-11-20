// Efectos de sonido sintetizados con Web Audio (campana y disparo): no hace falta ningún archivo de audio.
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

/**
 * Los navegadores no dejan sonar hasta que el usuario interactúa con la página.
 * Se "desbloquea" el audio con el primer clic o tecla; después la campana suena sola.
 */
export function installAudioUnlock(): () => void {
  const unlock = () => void audio()?.resume();
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  return () => {
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
}

// Parciales inarmónicos (razón de frecuencia, volumen): dan el timbre metálico de una campana.
const PARTIALS: [number, number][] = [
  [1, 1],
  [2.76, 0.5],
  [5.4, 0.25],
  [8.93, 0.12],
];

function strike(c: AudioContext, at: number, volume: number) {
  const master = c.createGain();
  master.gain.setValueAtTime(0.0001, at);
  master.gain.exponentialRampToValueAtTime(0.35 * volume, at + 0.01);
  master.gain.exponentialRampToValueAtTime(0.0001, at + 1.6);
  master.connect(c.destination);
  for (const [ratio, gain] of PARTIALS) {
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 880 * ratio;
    const g = c.createGain();
    g.gain.value = gain;
    osc.connect(g);
    g.connect(master);
    osc.start(at);
    osc.stop(at + 1.7);
  }
}

/** "Ding-ding": dos campanadas, la segunda más suave. */
export function playBell() {
  const c = audio();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  const now = c.currentTime;
  strike(c, now, 1);
  strike(c, now + 0.3, 0.6);
}

/** Curva de saturación: aplasta los picos y da el "crack" agresivo de un disparo real. */
function distortionCurve(amount: number) {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }
  return curve;
}

function noiseBuffer(c: AudioContext, seconds: number, decayPower: number) {
  const length = Math.floor(c.sampleRate * seconds);
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decayPower);
  return buffer;
}

/**
 * Disparo realista en capas: chasquido seco y saturado, cuerpo medio, estampido grave,
 * y el eco de la sala. Todo pasa por un compresor para que golpee fuerte sin saturar los altavoces.
 */
export function playGunshot() {
  const c = audio();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  const t = c.currentTime;

  const out = c.createDynamicsCompressor();
  out.threshold.value = -18;
  out.knee.value = 6;
  out.ratio.value = 12;
  out.attack.value = 0.001;
  out.release.value = 0.15;
  const master = c.createGain();
  master.gain.value = 1.3;
  out.connect(master);
  master.connect(c.destination);

  // Eco de la sala: impulso de ruido que se apaga en ~1,4 s.
  const room = c.createConvolver();
  room.buffer = noiseBuffer(c, 1.4, 2.5);
  const roomGain = c.createGain();
  roomGain.gain.value = 0.35;
  room.connect(roomGain);
  roomGain.connect(out);

  const burst = (seconds: number, decay: number, filterType: BiquadFilterType, freq: number, gain: number, drive: number, wet: number) => {
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, seconds, decay);
    const f = c.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    const shaper = c.createWaveShaper();
    shaper.curve = distortionCurve(drive);
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + seconds);
    src.connect(f);
    f.connect(shaper);
    shaper.connect(g);
    g.connect(out);
    if (wet > 0) {
      const w = c.createGain();
      w.gain.value = wet;
      g.connect(w);
      w.connect(room);
    }
    src.start(t);
  };

  burst(0.05, 1.2, 'highpass', 1800, 1, 80, 0.5); // crack: lo más seco y agudo
  burst(0.18, 2, 'bandpass', 1400, 0.9, 40, 0.6); // cuerpo del estampido
  burst(0.7, 3, 'lowpass', 700, 0.7, 10, 1); // rugido que se aleja

  // Estampido grave: sube de golpe y cae.
  const boom = c.createOscillator();
  boom.type = 'sine';
  boom.frequency.setValueAtTime(150, t);
  boom.frequency.exponentialRampToValueAtTime(32, t + 0.3);
  const boomShaper = c.createWaveShaper();
  boomShaper.curve = distortionCurve(6);
  const boomGain = c.createGain();
  boomGain.gain.setValueAtTime(1, t);
  boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  boom.connect(boomShaper);
  boomShaper.connect(boomGain);
  boomGain.connect(out);
  boom.start(t);
  boom.stop(t + 0.45);

  // Zumbido agudo breve (el "ping" del oído tras el disparo).
  const ring = c.createOscillator();
  ring.type = 'sine';
  ring.frequency.value = 3200;
  const ringGain = c.createGain();
  ringGain.gain.setValueAtTime(0.0001, t + 0.05);
  ringGain.gain.exponentialRampToValueAtTime(0.06, t + 0.08);
  ringGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
  ring.connect(ringGain);
  ringGain.connect(out);
  ring.start(t + 0.05);
  ring.stop(t + 0.95);
}

/** Golpecito corto de ruido filtrado: un dado chocando con la mesa. */
function tap(c: AudioContext, at: number, volume: number, freq: number) {
  const length = Math.floor(c.sampleRate * 0.04);
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const band = c.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = freq;
  band.Q.value = 2.5;
  const gain = c.createGain();
  gain.gain.value = volume;
  src.connect(band);
  band.connect(gain);
  gain.connect(c.destination);
  src.start(at);
}

/** Dado rodando: varios golpecitos que se van frenando y uno final más seco al caer. */
export function playDiceRoll() {
  const c = audio();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  const now = c.currentTime;
  let t = 0;
  for (let i = 0; i < 9; i++) {
    tap(c, now + t, 0.35 + Math.random() * 0.25, 2200 + Math.random() * 1600);
    t += 0.06 + i * 0.014;
  }
  tap(c, now + 1.05, 0.9, 900);
}
