import { IconButton } from '../app/ui'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { t } from '../i18n/t'
import {
  cropForRatio,
  dragCorner,
  moveCrop,
  NO_EDIT,
  rotatedSize,
  isUnchanged,
  type Corner,
  type Crop,
  type Edit,
} from './editImage'

/**
 * The picture editor sheet (G0): turn the picture (quarter turns and a fine
 * "straighten"), zoom, drag the four corners (44 px targets, arrow keys too)
 * or pick a shape, then Save into the note or Cut out as a new picture.
 * Nothing is saved until a button is pressed; Esc cancels.
 */

export type SheetResult =
  | { action: 'save'; edit: Edit }
  | { action: 'cutOut'; edit: Edit }
  | { action: 'restore' }

interface CropSheetProps {
  /** The picture to edit, already decoded. */
  bitmap: ImageBitmap
  /** True when an earlier original exists to go back to. */
  canRestore: boolean
  onDone: (result: SheetResult | null) => void
}

const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se']
const CORNER_KEY = {
  nw: 'pic.corner.nw',
  ne: 'pic.corner.ne',
  sw: 'pic.corner.sw',
  se: 'pic.corner.se',
} as const

const RATIOS: {
  id: string
  key: 'pic.ratio.free' | 'pic.ratio.original' | null
  label?: string
  value: number | 'original' | null
}[] = [
  { id: 'free', key: 'pic.ratio.free', value: null },
  { id: 'orig', key: 'pic.ratio.original', value: 'original' },
  { id: '1:1', key: null, label: '1:1', value: 1 },
  { id: '4:3', key: null, label: '4:3', value: 4 / 3 },
  { id: '3:4', key: null, label: '3:4', value: 3 / 4 },
  { id: '16:9', key: null, label: '16:9', value: 16 / 9 },
]

const MAX_ZOOM = 4

