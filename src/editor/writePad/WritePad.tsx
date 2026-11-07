import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { ensureFont } from '../../app/reading/fonts'
import { Tip } from '../../help/Help'
import type { TipId } from '../../help/helpRegistry'
import { t, type MessageKey } from '../../i18n/t'
import { BACKGROUND_HEX, COLOR_NAMES, colorLabel, TEXT_HEX } from '../colorData'
import { applyPad, type PadLook } from './apply'
import { pickEngine } from './engine'
import {
  handCss,
  PAD_FONTS,
  PAD_SIZES,
  PAD_WEIGHTS,
  type HandLook,
} from './handStyle'
import { MIN_HEIGHT, PAD_ZOOMS, padPrefs, type PadPrefs } from './padPrefs'
import { currentRange, writePad } from './padState'

/**
 * The Write pad: a docked pad at the bottom of the page. It holds one large
 * plain textarea, so the iPad's Scribble turns Apple Pencil writing into
 * text there (no pointer handlers on it, or Scribble would break). A line
 * above shows what will be inserted; Insert puts it at the cursor, Replace
 * swaps it for the selected words (one Undo step each, see apply.ts). The
 * pad stays open after Insert. On a PC it is a normal text box.
 */

const MAX_FRACTION = 0.7

const lookOf = (p: PadPrefs) =>
  ({
    font: p.font,
    weight: p.weight,
    size: p.size,
    color: p.color,
    highlight: p.highlight,
  }) satisfies PadLook

function Seg<T extends string | number>({
  label,
  value,
  options,
  show,
  onPick,
}: {
  label: string
  value: T
  options: readonly T[]
  show: (v: T) => ReactNode
  onPick: (v: T) => void
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex shrink-0 items-center gap-1"
    >
      <span className="text-xs text-muted">{label}</span>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={o === value}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => onPick(o)}
          className={`min-h-9 min-w-9 rounded-lg border px-2 text-sm ${
            o === value
              ? 'border-accent bg-hover font-medium'
              : 'border-line hover:bg-hover'
          }`}
        >
          {show(o)}
        </button>
      ))}
    </div>
  )
}

function Swatches({
  label,
  value,
  hex,
  onPick,
}: {
  label: string
  value: string
  hex: Record<string, string>
  onPick: (name: string) => void
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex shrink-0 items-center gap-1"
    >
      <span className="text-xs text-muted">{label}</span>
      {COLOR_NAMES.map((name) => (
        <button
          key={name}
          type="button"
          aria-label={`${label}: ${colorLabel(name)}`}
          aria-pressed={name === value}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => onPick(name)}
          style={name === 'default' ? undefined : { background: hex[name] }}
          className={`grid size-9 place-items-center rounded-full border ${
            name === value ? 'border-2 border-accent' : 'border-line'
          } ${name === 'default' ? 'bg-bg text-xs text-muted' : ''}`}
        >
          {name === 'default' ? '×' : null}
        </button>
      ))}
    </div>
  )
}

function TipButton({
  tip,
  children,
  ...props
}: {
  tip: TipId
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  label?: string
  className?: string
  testId?: string
}) {
  return (
    <Tip id={tip} touchInfo={false}>
      <button
        type="button"
        data-testid={props.testId}
        aria-label={props.label}
        disabled={props.disabled}
        onPointerDown={(e) => e.preventDefault()}
        onClick={props.onClick}
        className={
          props.className ??
          'min-h-11 min-w-11 rounded-lg border border-line px-3 text-sm hover:bg-hover disabled:opacity-40'
        }
      >
        {children}
      </button>
    </Tip>
  )
}

