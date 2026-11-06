import { useEffect, useState } from 'react'
import type { Box } from './pillPlace'
import { measureRoom } from './pillRoom'

/** The room, kept up to date as bars, the keyboard and the window change. */
export function useRoom(): Box {
  const [room, setRoom] = useState<Box>(measureRoom)
  useEffect(() => {
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const next = measureRoom()
        setRoom((old) =>
          old.left === next.left &&
          old.top === next.top &&
          old.width === next.width &&
          old.height === next.height
            ? old
            : next,
        )
      })
    }
    update()
    const vv = window.visualViewport
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    // The page scrolling moves a bar that is not stuck yet.
    document.addEventListener('scroll', update, true)
    const watch = new ResizeObserver(update)
    document
      .querySelectorAll('main, [data-bar="docked"]')
      .forEach((el) => watch.observe(el))
    const styles = new MutationObserver(update)
    styles.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
    })
    return () => {
      cancelAnimationFrame(frame)
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      document.removeEventListener('scroll', update, true)
      watch.disconnect()
      styles.disconnect()
    }
  }, [])
  return room
}