export function CropSheet({ bitmap, canRestore, onDone }: CropSheetProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [quarter, setQuarter] = useState(0)
  const [fine, setFine] = useState(0)
  const [crop, setCrop] = useState<Crop>(NO_EDIT.crop)
  const [ratioId, setRatioId] = useState('free')
  const [zoom, setZoom] = useState(1)
  const [room, setRoom] = useState({ w: 300, h: 300 })

  const angle = quarter * 90 + fine
  const box = rotatedSize(bitmap.width, bitmap.height, angle)
  const ratioValue = (id: string): number | null => {
    const v = RATIOS.find((r) => r.id === id)?.value ?? null
    return v === 'original' ? bitmap.width / bitmap.height : v
  }
  const ratio = ratioValue(ratioId)

  // Size of the picture on screen: fits the room at zoom 1.
  const fit = Math.min(room.w / box.w, room.h / box.h)
  const stageW = Math.max(40, box.w * fit * zoom)
  const stageH = Math.max(40, box.h * fit * zoom)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  // How much room the picture has.
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const measure = () =>
      setRoom({
        w: Math.max(80, el.clientWidth - 48),
        h: Math.max(80, el.clientHeight - 48),
      })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Draw the turned picture (a preview no bigger than the screen needs).
  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const scale = Math.min(1, 1400 / Math.max(box.w, box.h))
    c.width = Math.max(1, Math.round(box.w * scale))
    c.height = Math.max(1, Math.round(box.h * scale))
    const g = c.getContext('2d')
    if (!g) return
    g.clearRect(0, 0, c.width, c.height)
    g.translate(c.width / 2, c.height / 2)
    g.rotate((angle * Math.PI) / 180)
    g.scale(scale, scale)
    g.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2)
  }, [bitmap, angle, box.w, box.h])

  /** Turning changes the shape, so the crop starts again (same ratio). */
  const turn = (nextQuarter: number, nextFine: number) => {
    setQuarter(nextQuarter)
    setFine(nextFine)
    const b = rotatedSize(
      bitmap.width,
      bitmap.height,
      nextQuarter * 90 + nextFine,
    )
    const r = ratioValue(ratioId)
    setCrop(r ? cropForRatio(r, b) : NO_EDIT.crop)
  }

  const pickRatio = (id: string) => {
    setRatioId(id)
    const r = ratioValue(id)
    setCrop(r ? cropForRatio(r, box) : crop)
  }

  const setZoomKeepCentre = useCallback((next: number) => {
    const el = scroller.current
    const clamped = Math.min(MAX_ZOOM, Math.max(1, next))
    if (el) {
      const cx = (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth
      const cy = (el.scrollTop + el.clientHeight / 2) / el.scrollHeight
      setZoom(clamped)
      requestAnimationFrame(() => {
        el.scrollLeft = cx * el.scrollWidth - el.clientWidth / 2
        el.scrollTop = cy * el.scrollHeight - el.clientHeight / 2
      })
    } else setZoom(clamped)
  }, [])

  // Wheel zooms; two fingers pinch (pointers on the empty stage).
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; zoom: number } | null>(null)
  const distOf = () => {
    const [a, b] = [...pointers.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }
  const onStageDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-handle]')) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      pinch.current = { dist: distOf(), zoom }
    }
  }
  const onStageMove = (e: PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2 && pinch.current) {
      setZoomKeepCentre(pinch.current.zoom * (distOf() / pinch.current.dist))
    }
  }
  const onStageUp = (e: PointerEvent) => {
    pointers.current.delete(e.pointerId)
    pinch.current = null
  }

  // Dragging a corner or the box.
  const drag = useRef<{
    kind: Corner | 'move'
    x: number
    y: number
    crop: Crop
  } | null>(null)
  const startDrag = (kind: Corner | 'move', e: PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { kind, x: e.clientX, y: e.clientY, crop }
  }
  const moveDrag = (e: PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = (e.clientX - d.x) / stageW
    const dy = (e.clientY - d.y) / stageH
    setCrop(
      d.kind === 'move'
        ? moveCrop(d.crop, dx, dy)
        : dragCorner(d.crop, d.kind, dx, dy, box, ratio),
    )
  }
  const endDrag = () => {
    drag.current = null
  }
  const keyCorner = (corner: Corner) => (e: KeyboardEvent) => {
    const step = e.shiftKey ? 0.05 : 0.01
    const d: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const move = d[e.key]
    if (!move) return
    e.preventDefault()
    setCrop((c) => dragCorner(c, corner, move[0], move[1], box, ratio))
  }

  const edit: Edit = { angle, crop }
  const changed = !isUnchanged(edit)
  const reset = () => {
    setQuarter(0)
    setFine(0)
    setRatioId('free')
    setCrop(NO_EDIT.crop)
    setZoom(1)
  }

  const btn =
    'min-h-11 rounded-lg px-3 text-sm text-ink hover:bg-hover disabled:opacity-40'
  const primary =
    'min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white disabled:opacity-40'

  return (
    <dialog
      ref={dialog}
      aria-label={t('pic.edit')}
      data-chrome
      onCancel={() => onDone(null)}
      className="m-auto flex h-[min(92vh,760px)] w-[min(96vw,820px)] flex-col overflow-hidden rounded-xl border border-line bg-bg p-0 text-ink shadow-[0_12px_32px_rgba(0,0,0,0.14)] backdrop:bg-black/30 open:flex"
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-line px-3 py-2">
        <button
          type="button"
          className={btn}
          onClick={() => turn((quarter + 3) % 4, fine)}
        >
          {t('pic.rotateLeft')}
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => turn((quarter + 1) % 4, fine)}
        >
          {t('pic.rotateRight')}
        </button>
        <label className="flex min-h-11 items-center gap-2 px-2 text-sm">
          {t('pic.straighten')}
          <input
            type="range"
            min={-45}
            max={45}
            step={0.5}
            value={fine}
            aria-label={t('pic.straighten')}
            onChange={(e) => turn(quarter, Number(e.target.value))}
            className="w-28"
          />
        </label>
        <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden />
        <IconButton
          tip="pic.zoomOut"
          bare
          tipClassName="inline-flex shrink-0"
          type="button"
          className={btn}
          aria-label={t('pic.zoomOut')}
          onClick={() => setZoomKeepCentre(zoom / 1.25)}
        >
          −
        </IconButton>
        <span
          className="min-w-12 text-center text-sm tabular-nums"
          aria-live="polite"
        >
          {Math.round(zoom * 100)}%
        </span>
        <IconButton
          tip="pic.zoomIn"
          bare
          tipClassName="inline-flex shrink-0"
          type="button"
          className={btn}
          aria-label={t('pic.zoomIn')}
          onClick={() => setZoomKeepCentre(zoom * 1.25)}
        >
          +
        </IconButton>
      </div>

      <div
        ref={scroller}
        data-testid="crop-stage"
        className="relative min-h-0 flex-1 overflow-auto bg-soft"
        style={{ touchAction: zoom > 1 ? 'pan-x pan-y' : 'none' }}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            setZoomKeepCentre(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1))
          }
        }}
        onPointerDown={onStageDown}
        onPointerMove={onStageMove}
        onPointerUp={onStageUp}
        onPointerCancel={onStageUp}
      >
        <div className="flex min-h-full min-w-full items-center justify-center p-6">
          <div
            className="relative shrink-0 select-none"
            style={{ width: stageW, height: stageH }}
          >
            <canvas
              ref={canvas}
              className="absolute inset-0 h-full w-full"
              aria-hidden
            />
            <div
              data-testid="crop-box"
              className="absolute cursor-move border-2 border-accent shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
              style={{
                left: `${crop.x * 100}%`,
                top: `${crop.y * 100}%`,
                width: `${crop.w * 100}%`,
                height: `${crop.h * 100}%`,
                touchAction: 'none',
              }}
              onPointerDown={(e) => startDrag('move', e)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              {CORNERS.map((corner) => (
                <div
                  key={corner}
                  role="slider"
                  tabIndex={0}
                  data-handle={corner}
                  aria-label={t(CORNER_KEY[corner])}
                  aria-valuenow={0}
                  onKeyDown={keyCorner(corner)}
                  onPointerDown={(e) => startDrag(corner, e)}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  className="absolute flex size-11 cursor-nwse-resize items-center justify-center focus-visible:outline-none"
                  style={{
                    left: corner.endsWith('w') ? 0 : '100%',
                    top: corner.startsWith('n') ? 0 : '100%',
                    transform: 'translate(-50%, -50%)',
                    touchAction: 'none',
                  }}
                >
                  <span className="size-4 rounded-sm border-2 border-accent bg-bg" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className="flex flex-wrap items-center gap-1 border-t border-line px-3 py-2"
        role="group"
        aria-label={t('pic.shape')}
      >
        {RATIOS.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={ratioId === r.id}
            onClick={() => pickRatio(r.id)}
            className={`min-h-11 rounded-lg px-3 text-sm ${ratioId === r.id ? 'bg-accent text-white' : 'text-ink hover:bg-hover'}`}
          >
            {r.key ? t(r.key) : r.label}
          </button>
        ))}
        <button
          type="button"
          className={btn}
          onClick={reset}
          disabled={!changed && zoom === 1}
        >
          {t('pic.reset')}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-3 py-2">
        {canRestore && (
          <button
            type="button"
            className={`${btn} mr-auto`}
            onClick={() => onDone({ action: 'restore' })}
          >
            {t('pic.restore')}
          </button>
        )}
        <button type="button" className={btn} onClick={() => onDone(null)}>
          {t('ui.cancel')}
        </button>
        <button
          type="button"
          className={btn}
          disabled={!changed}
          onClick={() => onDone({ action: 'cutOut', edit })}
        >
          {t('pic.cutOut')}
        </button>
        <button
          type="button"
          className={primary}
          disabled={!changed}
          onClick={() => onDone({ action: 'save', edit })}
        >
          {t('pic.save')}
        </button>
      </div>
    </dialog>
  )
}
