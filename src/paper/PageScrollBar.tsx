import { useEffect, useState } from 'react'
import { ScrollBar } from '../design/parts/ScrollBar'
import { useFlag } from '../app/flags'
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
 * With the new app frame off (foundation.shell) it keeps the old 24 px look.
 */
export function PageScrollBar({ sheetsKey }: { sheetsKey: number }) {
  const [el, setEl] = useState<HTMLElement | null>(null)
  const shell = useFlag('foundation.shell')
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
      legacy={!shell}
      labels={{
        up: t('paper.scroll.up'),
        down: t('paper.scroll.down'),
        bar: t('paper.scroll.bar'),
      }}
    />
  )
}
