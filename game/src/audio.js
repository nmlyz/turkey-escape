// All sound is synthesised with WebAudio: no audio files are shipped, so the game loads
// nothing over the network. The context is created on the first user gesture; every call
// is a no-op until then, or while muted (M toggles).
export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context) return context;
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return null;
      context = new AC();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, dur, type, gain, slideTo) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + dur);
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(amp).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  function noise(dur, gain, lowpass) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const now = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(filter).connect(amp).connect(ctx.destination);
    src.start(now);
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },
    /** The turkey's gobble: three quick descending clucks. */
    gobble() {
      tone(520, 0.09, 'square', 0.12, 300);
      setTimeout(() => tone(480, 0.09, 'square', 0.12, 280), 110);
      setTimeout(() => tone(560, 0.14, 'square', 0.14, 260), 220);
    },
    pickup() { tone(880, 0.08, 'sine', 0.12, 1320); },
    feather() { tone(660, 0.1, 'sine', 0.14, 990); setTimeout(() => tone(990, 0.14, 'sine', 0.14, 1480), 90); },
    /** The farmer spots the turkey: a short rising sting. */
    alert() { tone(220, 0.16, 'sawtooth', 0.14, 440); setTimeout(() => tone(440, 0.2, 'sawtooth', 0.1, 660), 120); },
    hit() { noise(0.18, 0.25, 900); tone(140, 0.2, 'sawtooth', 0.16, 60); },
    throwKnife() { noise(0.12, 0.1, 2400); },
    hide() { tone(300, 0.12, 'sine', 0.1, 180); },
    trick() { tone(740, 0.1, 'triangle', 0.14, 980); setTimeout(() => tone(980, 0.12, 'triangle', 0.12, 1240), 100); },
    burn() { noise(0.25, 0.12, 1600); },
    jump() { tone(300, 0.1, 'sine', 0.06, 520); },
    /** Escape fanfare: a rising major arpeggio. */
    win() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.28, 'triangle', 0.16), i * 130));
    },
    /** Caught: a falling minor phrase. */
    lose() {
      [392, 370, 311, 233].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sawtooth', 0.1), i * 160));
    },
  };
}
