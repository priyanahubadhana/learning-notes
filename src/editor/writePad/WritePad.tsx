import {
  useEffect,
  useLayoutEffect,
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
import { AiCanvas } from './AiCanvas'
import { discardStrokes, hasUnreadStrokes } from './strokeKeep'
import { loadDraft, saveDraft } from './draft'
import { setGhost } from './ghost'
import { pickEngine } from './engine'
import {
  bindPadHistory,
  recordPadText,
  redoPad,
  resetPadHistory,
  undoPad,
} from './padHistory'
import {
  handCss,
  PAD_FONTS,
  PAD_SIZES,
  PAD_WEIGHTS,
  type HandLook,
  type PadWeight,
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

/**
 * How far the on-screen keyboard (or anything else) covers the bottom of the
 * window, so the pad can sit above it. The floating iPadOS shortcut bar is
 * not always reported here, so the action keys also live at the top of the
 * pad where nothing floats over them.
 */
function useKeyboardLift(): number {
  const [lift, setLift] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const read = () =>
      setLift(
        Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)),
      )
    read()
    vv.addEventListener('resize', read)
    vv.addEventListener('scroll', read)
    return () => {
      vv.removeEventListener('resize', read)
      vv.removeEventListener('scroll', read)
    }
  }, [])
  return lift
}

