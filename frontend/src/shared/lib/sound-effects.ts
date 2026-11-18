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

/** Disparo: estallido de ruido que se apaga rápido más un golpe grave. */
export function playGunshot() {
  const c = audio();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  const t = c.currentTime;

  const length = Math.floor(c.sampleRate * 0.4);
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(5000, t);
  filter.frequency.exponentialRampToValueAtTime(300, t + 0.3);
  const noiseGain = c.createGain();
  noiseGain.gain.setValueAtTime(0.55, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(c.destination);
  noise.start(t);

  const thump = c.createOscillator();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(160, t);
  thump.frequency.exponentialRampToValueAtTime(40, t + 0.18);
  const thumpGain = c.createGain();
  thumpGain.gain.setValueAtTime(0.6, t);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  thump.connect(thumpGain);
  thumpGain.connect(c.destination);
  thump.start(t);
  thump.stop(t + 0.25);
}
