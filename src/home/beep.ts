/**
 * A short two-note chime made in the browser (no sound file), used when a
 * Focus or break stretch ends while the app is open. Never needs permission
 * to notify; if the browser blocks sound, nothing happens.
 */
export function beep(): void {
  try {
    const Context =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!Context) return
    const context = new Context()
    const start = context.currentTime
    ;[660, 880].forEach((hz, i) => {
      const osc = context.createOscillator()
      const gain = context.createGain()
      osc.frequency.value = hz
      gain.gain.setValueAtTime(0.0001, start + i * 0.22)
      gain.gain.exponentialRampToValueAtTime(0.2, start + i * 0.22 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + i * 0.22 + 0.2)
      osc.connect(gain).connect(context.destination)
      osc.start(start + i * 0.22)
      osc.stop(start + i * 0.22 + 0.22)
    })
    setTimeout(() => void context.close(), 800)
  } catch {
    // Sound is a nicety; the screen already shows the change.
  }
}
