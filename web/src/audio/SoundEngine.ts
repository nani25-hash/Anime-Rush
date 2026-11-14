export class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean;
  private coinCombo = 0;
  private lastCoinAt = 0;

  constructor(initialMuted: boolean) {
    this.muted = initialMuted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public unlock(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume();
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
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public playStart(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Deep taiko pulse + ascending chime
    this.tone(ctx, 110, 52, 0.24, 'sine', 0.28, now);
    this.tone(ctx, 523.25, 523.25, 0.14, 'triangle', 0.12, now + 0.04);
    this.tone(ctx, 659.25, 659.25, 0.18, 'triangle', 0.12, now + 0.11);
    this.tone(ctx, 783.99, 1046.5, 0.24, 'sine', 0.14, now + 0.18);
  }

  public playLaneSwitch(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, 320, 520, 0.075, 'sine', 0.09, now);
  }

  public playJump(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, 240, 620, 0.16, 'triangle', 0.13, now);
    this.tone(ctx, 480, 880, 0.12, 'sine', 0.06, now + 0.02);
  }

  public playSlide(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, 420, 145, 0.16, 'sawtooth', 0.065, now);
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

    // Japanese pentatonic steps (C5, D5, E5, G5, A5, C6, D6, E6)
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
    const freq = scale[this.coinCombo] ?? 1046.5;
    this.tone(ctx, freq, freq * 1.015, 0.11, 'sine', 0.13, now);
    this.tone(ctx, freq * 1.5, freq * 1.5, 0.09, 'triangle', 0.05, now + 0.025);
  }

  public playCrash(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, 160, 38, 0.34, 'sawtooth', 0.22, now);
    this.tone(ctx, 95, 32, 0.38, 'sine', 0.28, now);
    this.noiseBurst(ctx, 0.22, 0.16, now);
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
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private noiseBurst(ctx: AudioContext, duration: number, peakGain: number, startTime: number): void {
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
    gain.connect(ctx.destination);
    source.start(startTime);
  }

  public dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
