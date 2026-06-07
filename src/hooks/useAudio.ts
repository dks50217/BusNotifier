import { useCallback, useRef } from 'react'

export function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null)

  function getCtx(): AudioContext {
    if (!ctxRef.current) ctxRef.current = new AudioContext()
    return ctxRef.current
  }

  // Short two-tone chime — no external file needed.
  const playAlert = useCallback(() => {
    try {
      const ctx = getCtx()
      const now = ctx.currentTime

      const freqs = [880, 1100]
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.type = 'sine'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.4, now + i * 0.18)
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.3)

        osc.start(now + i * 0.18)
        osc.stop(now + i * 0.18 + 0.35)
      })
    } catch {
      // Silently ignore — audio is a nice-to-have.
    }
  }, [])

  return { playAlert }
}