export default function WritePad() {
  const session = writePad.useValue()
  const prefs = padPrefs.useValue()
  const [text, setText] = useState('')
  const box = useRef<HTMLTextAreaElement>(null)
  const engine = pickEngine(prefs.engine)
  const ai = engine.id === 'ai'
  // What the AI engine read: words with a weight each (from pen pressure).
  const [pieces, setPieces] = useState<
    { text: string; weight: PadWeight }[] | null
  >(null)
  const [aiError, setAiError] = useState('')
  /** The mode the user asked for while unread canvas writing would be lost. */
  const [asking, setAsking] = useState<'scribble' | 'ai' | null>(null)
  /** The draft is loaded for this page: only then is it saved (R6-15). */
  const loadedFor = useRef<string | null>(null)
  const drag = useRef<{ y: number; h: number } | null>(null)
  const marks = useRef<HTMLDivElement>(null)
  /** Where the caret goes once the key's new text is in the box. */
  const pendingCaret = useRef<number | null>(null)
  useLayoutEffect(() => {
    const at = pendingCaret.current
    if (at === null) return
    pendingCaret.current = null
    box.current?.setSelectionRange(at, at)
  }, [text])

  const lift = useKeyboardLift()
  const look = lookOf(prefs)
  const open = !!session
  // The pad's own Undo history, used by the main bar's ↶ ↷ (padHistory.ts).
  useEffect(() => {
    if (!open) return
    bindPadHistory(setText)
    return () => bindPadHistory(null)
  }, [open])
  /** A change made by the user: typing, Scribble, a key. */
  const change = (next: string, ownStep = false) => {
    recordPadText(next, Date.now(), ownStep)
    setText(next)
  }
  useEffect(() => {
    if (prefs.font !== 'app') void ensureFont(prefs.font)
  }, [prefs.font])

  const pageKey = session?.pageId ?? 'none'
  // Pieces only count while they still spell the text (Undo can change it).
  const live =
    pieces && pieces.map((p) => p.text).join('') === text ? pieces : null

  // The unsent text is a per-page draft in localStorage: closing the pad,
  // another page or a reload never loses it (R6-15). Save first, then load,
  // so a page change cannot write the old text into the new page.
  useEffect(() => {
    if (open && loadedFor.current === pageKey) saveDraft(session?.pageId, text)
  }, [open, text, pageKey, session?.pageId])
  useEffect(() => {
    if (!open) {
      loadedFor.current = null
      return
    }
    if (loadedFor.current === pageKey) return
    const draft = loadDraft(session?.pageId)
    loadedFor.current = pageKey
    setPieces(null)
    setAsking(null)
    setText(draft)
    resetPadHistory(draft)
  }, [open, pageKey, session?.pageId])

  /** The editor selection to use: live if the page has focus, else the saved one. */
  const target = () => {
    if (!session) return { from: 0, to: 0 }
    const focused = session.editor.domElement?.contains(document.activeElement)
    return focused
      ? currentRange(session.editor)
      : { from: session.from, to: session.to }
  }

  const apply = (mode: 'insert' | 'replace') => {
    if (!session || !session.editor.isEditable || text.trim() === '') return
    const end = applyPad(session.editor, live ?? text, look, mode, target())
    setPieces(null)
    if (end === null) return
    writePad.set({ ...session, from: end, to: end })
    setText('')
    resetPadHistory('')
    saveDraft(session.pageId, '')
    box.current?.focus()
  }
  const applyNow = useRef(apply)
  useEffect(() => {
    applyNow.current = apply
  })

  // Live writing: the text shows at the page cursor as a ghost (not a
  // document change). Gone when the pad closes (R6-16).
  const ghostEditor = session?.editor
  const ghostFrom = session?.from
  const ghostTo = session?.to
  useEffect(() => {
    if (!ghostEditor) return
    if (text.trim() === '') {
      setGhost(ghostEditor, null)
      return
    }
    const r = target()
    setGhost(ghostEditor, {
      pos: r.from,
      pieces: live ?? [{ text, weight: look.weight }],
      look,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghostEditor, ghostFrom, ghostTo, text, pieces, prefs])
  useEffect(
    () => () => {
      if (ghostEditor) setGhost(ghostEditor, null)
    },
    [ghostEditor],
  )

  // "Insert automatically when I pause (2 s)", off by default.
  const auto = !!prefs.autoInsert
  useEffect(() => {
    if (!open || !auto || text.trim() === '') return
    const id = window.setTimeout(() => applyNow.current('insert'), 2000)
    return () => window.clearTimeout(id)
  }, [open, auto, text])

  // Leaving the page (or turning the pad off) ends the session.
  if (!session) return null
  const editor = session.editor
  const set = (patch: Partial<typeof prefs>) =>
    padPrefs.set({ ...prefs, ...patch })

  /** Switching mode keeps the text; only unread canvas writing needs asking. */
  const pickMode = (mode: 'scribble' | 'ai') => {
    if (mode === (ai ? 'ai' : 'scribble')) return
    if (ai && hasUnreadStrokes(session.pageId)) {
      setAsking(mode)
      return
    }
    setPieces(null)
    setAiError('')
    set({ engine: mode })
  }

  // Keys: act on the text box without taking its focus away.
  const edit = (key: 'space' | 'newLine' | 'delete') => {
    const el = box.current
    const start = el?.selectionStart ?? text.length
    const stop = el?.selectionEnd ?? text.length
    let caret: number
    if (key === 'delete') {
      const from = start === stop ? Math.max(0, start - 1) : start
      change(text.slice(0, from) + text.slice(stop), true)
      caret = from
    } else {
      const add = key === 'space' ? ' ' : '\n'
      change(text.slice(0, start) + add + text.slice(stop), true)
      caret = start + 1
    }
    // Focus the box so the caret and the new line show where they are.
    el?.focus({ preventScroll: true })
    pendingCaret.current = caret
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
      style={{ height, bottom: lift }}
      className="fixed inset-x-0 z-[60] flex flex-col overflow-y-auto border-t border-line bg-bg shadow-[0_-8px_24px_rgba(0,0,0,0.12)]"
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
          {ai || engine.supported()
            ? t('writePad.title')
            : t(engine.missingHint)}
        </p>
        <Tip id="writePad.engine" touchInfo={false}>
          <Seg
            label={t('writePad.engine')}
            value={ai ? 'ai' : 'scribble'}
            options={['scribble', 'ai'] as const}
            show={(e) => t(`writePad.engine.${e}`)}
            onPick={pickMode}
          />
        </Tip>
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
        data-write-pad-actions
        className="flex items-center gap-2 px-3 pb-1 pt-1"
      >
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
      <div
        data-write-pad-preview
        aria-live="polite"
        className="mx-3 mt-1 min-h-9 truncate rounded-lg bg-soft px-3 py-1 text-ink"
      >
        {aiError ? (
          <span role="alert" className="text-sm text-muted">
            {aiError}
          </span>
        ) : text.trim() === '' ? (
          <span className="text-sm text-muted">
            {t('writePad.previewEmpty')}
          </span>
        ) : live ? (
          <span data-write-pad-pieces>
            {live.map((piece, i) => (
              <span
                key={i}
                data-weight={piece.weight}
                style={{
                  ...previewCss,
                  ...handCss({ ...look, weight: piece.weight }),
                }}
              >
                {piece.text.replace(/\n/g, ' ↵ ')}
              </span>
            ))}
          </span>
        ) : (
          <span style={previewCss}>{previewText}</span>
        )}
      </div>

      {asking && (
        <div
          role="alert"
          data-write-pad-ask
          className="mx-3 mt-1 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-soft px-3 py-2 text-sm"
        >
          <span className="min-w-0 flex-1">{t('writePad.discard.ask')}</span>
          <button
            type="button"
            className="min-h-11 rounded-lg border border-line px-3 hover:bg-hover"
            onClick={() => setAsking(null)}
          >
            {t('writePad.discard.keep')}
          </button>
          <button
            type="button"
            data-testid="write-pad-discard"
            className="min-h-11 rounded-lg border border-line px-3 hover:bg-hover"
            onClick={() => {
              discardStrokes(session.pageId)
              const mode = asking
              setAsking(null)
              setPieces(null)
              setAiError('')
              set({ engine: mode })
            }}
          >
            {t('writePad.discard.discard')}
          </button>
        </div>
      )}

      {ai ? (
        <>
          {text !== '' && (
            <div
              data-write-pad-kept
              style={{ ...lookCss, fontSize: `${18 * prefs.zoom}px` }}
              className="mx-3 mt-1 max-h-24 shrink-0 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-line p-2 text-ink"
            >
              {text}
            </div>
          )}
          <AiCanvas
            pageId={session.pageId}
            font={prefs.font}
            weight={prefs.weight}
            onRead={(read) => {
              setAiError('')
              // Add to the text already in the pad; never replace it.
              const base =
                live ?? (text ? [{ text, weight: prefs.weight }] : [])
              const gap = base.length > 0 && !/\s$/.test(text)
              const next = [
                ...base,
                ...(gap ? [{ text: ' ', weight: prefs.weight }] : []),
                ...read,
              ]
              setPieces(next)
              change(next.map((p) => p.text).join(''), true)
            }}
            onError={(m) => setAiError(t('ai.failed', { reason: m }))}
          />
        </>
      ) : (
        <div className="relative mx-3 my-2 min-h-0 flex-1 rounded-lg bg-bg">
          {/* Shows each Enter as a mark; the box on top stays a plain textarea. */}
          <div
            ref={marks}
            aria-hidden
            data-write-pad-marks
            style={{
              ...lookCss,
              fontSize: `${22 * prefs.zoom}px`,
              lineHeight: 1.3,
              scrollbarGutter: 'stable',
            }}
            className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words rounded-lg border border-transparent p-3 text-transparent"
          >
            {text.split('\n').map((line, i, all) => (
              <span key={i}>
                {line}
                {i < all.length - 1 && (
                  <>
                    <span
                      data-write-pad-break
                      className="inline-block w-0 overflow-visible whitespace-nowrap text-muted"
                    >
                      ↵
                    </span>
                    {'\n'}
                  </>
                )}
              </span>
            ))}
          </div>
          <textarea
            ref={box}
            data-write-pad-input
            aria-label={t('writePad.input')}
            placeholder={t('writePad.placeholder')}
            value={text}
            onScroll={(e) => {
              if (marks.current)
                marks.current.scrollTop = e.currentTarget.scrollTop
            }}
            onChange={(e) => change(e.target.value)}
            onKeyDown={(e) => {
              // The box is controlled, so the browser's own undo is replaced.
              if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z')
                return
              e.preventDefault()
              if (e.shiftKey ? redoPad() : undoPad()) return
            }}
            // Remember where the page's cursor was when the pad is tapped.
            onFocus={() => {
              const range = currentRange(editor)
              if (range.from !== session.from || range.to !== session.to) {
                writePad.set({ ...session, ...range })
              }
            }}
            autoCapitalize="sentences"
            spellCheck={false}
            style={{
              ...lookCss,
              fontSize: `${22 * prefs.zoom}px`,
              lineHeight: 1.3,
              scrollbarGutter: 'stable',
            }}
            className="absolute inset-0 size-full resize-none rounded-lg border border-line bg-transparent p-3 text-ink"
          />
        </div>
      )}

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
      <div className="flex items-center gap-3 overflow-x-auto px-3 pb-3">
        <Tip id="writePad.auto" touchInfo={false}>
          <label className="flex min-h-11 shrink-0 items-center gap-2 text-sm">
            <input
              type="checkbox"
              data-testid="write-pad-auto"
              checked={auto}
              onChange={(e) => set({ autoInsert: e.target.checked })}
              className="size-5"
            />
            {t('writePad.auto')}
          </label>
        </Tip>
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
    </section>,
    document.body,
  )
}
