/**
 * Lightweight Web Audio feedback for till operations.
 *
 * Tones are synthesised on demand so nothing has to be downloaded and there is
 * no playback latency between rapid scans. The AudioContext is created lazily
 * because browsers only allow it after a user gesture.
 */

export type ScanTone = "success" | "error" | "alert" | "action";

type ToneStep = { frequency: number; duration: number; gain: number; type: OscillatorType };

const profiles: Record<ScanTone, ToneStep[]> = {
  // Short, high, confident — item added.
  success: [{ frequency: 1180, duration: 0.09, gain: 0.16, type: "square" }],
  // Low harsh buzzer — not found / invalid.
  error: [
    { frequency: 190, duration: 0.16, gain: 0.2, type: "sawtooth" },
    { frequency: 140, duration: 0.22, gain: 0.2, type: "sawtooth" },
  ],
  // Two-tone chime — needs attention (price check, low stock, verification).
  alert: [
    { frequency: 880, duration: 0.1, gain: 0.14, type: "sine" },
    { frequency: 1320, duration: 0.14, gain: 0.14, type: "sine" },
  ],
  // Soft pop — quantity changed, line removed, mode switched.
  action: [{ frequency: 620, duration: 0.05, gain: 0.09, type: "triangle" }],
};

class AudioService {
  private context: AudioContext | null = null;
  private muted = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!this.context) this.context = new Ctor();
    if (this.context.state === "suspended") void this.context.resume();
    return this.context;
  }

  /** Call from any early user gesture so the very first beep is instant. */
  prime(): void {
    this.ensureContext();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  play(tone: ScanTone): void {
    if (this.muted) return;
    const context = this.ensureContext();
    if (!context) return;

    let at = context.currentTime;
    for (const step of profiles[tone]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = step.type;
      oscillator.frequency.setValueAtTime(step.frequency, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(step.gain, at + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + step.duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + step.duration + 0.02);
      at += step.duration;
    }
  }
}

export const audioService = new AudioService();

export const beep = {
  success: () => audioService.play("success"),
  error: () => audioService.play("error"),
  alert: () => audioService.play("alert"),
  action: () => audioService.play("action"),
};