export default function WritePad() {
  const session = writePad.useValue()
  const prefs = padPrefs.useValue()
  const [text, setText] = useState('')
  const box = useRef<HTMLTextAreaElement>(null)
  const engine = pickEngine()
  const drag = useRef<{ y: number; h: number } | null>(null)

  const look = lookOf(prefs)
  useEffect(() => {
    if (prefs.font !== 'app') void ensureFont(prefs.font)
  }, [prefs.font])

  // Leaving the page (or turning the pad off) ends the session.
  if (!session) return null
  const editor = session.editor
  const set = (patch: Partial<typeof prefs>) =>
    padPrefs.set({ ...prefs, ...patch })

  /** The editor selection to use: live if the page has focus, else the saved one. */
  const target = () => {
    const live = editor.domElement?.contains(document.activeElement)
    return live ? currentRange(editor) : { from: session.from, to: session.to }
  }

  const apply = (mode: 'insert' | 'replace') => {
    if (!editor.isEditable || text.trim() === '') return
    const end = applyPad(editor, text, look, mode, target())
    if (end === null) return
    writePad.set({ editor, from: end, to: end })
    setText('')
    box.current?.focus()
  }

  // Keys: act on the text box without taking its focus away.
  const edit = (key: 'space' | 'newLine' | 'delete') => {
    const el = box.current
    const start = el?.selectionStart ?? text.length
    const stop = el?.selectionEnd ?? text.length
    let caret = start
    if (key === 'delete') {
      const from = start === stop ? Math.max(0, start - 1) : start
      setText(text.slice(0, from) + text.slice(stop))
      caret = from
    } else {
      const add = key === 'space' ? ' ' : '\n'
      setText(text.slice(0, start) + add + text.slice(stop))
      caret = start + 1
    }
    requestAnimationFrame(() => el?.setSelectionRange(caret, caret))
  }

  const maxHeight = () => Math.round(window.innerHeight * MAX_FRACTION)
  const clamp = (h: number) => Math.max(MIN_HEIGHT, Math.min(maxHeight(), h))
  const height = clamp(prefs.height)
  const onGripDown = (e: ReactPointerEvent) => {
    e.preventDefault()
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      // Not a real pointer (a test).
    }
    drag.current = { y: e.clientY, h: height }
  }
  const onGripMove = (e: ReactPointerEvent) => {
    if (drag.current)
      set({ height: clamp(drag.current.h + drag.current.y - e.clientY) })
  }

  const zoomIndex = (PAD_ZOOMS as readonly number[]).indexOf(prefs.zoom)
  const zoom = (step: number) =>
    set({
      zoom: PAD_ZOOMS[
        Math.max(0, Math.min(PAD_ZOOMS.length - 1, zoomIndex + step))
      ],
    })

  const lookCss = handCss({ ...look, size: 100 } satisfies HandLook)
  const previewCss = {
    ...handCss(look),
    color: look.color === 'default' ? undefined : TEXT_HEX[look.color],
    background:
      look.highlight === 'default' ? undefined : BACKGROUND_HEX[look.highlight],
  }
  const previewText = text.replace(/\n/g, ' ↵ ')

  return createPortal(
    <section
      data-write-pad
      aria-label={t('writePad.title')}
      style={{ height }}
      className="fixed inset-x-0 bottom-0 z-[60] flex flex-col border-t border-line bg-bg shadow-[0_-8px_24px_rgba(0,0,0,0.12)]"
    >
      <Tip id="writePad.resize" touchInfo={false} className="flex w-full">
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label={t('writePad.resize')}
          aria-valuenow={height}
          aria-valuemin={MIN_HEIGHT}
          aria-valuemax={maxHeight()}
          tabIndex={0}
          data-write-pad-grip
          onPointerDown={onGripDown}
          onPointerMove={onGripMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') set({ height: clamp(height + 24) })
            if (e.key === 'ArrowDown') set({ height: clamp(height - 24) })
          }}
          className="flex h-6 w-full cursor-ns-resize touch-none items-center justify-center"
        >
          <span className="h-1 w-12 rounded-full bg-line" />
        </div>
      </Tip>

      <div className="flex items-center gap-2 px-3">
        <p className="min-w-0 flex-1 truncate text-xs text-muted">
          {engine.supported() ? t('writePad.title') : t(engine.missingHint)}
        </p>
        <TipButton
          tip="writePad.zoom"
          label={t('writePad.zoomOut')}
          disabled={zoomIndex <= 0}
          onClick={() => zoom(-1)}
        >
          A−
        </TipButton>
        <span className="w-10 text-center text-xs text-muted">
          {Math.round(prefs.zoom * 100)}%
        </span>
        <TipButton
          tip="writePad.zoom"
          label={t('writePad.zoomIn')}
          disabled={zoomIndex >= PAD_ZOOMS.length - 1}
          onClick={() => zoom(1)}
        >
          A+
        </TipButton>
        <TipButton
          tip="writePad.close"
          label={t('writePad.close')}
          testId="write-pad-close"
          onClick={() => writePad.set(null)}
        >
          ✕
        </TipButton>
      </div>

      <div
        data-write-pad-preview
        aria-live="polite"
        className="mx-3 mt-1 min-h-9 truncate rounded-lg bg-soft px-3 py-1 text-ink"
      >
        {text.trim() === '' ? (
          <span className="text-sm text-muted">
            {t('writePad.previewEmpty')}
          </span>
        ) : (
          <span style={previewCss}>{previewText}</span>
        )}
      </div>

      <textarea
        ref={box}
        data-write-pad-input
        aria-label={t('writePad.input')}
        placeholder={t('writePad.placeholder')}
        value={text}
        onChange={(e) => setText(e.target.value)}
        // Remember where the page's cursor was when the pad is tapped.
        onFocus={() => {
          const range = currentRange(editor)
          if (range.from !== session.from || range.to !== session.to) {
            writePad.set({ editor, ...range })
          }
        }}
        autoCapitalize="sentences"
        spellCheck={false}
        style={{
          ...lookCss,
          fontSize: `${22 * prefs.zoom}px`,
          lineHeight: 1.3,
        }}
        className="mx-3 my-2 min-h-0 flex-1 resize-none rounded-lg border border-line bg-bg p-3 text-ink"
      />

      <div className="flex items-center gap-3 overflow-x-auto px-3 pb-1">
        <Swatches
          label={t('writePad.color')}
          value={prefs.color}
          hex={TEXT_HEX}
          onPick={(color) => set({ color })}
        />
        <Swatches
          label={t('writePad.highlight')}
          value={prefs.highlight}
          hex={BACKGROUND_HEX}
          onPick={(highlight) => set({ highlight })}
        />
      </div>
      <div className="flex items-center gap-3 overflow-x-auto px-3 pb-1">
        <Seg
          label={t('writePad.size')}
          value={prefs.size}
          options={PAD_SIZES}
          show={(s) => `${s}%`}
          onPick={(size) => set({ size })}
        />
        <Seg
          label={t('writePad.font')}
          value={prefs.font}
          options={PAD_FONTS}
          show={(f) => t(`writePad.font.${f}` as MessageKey)}
          onPick={(font) => set({ font })}
        />
        <Seg
          label={t('writePad.weight')}
          value={prefs.weight}
          options={PAD_WEIGHTS}
          show={(w) => t(`writePad.weight.${w}` as MessageKey)}
          onPick={(weight) => set({ weight })}
        />
      </div>
      <div className="flex items-center gap-2 px-3 pb-3 pt-1">
        <TipButton
          tip="writePad.keys"
          label={t('writePad.space')}
          onClick={() => edit('space')}
        >
          ␣
        </TipButton>
        <TipButton
          tip="writePad.keys"
          label={t('writePad.newLine')}
          onClick={() => edit('newLine')}
        >
          ↵
        </TipButton>
        <TipButton
          tip="writePad.keys"
          label={t('writePad.delete')}
          onClick={() => edit('delete')}
        >
          ⌫
        </TipButton>
        <span className="flex-1" />
        <TipButton
          tip="writePad.replace"
          testId="write-pad-replace"
          disabled={text.trim() === '' || !editor.isEditable}
          onClick={() => apply('replace')}
        >
          {t('writePad.replace')}
        </TipButton>
        <TipButton
          tip="writePad.insert"
          testId="write-pad-insert"
          disabled={text.trim() === '' || !editor.isEditable}
          className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-40"
          onClick={() => apply('insert')}
        >
          {t('writePad.insert')}
        </TipButton>
      </div>
    </section>,
    document.body,
  )
}
