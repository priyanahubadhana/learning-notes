import { IconButton } from '../../app/ui'
import { useState } from 'react'
import { HIGHLIGHT_COLOURS, type HighlightColour } from '../../core/types'
import { COLOUR_FILL, lookupUrl, type PopupRect } from './colours'
import { t } from '../../i18n/t'

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
}: {
  rect: PopupRect
  selected: string
  onColour: (c: HighlightColour) => void
  onNote: () => void
  /** Reader v2: a sticky note on these words. */
  onSticky?: () => void
  onCopy: () => void
  onPin: () => void
  onSaveTo: () => void
  onMakeCard?: () => void
  onVocab?: () => void
  /** Opens the Dictionary sheet (item 38). */
  onDefine?: () => void
  /** Ask AI about the words (only when AI is on). */
  onAsk?: () => void
}) {
  const [lookup, setLookup] = useState(false)
  // A selection scrolled out of view offers nothing.
  if (rect.y + rect.h < 0 || rect.y > window.innerHeight) return null
  const width = Math.min(window.innerWidth - 16, 440)
  const left = Math.min(
    Math.max(8, rect.x + rect.w / 2 - width / 2),
    window.innerWidth - width - 8,
  )
  // Above the selection when there is room, else below it.
  const above = rect.y > 120
  const top = above ? rect.y - 8 : rect.y + rect.h + 8
  const btn =
    'min-h-11 min-w-11 rounded-lg px-2 text-sm hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent'
  return (
    <div
      data-chrome
      role="toolbar"
      aria-label={t('annot.popup')}
      data-testid="selection-popup"
      className="fixed z-50 flex flex-wrap items-center gap-0.5 rounded-xl border border-line bg-bg p-1 shadow-lg"
      style={{
        insetInlineStart: left,
        top,
        width,
        transform: above ? 'translateY(-100%)' : undefined,
      }}
      // Keep the selection alive while a button is pressed.
      onPointerDown={(e) => e.preventDefault()}
      onMouseDown={(e) => e.preventDefault()}
    >
      {HIGHLIGHT_COLOURS.map((c) => (
        <IconButton
          tip="annot.highlightColour"
          bare
          tipClassName="inline-flex shrink-0"
          key={c}
          type="button"
          data-testid={`hl-${c}`}
          aria-label={t('annot.highlight', { colour: t(`annot.colour.${c}`) })}
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
      <button type="button" onClick={onNote} className={btn}>
        {t('annot.note')}
      </button>
      {onSticky && (
        <button
          type="button"
          data-testid="popup-sticky"
          onClick={onSticky}
          className={btn}
        >
          {t('readerv2.sticky.popup')}
        </button>
      )}
      <button type="button" onClick={onCopy} className={btn}>
        {t('annot.copy')}
      </button>
      {onDefine && (
        <button
          type="button"
          data-testid="popup-define"
          onClick={onDefine}
          className={btn}
        >
          {t('annot.define')}
        </button>
      )}
      <button
        type="button"
        aria-expanded={lookup}
        onClick={() => setLookup((v) => !v)}
        className={btn}
      >
        {t('annot.lookUp')}
      </button>
      <button type="button" onClick={onPin} className={btn}>
        {t('annot.pin')}
      </button>
      <button type="button" onClick={onSaveTo} className={btn}>
        {t('annot.saveTo')}
      </button>
      {onMakeCard && (
        <button
          type="button"
          data-testid="popup-make-card"
          onClick={onMakeCard}
          className={btn}
        >
          {t('annot.makeCard')}
        </button>
      )}
      {onAsk && (
        <button
          type="button"
          data-testid="popup-ask"
          onClick={onAsk}
          className={btn}
        >
          {t('annot.askAi')}
        </button>
      )}
      {lookup && (
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
