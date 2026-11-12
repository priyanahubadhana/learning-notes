import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { openInTopLayer } from '../../app/overlay'
import { ContextStrip, type StripItem } from '../../design/parts/ContextStrip'
import { placeStrip } from '../../design/parts/contextStripPlace'

/**
 * The strip on a search result. It lives in the browser top layer (so no
 * list, scroller or chip row can cut it off) but stays a child of the search
 * dialog, because a modal dialog blocks everything outside itself. Placed
 * above the row, else below, else beside it, always 12 px inside the screen.
 */
export function ResultStrip({
  row,
  items,
  onAction,
  onClose,
}: {
  row: HTMLElement
  items: StripItem[]
  onAction: (id: string) => void
  onClose: () => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    closeRef.current = onClose
  })

  useLayoutEffect(() => {
    const el = host.current
    if (!el) return
    const handle = openInTopLayer(el, {
      id: 'srv2-strip',
      layer: 'menu',
      opener: row,
      onClose: () => closeRef.current(),
    })
    return () => handle.close()
  }, [row])

  useLayoutEffect(() => {
    const el = host.current
    if (!el) return
    const run = () => {
      const r = row.getBoundingClientRect()
      const p = placeStrip(
        { left: r.left, top: r.top, width: r.width, height: r.height },
        { width: el.offsetWidth, height: el.offsetHeight },
        {
          width: document.documentElement.clientWidth || window.innerWidth,
          height: window.innerHeight,
        },
      )
      setPos((prev) =>
        prev && prev.left === p.left && prev.top === p.top
          ? prev
          : { left: p.left, top: p.top },
      )
    }
    run()
    const ro = new ResizeObserver(run)
    ro.observe(el)
    ro.observe(document.documentElement)
    return () => ro.disconnect()
  }, [row])

  const style: CSSProperties = {
    position: 'fixed',
    inset: 'auto',
    margin: 0,
    padding: 0,
    border: 0,
    background: 'transparent',
    overflow: 'visible',
    width: 'max-content',
    left: pos?.left ?? 0,
    top: pos?.top ?? 0,
    visibility: pos ? 'visible' : 'hidden',
  }

  return (
    <div ref={host} data-strip-host style={style}>
      <ContextStrip
        mode="inline"
        phone={window.innerWidth <= 640}
        items={items}
        allLevels
        phoneLabels
        testId="srv2-strip"
        onAction={onAction}
        onClose={onClose}
      />
    </div>
  )
}
