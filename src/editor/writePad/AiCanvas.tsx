import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Tip } from '../../help/Help'
import { t } from '../../i18n/t'
import { erasePadStrokes, type PadEraseMode } from './padErase'
import type { PadFont, PadWeight } from './handStyle'
import {
  weightPieces,
  weightsFor,
  wordPressures,
  type PadStroke,
} from './pressure'

const ReadPromptChoice = lazy(() =>
  import('../../ai/ReadPromptChoice').then((m) => ({
    default: m.ReadPromptChoice,
  })),
)

/** What the main bar's tool does on the pad (R7-15, R7-19). */
export type PadTool =
  | { kind: 'pen' }
  /** Radius in pad pixels. */
  | { kind: 'eraser'; mode: PadEraseMode; radius: number }
  /** Any other tool (Lasso ...): the pad ignores it and leaves no mark. */
  | { kind: 'ignore' }

/**
 * The AI engine's writing surface: records real strokes with pen pressure
 * (a mouse or finger counts as even pressure). The strokes belong to the
 * pad (WritePad.tsx), which keeps them in its Undo list. The main bar's
 * Eraser erases them; the Lasso and other tools are ignored here. Read sends
 * a picture of them to the user's AI (src/ai/padRead.ts, loaded on demand)
 * and hands back the words with a weight each.
 */
export function AiCanvas({
  pageId,
  font,
  weight,
  strokes,
  tool,
  onStrokes,
  onRead,
  onError,
}: {
  pageId?: string
  font: PadFont
  weight: PadWeight
  strokes: readonly PadStroke[]
  tool: PadTool
  /** The strokes changed (a stroke was drawn, or some were erased). */
  onStrokes: (next: readonly PadStroke[]) => void
  onRead: (pieces: { text: string; weight: PadWeight }[]) => void
  onError: (message: string) => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  /** The newest strokes, even before the pad has re-drawn with them. */
  const cur = useRef(strokes)
  useEffect(() => {
    cur.current = strokes
  }, [strokes])
  const live = useRef<PadStroke | null>(null)
  /** While erasing: the strokes as they are being rubbed out. */
  const work = useRef<readonly PadStroke[] | null>(null)
  const last = useRef<{ x: number; y: number } | null>(null)
  const ring = useRef<{ x: number; y: number } | null>(null)
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
    const all = work.current ?? strokes
    for (const s of live.current ? [...all, live.current] : all) {
      if (s.length === 1) {
        ctx.fillStyle = ctx.strokeStyle
        ctx.beginPath()
        ctx.arc(s[0].x, s[0].y, (1 + 3 * s[0].p) / 2, 0, Math.PI * 2)
        ctx.fill()
      }
      for (let i = 1; i < s.length; i++) {
        ctx.lineWidth = 1 + 3 * s[i].p
        ctx.beginPath()
        ctx.moveTo(s[i - 1].x, s[i - 1].y)
        ctx.lineTo(s[i].x, s[i].y)
        ctx.stroke()
      }
    }
    if (tool.kind === 'eraser' && ring.current) {
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.arc(ring.current.x, ring.current.y, tool.radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }
  useEffect(paint)

  const point = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect()
    const p = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 0.5
    return { x: e.clientX - r.left, y: e.clientY - r.top, p }
  }

  /** Rubs the eraser from the last place to this one. */
  const rub = (to: { x: number; y: number }) => {
    if (tool.kind !== 'eraser') return
    const from = last.current ?? to
    work.current = erasePadStrokes(
      work.current ?? cur.current,
      from,
      to,
      tool.radius,
      tool.mode,
    )
    last.current = to
    ring.current = to
  }

  const finish = () => {
    if (live.current) {
      const done = live.current
      live.current = null
      const next = [...cur.current, done]
      cur.current = next
      onStrokes(next)
    } else if (work.current) {
      const done = work.current
      work.current = null
      if (done !== cur.current) {
        cur.current = done
        onStrokes(done)
      }
    }
    last.current = null
    ring.current = null
    paint()
  }

  const read = async () => {
    if (strokes.length === 0) return
    setBusy(true)
    try {
      const { readPad } = await import('../../ai/padRead')
      const text = await readPad(strokes as PadStroke[], pageId)
      const weights = weightsFor(wordPressures(strokes), font, weight)
      onRead(weightPieces(text, weights, weight))
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
        data-pad-tool={tool.kind}
        role="img"
        aria-label={t('writePad.ai.canvas')}
        onPointerDown={(e) => {
          // The pad's pointer events stay on the pad: nothing reaches the
          // page or its ink layer, whatever tool the main bar has.
          e.preventDefault()
          e.stopPropagation()
          if (tool.kind === 'ignore') return
          try {
            canvas.current?.setPointerCapture(e.pointerId)
          } catch {
            // Not a real pointer (a test).
          }
          if (tool.kind === 'eraser') {
            rub(point(e))
            paint()
            return
          }
          live.current = [point(e)]
          paint()
        }}
        onPointerMove={(e) => {
          e.stopPropagation()
          if (tool.kind === 'eraser') {
            const p = point(e)
            if (e.buttons > 0 || last.current) rub(p)
            else ring.current = p
            paint()
            return
          }
          if (!live.current) return
          live.current.push(point(e))
          paint()
        }}
        onPointerUp={(e) => {
          e.stopPropagation()
          finish()
        }}
        onPointerCancel={() => {
          live.current = null
          work.current = null
          last.current = null
          paint()
        }}
        onPointerLeave={() => {
          if (!last.current) {
            ring.current = null
            paint()
          }
        }}
        className="min-h-24 w-full flex-1 touch-none rounded-lg border border-line bg-bg text-ink"
      />
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 basis-40 text-xs text-muted">
          {tool.kind === 'ignore'
            ? t('writePad.ai.ignored')
            : t('writePad.ai.hint')}
        </p>
        <Suspense fallback={null}>
          <ReadPromptChoice pageId={pageId} />
        </Suspense>
        <Tip id="writePad.ai.read" touchInfo={false}>
          <button
            type="button"
            data-testid="write-pad-ai-read"
            disabled={strokes.length === 0 || busy}
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
