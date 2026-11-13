import { IconButton } from '../../app/ui'
import { useLayoutEffect, useRef, useState } from 'react'
import { HIGHLIGHT_COLOURS, type HighlightColour } from '../../core/types'
import { COLOUR_FILL, lookupUrl, type PopupRect } from './colours'
import { t } from '../../i18n/t'
import { Icon } from '../../app/tools/icons'

/**
 * The small bar over a text selection while reading (C4): five highlight
 * colours, Note, Copy, Look up, Pin and Save to…, plus anything the caller
 * adds (Make card). Every button is at least 44 px.
 */
export function SelectionPopup({
  rect,
  selected,
  onColour,
  onNote,
  onSticky,
  onCopy,
  onPin,
  onSaveTo,
  onMakeCard,
  onVocab,
  onDefine,
  onAsk,
  extras = true,
}: {
  rect: PopupRect
  selected: string
  onColour: (c: HighlightColour) => void
  onNote: () => void
  /** Reader v2: a sticky note on these words. */
  onSticky?: () => void
  onCopy: () => void
  onPin: () => void
  onSaveTo?: () => void
  onMakeCard?: () => void
  onVocab?: () => void
  /** Opens the Dictionary sheet (item 38). */
  onDefine?: () => void
  /** Ask AI about the words (only when AI is on). */
  onAsk?: () => void
  /** Look up, Save to…, Make card, Ask AI (reader v2: reader.selExtras, RD-P13). */
  extras?: boolean
}) {
  const [lookup, setLookup] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)
  // Measured before paint, so the first frame already sits in the right place.
  // Re-measured when the content changes (Look up opens a second row).
  useLayoutEffect(() => {
    setHeight(ref.current?.offsetHeight ?? 0)
  }, [lookup, extras, selected])
  // A selection scrolled out of view offers nothing.
  if (rect.y + rect.h < 0 || rect.y > window.innerHeight) return null
  const width = Math.min(window.innerWidth - 16, 440)
  const left = Math.min(
    Math.max(8, rect.x + rect.w / 2 - width / 2),
    window.innerWidth - width - 8,
  )
  // Above the selection only when the whole pop-up clears the reader bar and
  // the time-left line by 8 px; else below it. Always inside the window.
  const aboveTop = rect.y - 8 - height
  const above = height > 0 && aboveTop >= topChromeBottom() + 8
  const top = Math.max(
    8,
    Math.min(
      above ? aboveTop : rect.y + rect.h + 8,
      window.innerHeight - height - 8,
    ),
  )
  const btn =
    'min-h-11 min-w-11 rounded-lg px-2 text-sm hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent'
  const act =
    'flex min-h-11 min-w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-xs hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent'
  return (
    <div
      ref={ref}
      data-chrome
      data-place={above ? 'above' : 'below'}
      role="toolbar"
      aria-label={t('annot.popup')}
      data-testid="selection-popup"
      className="fixed z-50 flex flex-col rounded-xl border border-line bg-bg p-1 shadow-lg"
      style={{
        insetInlineStart: left,
        top,
        width,
      }}
      // Keep the selection alive while a button is pressed.
      onPointerDown={(e) => e.preventDefault()}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="h-track flex flex-nowrap items-center gap-0.5">
        {HIGHLIGHT_COLOURS.map((c) => (
          <IconButton
            tip="annot.highlightColour"
            bare
            tipClassName="inline-flex shrink-0"
            key={c}
            type="button"
            data-testid={`hl-${c}`}
            aria-label={t('annot.highlight', {
              colour: t(`annot.colour.${c}`),
            })}
            onClick={() => onColour(c)}
            className="flex size-11 items-center justify-center rounded-lg hover:bg-hover"
          >
            <span
              aria-hidden
              className="size-6 rounded-full border border-line"
              style={{ background: COLOUR_FILL[c] }}
            />
          </IconButton>
        ))}
        <button type="button" onClick={onNote} className={act}>
          <Icon name="penLine" />
          <span>{t('annot.note')}</span>
        </button>
        {onSticky && (
          <button
            type="button"
            data-testid="popup-sticky"
            onClick={onSticky}
            className={act}
          >
            <Icon name="clipboard" />
            <span>{t('readerv2.sticky.popup')}</span>
          </button>
        )}
        <button type="button" onClick={onCopy} className={act}>
          <Icon name="copy" />
          <span>{t('annot.copy')}</span>
        </button>
        {onDefine && (
          <button
            type="button"
            data-testid="popup-define"
            onClick={onDefine}
            className={act}
          >
            <Icon name="bookOpen" />
            <span>{t('annot.define')}</span>
          </button>
        )}
        {extras && (
          <button
            type="button"
            aria-expanded={lookup}
            onClick={() => setLookup((v) => !v)}
            className={act}
          >
            <Icon name="search" />
            <span>{t('annot.lookUp')}</span>
          </button>
        )}
        <button type="button" onClick={onPin} className={act}>
          <Icon name="bookmark" />
          <span>{t('annot.pin')}</span>
        </button>
        {extras && onSaveTo && (
          <button type="button" onClick={onSaveTo} className={act}>
            <Icon name="save" />
            <span>{t('annot.saveTo')}</span>
          </button>
        )}
        {extras && onMakeCard && (
          <button
            type="button"
            data-testid="popup-make-card"
            onClick={onMakeCard}
            className={act}
          >
            <Icon name="cards" />
            <span>{t('annot.makeCard')}</span>
          </button>
        )}
        {extras && onAsk && (
          <button
            type="button"
            data-testid="popup-ask"
            onClick={onAsk}
            className={act}
          >
            <Icon name="sparkles" />
            <span>{t('annot.askAi')}</span>
          </button>
        )}
      </div>
      {extras && lookup && (
        <div className="flex w-full flex-wrap items-center gap-1 border-t border-line pt-1">
          {(['dictionary', 'wikipedia', 'translate'] as const).map((k) => (
            <a
              key={k}
              href={lookupUrl(k, selected)}
              target="_blank"
              rel="noopener noreferrer"
              className={`${btn} inline-flex items-center`}
            >
              {t(`annot.lookup.${k}`)}
            </a>
          ))}
          {onVocab && (
            <button
              type="button"
              data-testid="popup-vocab"
              onClick={onVocab}
              className={`${btn} inline-flex items-center`}
            >
              {t('recall.vocabAdd')}
            </button>
          )}
          <span className="px-1 text-xs text-muted">
            {t('annot.lookup.note')}
          </span>
        </div>
      )}
    </div>
  )
}

/** Bottom edge of the reader bar and the time-left line (0 when none shows). */
function topChromeBottom(): number {
  let bottom = 0
  for (const el of document.querySelectorAll(
    '[data-testid="reader-bar"], [data-testid="reader-timeleft"]',
  )) {
    const r = el.getBoundingClientRect()
    if (r.height > 0 && r.bottom > 0 && r.top < window.innerHeight / 2)
      bottom = Math.max(bottom, r.bottom)
  }
  return bottom
}
