import { useContext, useEffect, useState } from 'react'
import { t } from '../../i18n/t'
import { AppUiContext } from '../appUi'
import { runHistory } from '../../editor/historyActions'
import { currentRunner } from '../tools/toolRuntime'
import { readFromPoint } from './aloudController'
import { firstWord, highlightDomSelection, lookUpUrl } from './readingHighlight'

/**
 * While reading, selecting words shows a small bar with Highlight, Look up
 * and Read from here. Highlight saves the normal yellow highlight mark in
 * the page without switching to editing, and offers Undo.
 */

interface Shown {
  x: number
  y: number
  text: string
}

function selectionInside(root: HTMLElement): Shown | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null
  const range = sel.getRangeAt(0)
  if (!root.contains(range.commonAncestorContainer)) return null
  const text = sel.toString().trim()
  if (!text) return null
  const rect = range.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return null
  const x = Math.min(
    window.innerWidth - 150,
    Math.max(150, rect.left + rect.width / 2),
  )
  const y = Math.max(8, Math.min(window.innerHeight - 70, rect.bottom + 14))
  return { x, y, text }
}

export function ReadingSelection({ root }: { root: HTMLElement | null }) {
  const { toast } = useContext(AppUiContext)
  const [shown, setShown] = useState<Shown | null>(null)

  useEffect(() => {
    if (!root) return
    const update = () => setShown(selectionInside(root))
    document.addEventListener('selectionchange', update)
    return () => document.removeEventListener('selectionchange', update)
  }, [root])

  if (!shown || !root) return null

  const clear = () => {
    window.getSelection()?.removeAllRanges()
    setShown(null)
  }
  const highlight = () => {
    const ok = highlightDomSelection()
    clear()
    if (!ok) return
    toast(t('reading.highlighted'), {
      label: t('mode.undo'),
      onSelect: () => {
        const ed = currentRunner().editor
        if (ed) runHistory(ed as never, 'undo')
      },
    })
  }
  const lookUp = () => {
    const word = firstWord(shown.text)
    clear()
    if (word) {
      window.open(
        lookUpUrl(word, document.documentElement.lang || 'en'),
        '_blank',
        'noopener,noreferrer',
      )
    }
  }
  const readFrom = () => {
    const sel = window.getSelection()
    const rect = sel?.rangeCount ? sel.getRangeAt(0).getClientRects()[0] : null
    clear()
    if (rect) readFromPoint(root, rect.left + 1, rect.top + rect.height / 2)
  }

  const button =
    'min-h-11 min-w-11 rounded-lg px-3 text-sm text-ink hover:bg-hover'
  return (
    <div
      role="toolbar"
      aria-label={t('reading.selectionBar')}
      data-testid="reading-selection-bar"
      style={{ left: shown.x, top: shown.y }}
      className="fixed z-[80] flex -translate-x-1/2 gap-0.5 rounded-xl border border-line bg-bg p-1 shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button type="button" className={button} onClick={highlight}>
        {t('reading.highlight')}
      </button>
      <button type="button" className={button} onClick={lookUp}>
        {t('reading.lookUp')}
      </button>
      <button type="button" className={button} onClick={readFrom}>
        {t('reading.readFromHere')}
      </button>
    </div>
  )
}
