import { useEffect, useMemo, useRef, useState } from 'react'
import { t } from '../../i18n/t'
import { usePopup } from '../popups'
import { Icon } from '../tools/icons'
import { pageHeadings } from './readingOutline'
import {
  contentsDocked,
  currentHeadingId,
  DOCK_WIDTH,
  dockedNow,
  treeRows,
} from './contentsTree'
import type { ReadingPosition } from './useReadingPosition'

/**
 * Contents (B2): a navigation pane on the right with the page's headings as
 * a tree (H1 › H2 › H3, each branch folds). The heading you are reading is
 * highlighted. 📌 keeps it open and, on screens 1024 px wide or more, pushes
 * the text aside; on smaller screens it is an overlay.
 */

export function ContentsPane({
  scroller,
  position,
  onClose,
}: {
  scroller: HTMLElement | null
  position: ReadingPosition
  onClose: () => void
}) {
  const ref = useRef<HTMLElement>(null)
  const docked = contentsDocked.useValue()
  const pushes = dockedNow(docked)
  const headings = useMemo(() => pageHeadings(), [])
  const [folded, setFolded] = useState<Set<string>>(new Set())
  const [current, setCurrent] = useState<string | null>(null)

  // Overlay: the shared pop-up rule. Docked: stays until closed.
  usePopup(
    !pushes,
    onClose,
    (target) => ref.current?.contains(target) ?? false,
    { keepOnScroll: true },
  )

  // Text pushed aside while docked.
  useEffect(() => {
    if (!pushes) return
    document.documentElement.style.setProperty('--rd-dock', `${DOCK_WIDTH}px`)
    return () => {
      document.documentElement.style.removeProperty('--rd-dock')
    }
  }, [pushes])

  // The heading being read follows the scroll.
  useEffect(() => {
    let raf = 0
    const measure = () => {
      raf = 0
      const tops = new Map<string, number>()
      for (const h of headings) {
        const el = document.querySelector(
          `.bn-block-outer[data-id="${CSS.escape(h.id)}"]`,
        )
        if (el) tops.set(h.id, el.getBoundingClientRect().top)
      }
      const box = scroller?.getBoundingClientRect()
      const line = (box?.top ?? 0) + (box?.height ?? window.innerHeight) * 0.3
      setCurrent(currentHeadingId(headings, tops, line))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    measure()
    // Any scroller counts (a capture listener sees them all).
    document.addEventListener('scroll', onScroll, {
      capture: true,
      passive: true,
    })
    return () => {
      document.removeEventListener('scroll', onScroll, true)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [headings, scroller])

  const rows = treeRows(headings, folded)
  const toggleFold = (id: string) =>
    setFolded((old) => {
      const next = new Set(old)
      if (!next.delete(id)) next.add(id)
      return next
    })

  return (
    <aside
      ref={ref}
      data-chrome
      data-testid="reading-panel-contents"
      aria-label={t('reading.ctl.contents')}
      className="fixed inset-y-0 right-0 z-[39] flex w-[300px] max-w-[88vw] flex-col border-s border-line bg-bg pt-[calc(env(safe-area-inset-top)+3rem)] text-ink shadow-[-8px_0_24px_rgba(0,0,0,0.08)]"
    >
      <div className="flex items-center gap-1 px-3 pb-1">
        <h2 className="me-auto text-base font-semibold">
          {t('reading.ctl.contents')}
        </h2>
        <button
          type="button"
          data-chrome
          aria-pressed={docked}
          aria-label={t('reading.contents.dock')}
          title={t('reading.contents.dock')}
          onClick={() => contentsDocked.set(!docked)}
          className="grid size-11 place-items-center rounded-lg hover:bg-hover aria-pressed:text-accent"
        >
          <Icon name={docked ? 'pinOff' : 'pin'} />
        </button>
        <button
          type="button"
          data-chrome
          aria-label={t('popup.close')}
          title={t('popup.close')}
          onClick={onClose}
          className="grid size-11 place-items-center rounded-lg hover:bg-hover"
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-6">
        {headings.length === 0 ? (
          <p className="px-2 text-sm text-muted">{t('reading.outline.none')}</p>
        ) : (
          <ul role="tree" aria-label={t('reading.outline.headings')}>
            {rows.map(({ heading: h, hasChildren }) => (
              <li
                key={h.id}
                role="treeitem"
                aria-expanded={hasChildren ? !folded.has(h.id) : undefined}
                aria-current={current === h.id ? 'location' : undefined}
                className="flex items-center"
                style={{ paddingInlineStart: (h.level - 1) * 14 }}
              >
                {hasChildren ? (
                  <button
                    type="button"
                    data-chrome
                    aria-label={t(
                      folded.has(h.id)
                        ? 'reading.contents.unfold'
                        : 'reading.contents.fold',
                      { name: h.text },
                    )}
                    onClick={() => toggleFold(h.id)}
                    className="grid size-11 shrink-0 place-items-center rounded-lg text-muted hover:bg-hover"
                  >
                    {folded.has(h.id) ? '▸' : '▾'}
                  </button>
                ) : (
                  <span className="size-11 shrink-0" aria-hidden />
                )}
                <button
                  type="button"
                  data-chrome
                  data-heading={h.id}
                  onClick={() => {
                    position.goToBlock(h.id)
                    if (!dockedNow(contentsDocked.get())) onClose()
                  }}
                  className={`min-h-11 min-w-0 flex-1 rounded-lg px-2 text-start text-sm hover:bg-hover ${
                    current === h.id ? 'bg-hover font-semibold text-accent' : ''
                  }`}
                >
                  <span className="line-clamp-2">{h.text}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
