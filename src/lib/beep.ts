/**
 * Plays a short beep using Web Audio API — no audio files needed.
 * @param frequency Hz (default 880 = high beep)
 * @param duration  ms (default 120)
 * @param type      oscillator wave type
 */
export function beep(
  frequency = 880,
  duration = 120,
  type: OscillatorType = 'sine'
): void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.connect(gain)
    gain.connect(ctx.destination)

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

    // Fade out to avoid click noise
    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration / 1000)

    // Clean up context after sound plays
    oscillator.onended = () => ctx.close()
  } catch {
    // Silently fail if AudioContext not supported
  }
}

/** Double-beep for success */
export function beepSuccess(): void {
  beep(880, 100)
  setTimeout(() => beep(1100, 120), 120)
}

/** Low beep for already-registered / already-recorded */
export function beepWarning(): void {
  beep(440, 200, 'square')
}

/** Error buzz */
export function beepError(): void {
  beep(200, 300, 'sawtooth')
}
