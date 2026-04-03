export class AudioManager {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.noiseBuffer = null;
  }

  async init() {
    if (typeof window === "undefined" || (!window.AudioContext && !window.webkitAudioContext)) {
      return;
    }

    if (!this.context) {
      const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext;
      this.context = new AudioContextCtor();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.16;
      this.masterGain.connect(this.context.destination);
      this.noiseBuffer = this.createNoiseBuffer(0.6);
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  createNoiseBuffer(durationSeconds) {
    const length = Math.max(1, Math.floor(this.context.sampleRate * durationSeconds));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  canPlay() {
    return this.context && this.masterGain && this.context.state === "running";
  }

  playTone(freq, durationMs, options = {}) {
    if (!this.canPlay()) {
      return;
    }

    const now = this.context.currentTime + (options.delay ?? 0);
    const duration = durationMs / 1000;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();

    oscillator.type = options.type ?? "square";
    oscillator.frequency.setValueAtTime(freq, now);

    if (options.sweepTo) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, options.sweepTo), now + duration);
    }

    filter.type = options.filterType ?? "lowpass";
    filter.frequency.value = options.filterFreq ?? 2600;

    const peak = options.volume ?? 0.18;
    const attack = Math.max(0.001, options.attack ?? 0.002);
    const release = Math.max(0.01, options.release ?? duration * 0.9);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + release);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
    oscillator.onended = () => {
      oscillator.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  playNoise(durationMs, options = {}) {
    if (!this.canPlay() || !this.noiseBuffer) {
      return;
    }

    const now = this.context.currentTime + (options.delay ?? 0);
    const duration = durationMs / 1000;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();

    source.buffer = this.noiseBuffer;
    filter.type = options.filterType ?? "bandpass";
    filter.frequency.value = options.filterFreq ?? 1200;
    filter.Q.value = options.q ?? 0.9;

    const peak = options.volume ?? 0.12;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
    source.stop(now + duration + 0.02);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  playChord(frequencies, durationMs, options = {}) {
    frequencies.forEach((freq, index) => {
      this.playTone(freq, durationMs, {
        type: options.type ?? "sine",
        volume: (options.volume ?? 0.08) / Math.max(1, frequencies.length / 2),
        delay: (options.spread ?? 0) * index,
        attack: options.attack ?? 0.01,
        release: options.release ?? durationMs / 1000,
        filterFreq: options.filterFreq ?? 2400,
      });
    });
  }

  playPunch() {
    this.playTone(800, 50, { type: "square", volume: 0.14, filterFreq: 2600, release: 0.04 });
    this.playNoise(50, { volume: 0.06, filterFreq: 2200 });
  }

  playHeavyHit() {
    this.playTone(200, 80, { type: "sawtooth", volume: 0.18, filterFreq: 900, release: 0.08 });
    this.playNoise(90, { volume: 0.08, filterFreq: 520 });
  }

  playUppercut() {
    this.playTone(200, 100, {
      type: "square",
      volume: 0.16,
      filterFreq: 2000,
      sweepTo: 800,
      release: 0.1,
    });
  }

  playEnemyHit() {
    this.playTone(420, 30, { type: "triangle", volume: 0.08, filterFreq: 1800, release: 0.03 });
  }

  playCombo(combo = 2) {
    const pitch = Math.min(1200, 520 + combo * 40);
    this.playTone(pitch, 70, { type: "triangle", volume: 0.12, filterFreq: 3200, release: 0.07 });
    this.playTone(pitch * 1.25, 45, { type: "sine", volume: 0.06, delay: 0.012, release: 0.05 });
  }

  playRageActivate() {
    this.playTone(90, 500, {
      type: "sawtooth",
      volume: 0.14,
      filterFreq: 720,
      sweepTo: 240,
      attack: 0.01,
      release: 0.48,
    });
    this.playNoise(180, { volume: 0.06, filterFreq: 320 });
  }

  playBossEntrance() {
    [0, 0.12, 0.24].forEach((delay, index) => {
      this.playTone(110 - index * 10, 140, {
        type: "square",
        volume: 0.14,
        delay,
        filterFreq: 680,
        release: 0.12,
      });
      this.playNoise(70, { volume: 0.04, filterFreq: 280, delay });
    });
  }

  playBossPhaseShift(phase = 2) {
    const root = phase >= 3 ? 82 : 98;
    [0, 0.08, 0.16, 0.28].forEach((delay, index) => {
      this.playTone(root + index * 24, 220 + index * 40, {
        type: phase >= 3 ? "sawtooth" : "square",
        volume: 0.14,
        delay,
        filterFreq: phase >= 3 ? 1200 : 900,
        release: 0.22 + index * 0.05,
      });
    });
    this.playNoise(260, { volume: 0.07, filterFreq: phase >= 3 ? 480 : 320, delay: 0.06 });
  }

  playKillSting(kind = "minion") {
    if (kind === "bodyguard") {
      this.playTone(160, 150, { type: "sawtooth", volume: 0.16, filterFreq: 700, release: 0.14 });
      this.playNoise(120, { volume: 0.06, filterFreq: 450 });
      return;
    }

    if (kind === "boss") {
      this.playChord([147, 196, 247], 360, {
        type: "square",
        volume: 0.12,
        release: 0.3,
        spread: 0.03,
        filterFreq: 1100,
      });
      this.playNoise(180, { volume: 0.08, filterFreq: 380 });
      return;
    }

    this.playTone(620, 90, { type: "triangle", volume: 0.12, filterFreq: 2400, release: 0.08 });
    this.playTone(930, 80, { type: "sine", volume: 0.07, delay: 0.02, release: 0.08 });
  }

  playArmorHit() {
    this.playTone(120, 90, { type: "square", volume: 0.11, filterFreq: 600, release: 0.08 });
    this.playNoise(70, { volume: 0.05, filterFreq: 900 });
  }

  playDeath() {
    this.playTone(420, 200, {
      type: "sawtooth",
      volume: 0.12,
      filterFreq: 1200,
      sweepTo: 90,
      release: 0.18,
    });
    this.playNoise(160, { volume: 0.05, filterFreq: 420 });
  }

  playPickup() {
    this.playTone(640, 90, { type: "triangle", volume: 0.08, filterFreq: 2600, sweepTo: 960, release: 0.09 });
    this.playTone(920, 90, { type: "sine", volume: 0.06, delay: 0.04, release: 0.09 });
  }

  playGameOver() {
    this.playChord([392, 311, 247], 500, {
      type: "triangle",
      volume: 0.12,
      release: 0.48,
      spread: 0.02,
      filterFreq: 1200,
    });
  }

  playVictory() {
    this.playChord([262, 330, 392], 600, {
      type: "triangle",
      volume: 0.12,
      release: 0.58,
      spread: 0.01,
      filterFreq: 2200,
    });
    this.playChord([392, 523, 659], 1000, {
      type: "sine",
      volume: 0.08,
      release: 0.96,
      spread: 0.015,
      filterFreq: 3200,
    });
  }

  playMenuSelect() {
    this.playTone(920, 50, { type: "triangle", volume: 0.08, filterFreq: 3400, release: 0.05 });
  }
}
