import { useEffect, useRef, useState } from 'react'
import { Tip } from '../../help/Help'
import { t } from '../../i18n/t'
import type { PadFont, PadWeight } from './handStyle'
import {
  weightPieces,
  weightsFor,
  wordPressures,
  type PadStroke,
} from './pressure'
import { kept, keptKey } from './strokeKeep'

/**
 * The AI engine's writing surface: records real strokes with pen pressure
 * (a mouse or finger counts as even pressure). Read sends a picture of them
 * to the user's AI (src/ai/padRead.ts, loaded on demand) and hands back the
 * words with a weight each.
 */
export function AiCanvas({
  pageId,
  font,
  weight,
  onRead,
  onError,
  onDirty,
}: {
  pageId?: string
  font: PadFont
  weight: PadWeight
  onRead: (pieces: { text: string; weight: PadWeight }[]) => void
  onError: (message: string) => void
  /** Whether there is unread writing on the canvas. */
  onDirty?: (dirty: boolean) => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const strokes = useRef<PadStroke[]>(kept.get(keptKey(pageId)) ?? [])
  const live = useRef<PadStroke | null>(null)
  const [count, setCount] = useState(kept.get(keptKey(pageId))?.length ?? 0)
  const remember = () => {
    if (strokes.current.length) kept.set(keptKey(pageId), strokes.current)
    else kept.delete(keptKey(pageId))
    setCount(strokes.current.length)
    onDirty?.(strokes.current.length > 0)
  }
  const [busy, setBusy] = useState(false)

  const paint = () => {
    const c = canvas.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const dpr = window.devicePixelRatio || 1
    const r = c.getBoundingClientRect()
    if (c.width !== Math.round(r.width * dpr)) {
      c.width = Math.round(r.width * dpr)
      c.height = Math.round(r.height * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, r.width, r.height)
    ctx.strokeStyle = getComputedStyle(c).color
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const s of strokes.current) {
      for (let i = 1; i < s.length; i++) {
        ctx.lineWidth = 1 + 3 * s[i].p
        ctx.beginPath()
        ctx.moveTo(s[i - 1].x, s[i - 1].y)
        ctx.lineTo(s[i].x, s[i].y)
        ctx.stroke()
      }
    }
  }
  useEffect(paint)

  const point = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect()
    const p = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.5
    return { x: e.clientX - r.left, y: e.clientY - r.top, p }
  }

  const read = async () => {
    if (strokes.current.length === 0) return
    setBusy(true)
    try {
      const { readPad } = await import('../../ai/padRead')
      const text = await readPad(strokes.current, pageId)
      const weights = weightsFor(wordPressures(strokes.current), font, weight)
      onRead(weightPieces(text, weights, weight))
      strokes.current = []
      remember()
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const btn =
    'min-h-11 min-w-11 rounded-lg border border-line px-3 text-sm hover:bg-hover disabled:opacity-40'
  return (
    <div className="mx-3 my-2 flex min-h-36 flex-1 flex-col gap-2">
      <canvas
        ref={canvas}
        data-write-pad-canvas
        role="img"
        aria-label={t('writePad.ai.canvas')}
        onPointerDown={(e) => {
          e.preventDefault()
          try {
            canvas.current?.setPointerCapture(e.pointerId)
          } catch {
            // Not a real pointer (a test).
          }
          live.current = [point(e)]
          strokes.current.push(live.current)
          remember()
        }}
        onPointerMove={(e) => {
          if (!live.current) return
          live.current.push(point(e))
          paint()
        }}
        onPointerUp={() => {
          live.current = null
          remember()
        }}
        onPointerCancel={() => (live.current = null)}
        className="min-h-24 w-full flex-1 touch-none rounded-lg border border-line bg-bg text-ink"
      />
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-xs text-muted">
          {t('writePad.ai.hint')}
        </p>
        <Tip id="writePad.ai.clear" touchInfo={false}>
          <button
            type="button"
            disabled={count === 0 || busy}
            onClick={() => {
              strokes.current = []
              remember()
            }}
            className={btn}
          >
            {t('writePad.ai.clear')}
          </button>
        </Tip>
        <Tip id="writePad.ai.read" touchInfo={false}>
          <button
            type="button"
            data-testid="write-pad-ai-read"
            disabled={count === 0 || busy}
            onClick={() => void read()}
            className={btn}
          >
            {busy ? t('ai.convert.reading') : t('writePad.ai.read')}
          </button>
        </Tip>
      </div>
    </div>
  )
}
