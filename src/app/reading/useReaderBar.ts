import { useEffect, useState } from 'react'
import { useDeviceSetting } from '../../settings/useSetting'
import { readingBarSetting } from '../../settings/readingSettings'
import { barStep, startBar, type BarState } from './barMode'

/** Whether the bar shows, from how the reading scroller moves. */
export function useReaderBarVisible(
  scroller: HTMLElement | null,
  active: boolean,
): boolean {
  const [mode] = useDeviceSetting(readingBarSetting)
  const [state, setState] = useState<BarState>(startBar)
  useEffect(() => {
    if (!active || !scroller) return
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        setState((s) => {
          const next = barStep(mode, s, scroller.scrollTop)
          return next.visible === s.visible && next.anchor === s.anchor
            ? s
            : next
        })
      })
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [active, scroller, mode])
  return mode === 'always' ? true : state.visible
}
