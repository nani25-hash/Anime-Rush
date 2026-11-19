const SFX_PATHS = {
  coin: './assets/audio/coin.mp3',
  jump: './assets/audio/jump.mp3',
  slide: './assets/audio/slide.mp3',
  dodge: './assets/audio/dodge.mp3',
  land: './assets/audio/land.mp3',
  bump: './assets/audio/bump.mp3',
  crash: './assets/audio/crash.mp3',
  powerup: './assets/audio/powerup.mp3',
  powerdown: './assets/audio/powerdown.mp3',
  trainPass: './assets/audio/train_pass.mp3',
  start: './assets/audio/start.mp3',
  chestOpen: './assets/audio/chest_open.mp3',
  uiTap: './assets/audio/ui_tap.mp3',
  uiCash: './assets/audio/ui_cash.mp3',
  unlock: './assets/audio/unlock.mp3',
  turbo: './assets/audio/turbo.mp3',
} as const;

type SfxKey = keyof typeof SFX_PATHS;

// Japanese Hirajoshi-inspired cyber-synthwave bass + lead motifs (Hz)
const BGM_BASS_PATTERN = [110, 110, 146.83, 130.81, 164.81, 164.83, 196.0, 146.83];
const BGM_ARP_PATTERN = [
  440, 523.25, 659.25, 880, 659.25, 587.33, 523.25, 659.25,
  440, 587.33, 783.99, 880, 1046.5, 880, 783.99, 659.25,
];

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private muted: boolean;
  private musicVolume = 0.55;
  private sfxVolume = 0.8;
  private coinCombo = 0;
  private lastCoinAt = 0;
  private readonly buffers = new Map<SfxKey, AudioBuffer>();
  private loadingStarted = false;

  private bgmActive = false;
  private bgmSpeedFactor = 1.0;
  private bgmCarMode = false;
  private bgmTimerId: number | null = null;
  private bgmStep = 0;

  constructor(initialMuted: boolean, initialMusicVol = 0.55, initialSfxVol = 0.8) {
    this.muted = initialMuted;
    this.musicVolume = initialMusicVol;
    this.sfxVolume = initialSfxVol;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyGainVolumes();
    if (muted) {
      this.stopBgmTimer();
    } else if (this.bgmActive) {
      this.ensureBgmTimer();
    }
  }

  public setMusicVolume(vol: number): void {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    this.applyGainVolumes();
  }

  public setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    this.applyGainVolumes();
  }

  public setBgmState(active: boolean, speedFactor = 1.0, carMode = false): void {
    this.bgmActive = active;
    this.bgmSpeedFactor = Math.max(1.0, Math.min(2.4, speedFactor));
    this.bgmCarMode = carMode;
    if (!active || this.muted || this.musicVolume <= 0.01) {
      this.stopBgmTimer();
      return;
    }
    this.ensureBgmTimer();
  }

  private applyGainVolumes(): void {
    const now = this.ctx?.currentTime ?? 0;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(
        this.muted ? 0 : this.musicVolume * 0.48,
        now,
        0.04,
      );
    }
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.muted ? 0 : this.sfxVolume, now, 0.03);
    }
  }

  public unlock(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume();
    }
    if (ctx && !this.loadingStarted) {
      this.loadingStarted = true;
      this.preloadAll(ctx);
    }
    if (this.bgmActive && this.musicVolume > 0.01) {
      this.ensureBgmTimer();
    }
  }

  private preloadAll(ctx: AudioContext): void {
    if (typeof fetch !== 'function') return;
    const entries = Object.entries(SFX_PATHS) as Array<[SfxKey, string]>;
    for (const [key, url] of entries) {
      void fetch(url)
        .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error('HTTP error'))))
        .then((buf) => ctx.decodeAudioData(buf))
        .then((decoded) => {
          this.buffers.set(key, decoded);
        })
        .catch(() => {
          // Keep silent synthesis fallback if audio decoding fails in headless/restricted modes
        });
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
      this.applyGainVolumes();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private ensureBgmTimer(): void {
    if (this.bgmTimerId !== null || typeof window === 'undefined') return;
    const scheduleNext = () => {
      this.bgmTimerId = null;
      if (!this.bgmActive || this.muted || this.musicVolume <= 0.01) return;
      this.triggerBgmStep();
      const baseMs = this.bgmCarMode ? 128 : 158;
      const intervalMs = Math.max(96, Math.round(baseMs / (0.85 + this.bgmSpeedFactor * 0.2)));
      this.bgmTimerId = window.setTimeout(scheduleNext, intervalMs);
    };
    this.bgmTimerId = window.setTimeout(scheduleNext, 60);
  }

  private stopBgmTimer(): void {
    if (this.bgmTimerId !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.bgmTimerId);
      this.bgmTimerId = null;
    }
  }

  private triggerBgmStep(): void {
    const ctx = this.ensureContext();
    const out = this.musicGain;
    if (!ctx || !out) return;

    const now = ctx.currentTime;
    const step = this.bgmStep++;
    const bassFreq = BGM_BASS_PATTERN[Math.floor(step / 2) % BGM_BASS_PATTERN.length];
    const arpFreq = BGM_ARP_PATTERN[step % BGM_ARP_PATTERN.length];

    // Driving synthwave pulse bass every 2 steps (or every step in car mode)
    if (step % 2 === 0 || this.bgmCarMode) {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(this.bgmCarMode ? bassFreq * 1.122 : bassFreq, now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(this.bgmCarMode ? 520 : 380, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.16);
    }

    // Crisp anime cyber-arp melody layer when moving fast or in turbo car
    if (this.bgmSpeedFactor >= 1.15 || this.bgmCarMode || step % 2 === 1) {
      const lead = ctx.createOscillator();
      const leadGain = ctx.createGain();
      lead.type = this.bgmCarMode ? 'square' : 'triangle';
      lead.frequency.setValueAtTime(arpFreq * (this.bgmCarMode ? 1.122 : 1.0), now);

      const peak = this.bgmCarMode ? 0.12 : 0.085;
      leadGain.gain.setValueAtTime(0.001, now);
      leadGain.gain.exponentialRampToValueAtTime(peak, now + 0.01);
      leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      lead.connect(leadGain);
      leadGain.connect(out);
      lead.start(now);
      lead.stop(now + 0.13);
    }
  }

  private playBuffer(key: SfxKey, volume = 0.5, playbackRate = 1.0): boolean {
    const ctx = this.ensureContext();
    const out = this.sfxGain;
    if (!ctx || !out || this.sfxVolume <= 0.01) return false;
    const buf = this.buffers.get(key);
    if (!buf) return false;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = playbackRate;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain);
    gain.connect(out);
    src.start(0);
    return true;
  }

  public playStart(): void {
    if (this.playBuffer('start', 0.55)) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, 110, 52, 0.24, 'sine', 0.28, now);
    this.tone(ctx, 523.25, 523.25, 0.14, 'triangle', 0.12, now + 0.04);
    this.tone(ctx, 659.25, 659.25, 0.18, 'triangle', 0.12, now + 0.11);
    this.tone(ctx, 783.99, 1046.5, 0.24, 'sine', 0.14, now + 0.18);
  }

  public playLaneSwitch(): void {
    if (this.playBuffer('dodge', 0.36)) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, 320, 520, 0.075, 'sine', 0.09, now);
  }

  public playJump(): void {
    if (this.playBuffer('jump', 0.45)) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, 240, 620, 0.16, 'triangle', 0.13, now);
    this.tone(ctx, 480, 880, 0.12, 'sine', 0.06, now + 0.02);
  }

  public playSlide(): void {
    if (this.playBuffer('slide', 0.44)) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, 420, 145, 0.16, 'sawtooth', 0.065, now);
  }

  public playLand(): void {
    this.playBuffer('land', 0.32);
  }

  public playCoin(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (now - this.lastCoinAt < 0.6) {
      this.coinCombo = Math.min(this.coinCombo + 1, 7);
    } else {
      this.coinCombo = 0;
    }
    this.lastCoinAt = now;

    if (this.playBuffer('coin', 0.36, 1 + this.coinCombo * 0.04)) return;

    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
    const freq = scale[this.coinCombo] ?? 1046.5;
    this.tone(ctx, freq, freq * 1.015, 0.11, 'sine', 0.13, now);
    this.tone(ctx, freq * 1.5, freq * 1.5, 0.09, 'triangle', 0.05, now + 0.025);
  }

  public playLetterCollect(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, 659.25, 987.77, 0.13, 'triangle', 0.16, now);
    this.tone(ctx, 987.77, 1318.51, 0.16, 'sine', 0.14, now + 0.05);
  }

  public playWordComplete(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((n, idx) => {
      this.tone(ctx, n, n * 1.01, 0.18, 'triangle', 0.15, now + idx * 0.065);
    });
  }

  public playRecordBreak(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, 587.33, 587.33, 0.12, 'triangle', 0.15, now);
    this.tone(ctx, 880.0, 1174.66, 0.24, 'sine', 0.18, now + 0.07);
    this.tone(ctx, 1174.66, 1567.98, 0.28, 'triangle', 0.15, now + 0.16);
  }

  public playGachaSpin(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [392, 493.88, 587.33, 783.99, 987.77].forEach((f, idx) => {
      this.tone(ctx, f, f * 1.04, 0.09, 'sine', 0.12, now + idx * 0.055);
    });
  }

  public playBump(): void {
    if (this.playBuffer('bump', 0.5)) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, 210, 88, 0.18, 'triangle', 0.22, now);
    this.noiseBurst(ctx, 0.1, 0.09, now);
  }

  public playCrash(): void {
    if (this.playBuffer('crash', 0.6)) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, 160, 38, 0.34, 'sawtooth', 0.22, now);
    this.tone(ctx, 95, 32, 0.38, 'sine', 0.28, now);
    this.noiseBurst(ctx, 0.22, 0.16, now);
  }

  public playPowerup(): void {
    if (this.playBuffer('powerup', 0.5)) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, 440, 880, 0.16, 'triangle', 0.14, now);
    this.tone(ctx, 660, 1320, 0.2, 'sine', 0.12, now + 0.06);
  }

  public playPowerdown(): void {
    if (this.playBuffer('powerdown', 0.42)) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, 620, 220, 0.22, 'triangle', 0.12, now);
  }

  public playCarTurbo(): void {
    if (this.playBuffer('turbo', 0.45)) return;
    this.playPowerup();
  }

  public playTrainPass(): void {
    this.playBuffer('trainPass', 0.36);
  }

  public playShieldBreak(): void {
    if (this.playBuffer('powerdown', 0.5)) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, 720, 260, 0.22, 'triangle', 0.16, now);
    this.noiseBurst(ctx, 0.12, 0.08, now);
  }

  public playChestOpen(): void {
    if (this.playBuffer('chestOpen', 0.55)) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, 523.25, 523.25, 0.12, 'triangle', 0.12, now);
    this.tone(ctx, 659.25, 659.25, 0.12, 'triangle', 0.12, now + 0.08);
    this.tone(ctx, 783.99, 1046.5, 0.28, 'sine', 0.16, now + 0.16);
  }

  public playUiTap(): void {
    if (this.playBuffer('uiTap', 0.42)) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, 620, 780, 0.055, 'sine', 0.06, now);
  }

  public playUiCash(): void {
    if (this.playBuffer('uiCash', 0.48)) return;
    this.playChestOpen();
  }

  public playUnlock(): void {
    if (this.playBuffer('unlock', 0.55)) return;
    this.playChestOpen();
  }

  public playNearMiss(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, 560, 1120, 0.09, 'sine', 0.1, now);
    this.tone(ctx, 880, 1320, 0.08, 'triangle', 0.06, now + 0.03);
  }

  public playRevive(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, 523.25, 659.25, 0.14, 'triangle', 0.14, now);
    this.tone(ctx, 659.25, 783.99, 0.14, 'triangle', 0.14, now + 0.08);
    this.tone(ctx, 783.99, 1046.5, 0.24, 'sine', 0.16, now + 0.16);
  }

  public playUpgrade(): void {
    if (this.playBuffer('unlock', 0.45, 1.12)) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, 440, 660, 0.1, 'triangle', 0.12, now);
    this.tone(ctx, 660, 990, 0.14, 'sine', 0.12, now + 0.06);
  }

  private tone(
    ctx: AudioContext,
    startFreq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType,
    peakGain: number,
    startTime: number,
  ): void {
    const out = this.sfxGain;
    if (!out || this.sfxVolume <= 0.01) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(out);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private noiseBurst(ctx: AudioContext, duration: number, peakGain: number, startTime: number): void {
    const out = this.sfxGain;
    if (!out || this.sfxVolume <= 0.01) return;
    const sampleCount = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peakGain, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    source.start(startTime);
  }

  public dispose(): void {
    this.stopBgmTimer();
    this.buffers.clear();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
