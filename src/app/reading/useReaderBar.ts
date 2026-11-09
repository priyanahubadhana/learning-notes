import { useEffect, useState } from 'react'
import { useDeviceSetting } from '../../settings/useSetting'
import {
  readingBarPinSetting,
  readingBarSetting,
} from '../../settings/readingSettings'
import { barStep, startBar, type BarState } from './barMode'

/**
 * Whether the bar shows, from how the reading scroller moves: hidden while
 * scrolling down, back after a small scroll up (10 px), a tap on the page, or
 * at the top. Pinned (per device) = always visible.
 */
export function useReaderBarVisible(
  scroller: HTMLElement | null,
  active: boolean,
): boolean {
  const [mode] = useDeviceSetting(readingBarSetting)
  const [pin] = useDeviceSetting(readingBarPinSetting)
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
    // A tap on the page shows the bar again.
    const onTap = (e: MouseEvent) => {
      // The bar and the small ✕ sit inside the page area: not a tap on the page.
      if ((e.target as Element | null)?.closest('[data-reader-chrome]')) return
      setState((s) =>
        s.visible ? s : { visible: true, anchor: scroller.scrollTop },
      )
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    scroller.addEventListener('click', onTap)
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      scroller.removeEventListener('click', onTap)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [active, scroller, mode])
  return mode === 'always' || pin === 'on' ? true : state.visible
}
