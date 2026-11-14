import { useEffect, useState } from 'react'
import { ScrollBar } from '../design/parts/ScrollBar'
import { t } from '../i18n/t'

/** Sheet tops with a little air above; the first one is the page start. */
function sheetTops(el: HTMLElement): number[] {
  const base = el.getBoundingClientRect().top - el.scrollTop
  return Array.from(el.querySelectorAll<HTMLElement>('[data-paper-sheet]')).map(
    (s, i) =>
      i === 0 ? 0 : Math.max(0, s.getBoundingClientRect().top - base - 16),
  )
}

/**
 * The page's scroll bar (item 7): the shared bar (design/parts/ScrollBar) with
 * an arrow tap that moves one sheet. `sheetsKey` re-binds it when the sheets change.
 */
export function PageScrollBar({ sheetsKey }: { sheetsKey: number }) {
  const [el, setEl] = useState<HTMLElement | null>(null)
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      setEl(document.querySelector<HTMLElement>('[data-page-scroller]')),
    )
    return () => cancelAnimationFrame(frame)
  }, [sheetsKey])
  return (
    <ScrollBar
      scroller={el}
      stops={sheetTops}
      attr="pagebar"
      labels={{
        up: t('paper.scroll.up'),
        down: t('paper.scroll.down'),
        bar: t('paper.scroll.bar'),
      }}
    />
  )
}
