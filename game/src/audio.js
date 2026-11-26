// Langit Nusantara — synthesised sound. Every sound is made with the
// WebAudio API at run time: an engine hum tied to throttle, wind noise
// tied to airspeed, a ring chime, a touchdown thud and a warning beep.
// No audio files, no network, nothing to download.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let windSource = null;
  let windGain = null;
  let windFilter = null;
  let muted = false;
  let started = false;

  /** Must be called from a user gesture at least once (browser policy). */
  function ensure() {
    if (started) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      ctx = new AudioContext();
      started = true;
    } catch {
      ctx = null;
      return;
    }
    // Engine: two detuned sawtooth oscillators through a low-pass filter.
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    const engineOsc2 = ctx.createOscillator();
    engineOsc2.type = 'sawtooth';
    engineOsc2.frequency.value = 58;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    engineOsc.connect(engineFilter);
    engineOsc2.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(ctx.destination);
    engineOsc.start();
    engineOsc2.start();

    // Wind: looped white noise through a band-pass filter.
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    windSource = ctx.createBufferSource();
    windSource.buffer = buffer;
    windSource.loop = true;
    windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 600;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(ctx.destination);
    windSource.start();
  }

  /** Continuous engine + wind levels from throttle and airspeed. */
  function update(throttle, speed, maxSpeed) {
    if (!ctx || muted) {
      if (engineGain) engineGain.gain.value = 0;
      if (windGain) windGain.gain.value = 0;
      return;
    }
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    engineGain.gain.setTargetAtTime(0.05 + throttle * 0.09, t, 0.1);
    engineOsc.frequency.setTargetAtTime(48 + throttle * 70, t, 0.1);
    const windLevel = Math.max(0, speed / maxSpeed) * 0.12;
    windGain.gain.setTargetAtTime(windLevel, t, 0.2);
    windFilter.frequency.setTargetAtTime(400 + (speed / maxSpeed) * 900, t, 0.2);
  }

  function blip(frequency, duration, type, volume, when = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  /** Two-note chime when a delivery ring is collected. */
  function ringChime() {
    blip(880, 0.35, 'sine', 0.22);
    blip(1318, 0.5, 'sine', 0.18, 0.12);
  }

  /** Low thud on touchdown. */
  function touchdown() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.25);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  /** Short warning beep for damage or low fuel. */
  function warningBeep() {
    blip(660, 0.18, 'square', 0.12);
  }

  /** A soft crash rumble: falling noise burst. */
  function crashSound() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const length = ctx.sampleRate * 0.8;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(t);
  }

  function toggleMute() {
    muted = !muted;
    if (engineGain) engineGain.gain.value = 0;
    if (windGain) windGain.gain.value = 0;
    return muted;
  }

  return { ensure, update, ringChime, touchdown, warningBeep, crashSound, toggleMute };
}
