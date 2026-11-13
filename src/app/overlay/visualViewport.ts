import { useEffect, useState } from 'react'

export interface ViewportBox {
  /** Where the visible area starts / how tall it is; null = the whole window (no keyboard, no zoom). */
  box: { top: number; height: number } | null
  /** Height of the on-screen keyboard in px (0 when closed). */
  keyboard: number
}

const WHOLE: ViewportBox = { box: null, keyboard: 0 }

/**
 * What the person can see (S3-11, S3-23): follows the visual viewport, so a
 * full-screen part keeps its footer above the on-screen keyboard and the pill
 * stack rises with it. No raw listeners in parts.
 */
export function useVisualViewportBox(active = true): ViewportBox {
  const [state, setState] = useState<ViewportBox>(WHOLE)
  useEffect(() => {
    if (!active) return
    const vv = window.visualViewport
    if (!vv) return
    const sync = () => {
      const hidden = window.innerHeight - vv.height - vv.offsetTop
      const whole =
        Math.abs(vv.height - window.innerHeight) < 2 && vv.offsetTop < 1
      const next: ViewportBox = {
        box: whole ? null : { top: vv.offsetTop, height: vv.height },
        keyboard: hidden > 80 ? Math.round(hidden) : 0,
      }
      setState((p) =>
        p.keyboard === next.keyboard &&
        p.box?.top === next.box?.top &&
        p.box?.height === next.box?.height
          ? p
          : next,
      )
    }
    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
    }
  }, [active])
  return active ? state : WHOLE
}
