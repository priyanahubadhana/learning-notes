import { useState } from 'react'
import { t } from '../../../i18n/t'
import { pictureControl } from '../../../editor/pictureControl'
import { ScrollFade } from '../ScrollFade'
import {
  contextTabOn,
  selectionContext,
  type ContextKind,
} from './contextStore'
import { ribbonOpen } from '../toolbarState'
import { contextTabLabel, openFullOnContext, stripGroups } from './stripItems'

const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()

const BTN =
  'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl px-3 text-sm whitespace-nowrap text-ink hover:bg-hover aria-pressed:bg-hover aria-pressed:text-accent motion-safe:transition-colors'

/** The caption (and alt text) field of the Picture strip. */
function CaptionField() {
  const c = pictureControl.useValue()
  const [draft, setDraft] = useState<string | null>(null)
  if (!c) return null
  const commit = () => {
    if (draft !== null && draft !== c.caption) c.setCaption(draft)
    setDraft(null)
  }
  return (
    <input
      type="text"
      data-ctx-caption
      aria-label={t('pic.s.caption')}
      placeholder={t('pic.s.caption')}
      value={draft ?? c.caption}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      className="min-h-11 w-44 shrink-0 rounded-xl border border-line bg-bg px-3 text-sm text-ink"
    />
  )
}

/** The strip under the Picture / Video / Table / Drawing / Text tab. */
export function ContextStrip({ kind }: { kind: ContextKind }) {
  pictureControl.useValue() // redraw when the picture's state changes
  const groups = stripGroups(kind)
  return (
    <ScrollFade
      role="group"
      data-ctx-strip={kind}
      aria-label={contextTabLabel(kind)}
      className="flex items-stretch gap-1.5 pb-0.5"
    >
      {groups.map((group, i) => (
        <div
          key={i}
          className="flex shrink-0 gap-0.5 rounded-xl border border-line px-1 py-0.5"
        >
          {group.map((it) => (
            <button
              key={it.id}
              type="button"
              data-ctx-action={it.id}
              aria-pressed={it.pressed}
              onMouseDown={keepFocus}
              onClick={it.run}
              className={BTN}
            >
              {it.label}
            </button>
          ))}
        </div>
      ))}
      {kind === 'picture' && <CaptionField />}
    </ScrollFade>
  )
}

/**
 * The compact bar's contextual row: the first few actions of the strip and
 * "More", which opens the full tool bar on that tab.
 */
export function ContextBar({ up = false }: { up?: boolean }) {
  const kind = selectionContext.useValue()
  const full = ribbonOpen.useValue()
  const on = contextTabOn.useValue()
  pictureControl.useValue()
  // Words keep the mini toolbar; the full bar still has a Text tab.
  if (!kind || kind === 'text' || (full && on)) return null
  const top = stripGroups(kind)[0]?.slice(0, 3) ?? []
  return (
    <div
      role="group"
      data-ctx-bar={kind}
      aria-label={t('ctx.label')}
      className={`absolute inset-x-0 z-[var(--z-popup)] flex items-center gap-0.5 overflow-x-auto border-y border-line bg-bg px-1 ${up ? 'bottom-full' : 'top-full'}`}
    >
      <span className="shrink-0 ps-2 pe-1 text-xs font-semibold text-accent">
        {contextTabLabel(kind)}
      </span>
      {top.map((it) => (
        <button
          key={it.id}
          type="button"
          data-ctx-action={it.id}
          onMouseDown={keepFocus}
          onClick={it.run}
          className={BTN}
        >
          {it.label}
        </button>
      ))}
      <button
        type="button"
        data-ctx-more
        onMouseDown={keepFocus}
        onClick={openFullOnContext}
        className={`${BTN} ms-auto`}
      >
        {t('ctx.more')}
      </button>
    </div>
  )
}
