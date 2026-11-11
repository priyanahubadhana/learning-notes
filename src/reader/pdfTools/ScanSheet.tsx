import { useContext, useEffect, useRef, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import { t } from '../../i18n/t'
import { picturesToPdf, PdfEditError, type ScanPage } from './pdfEdit'
import {
  detectCorners,
  enhance,
  insetQuad,
  outputSize,
  warp,
  type Look,
  type Pic,
  type Quad,
} from './scanGeometry'
import { btnClass, mainBtnClass, Shell } from './Shell'

const MAX_SIDE = 2400
const LOOKS: Look[] = ['colour', 'gray', 'document']

interface Shot {
  id: number
  pic: Pic
  quad: Quad
  /** True while the corners are the program's guess. */
  auto: boolean
}

let counter = 0

/** A picture file as pixels (turned upright by its camera data, shrunk to MAX_SIDE). */
async function readPicture(file: Blob): Promise<Pic> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const s = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * s))
  const h = Math.max(1, Math.round(bmp.height * s))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('No canvas')
  ctx.drawImage(bmp, 0, 0, w, h)
  bmp.close?.()
  const d = ctx.getImageData(0, 0, w, h)
  return { data: d.data, width: w, height: h }
}

function toCanvas(pic: Pic): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = pic.width
  c.height = pic.height
  const data = new ImageData(
    new Uint8ClampedArray(pic.data as Uint8ClampedArray),
    pic.width,
    pic.height,
  )
  c.getContext('2d')?.putImageData(data, 0, 0)
  return c
}

async function toJpeg(pic: Pic): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((ok) =>
    toCanvas(pic).toBlob(ok, 'image/jpeg', 0.85),
  )
  if (!blob) throw new Error('No picture')
  return new Uint8Array(await blob.arrayBuffer())
}

/** The picture with the four corner handles the person can drag. */
function CornerEditor({
  shot,
  onQuad,
}: {
  shot: Shot
  onQuad: (q: Quad) => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const { width: W, height: H } = shot.pic
  useEffect(() => {
    const el = canvas.current
    if (!el) return
    el.width = W
    el.height = H
    el.getContext('2d')?.drawImage(toCanvas(shot.pic), 0, 0)
  }, [shot.pic, W, H])

  const place = (i: number, x: number, y: number) => {
    const q = shot.quad.map((p) => ({ ...p })) as Quad
    q[i] = { x: Math.min(W, Math.max(0, x)), y: Math.min(H, Math.max(0, y)) }
    onQuad(q)
  }
  const drag = (i: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    const r = box.current?.getBoundingClientRect()
    if (!r || e.buttons === 0) return
    place(
      i,
      ((e.clientX - r.left) / r.width) * W,
      ((e.clientY - r.top) / r.height) * H,
    )
  }
  const names = [
    t('pdftools.scan.cornerTl'),
    t('pdftools.scan.cornerTr'),
    t('pdftools.scan.cornerBr'),
    t('pdftools.scan.cornerBl'),
  ]
  return (
    <div
      ref={box}
      data-testid="scan-editor"
      className="relative mx-auto w-full max-w-md select-none"
      style={{ aspectRatio: `${W} / ${H}`, touchAction: 'none' }}
    >
      <canvas ref={canvas} className="h-full w-full rounded-lg" aria-hidden />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden
      >
        <polygon
          points={shot.quad.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="rgba(59,130,246,0.15)"
          stroke="rgb(59,130,246)"
          strokeWidth={Math.max(2, W / 250)}
        />
      </svg>
      {shot.quad.map((p, i) => (
        <button
          key={i}
          type="button"
          data-testid={`scan-corner-${i}`}
          aria-label={names[i]}
          className="absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-500/80 shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            left: `${(p.x / W) * 100}%`,
            top: `${(p.y / H) * 100}%`,
            touchAction: 'none',
          }}
          onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
          onPointerMove={drag(i)}
          onKeyDown={(e) => {
            const step = Math.max(W, H) / 100
            const dx =
              e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
            const dy =
              e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
            if (dx || dy) {
              e.preventDefault()
              place(i, p.x + dx, p.y + dy)
            }
          }}
        />
      ))}
    </div>
  )
}

/**
 * Scan to PDF (Q8): photograph or pick pictures of pages; the sheet is found
 * and straightened (drag the corners if it guessed wrong); pages become one
 * new PDF in the Library, optionally searchable (OCR on this device).
 */
export default function ScanSheet({
  title,
  status = '',
  onClose,
  onCreate,
}: {
  title: string
  /** What the saving is doing now (reading the text). */
  status?: string
  onClose: () => void
  /** Saves the PDF. `searchable`: run the on-device text reading first. */
  onCreate: (bytes: Uint8Array, searchable: boolean) => Promise<void>
}) {
  const { toast } = useContext(AppUiContext)
  const camera = useRef<HTMLInputElement>(null)
  const pick = useRef<HTMLInputElement>(null)
  const [shots, setShots] = useState<Shot[]>([])
  const [current, setCurrent] = useState(0)
  const [look, setLook] = useState<Look>('document')
  const [searchable, setSearchable] = useState(true)
  const [busy, setBusy] = useState(false)
  const [reading, setReading] = useState(false)

  const add = async (files: File[]) => {
    setReading(true)
    const made: Shot[] = []
    for (const f of files) {
      try {
        const pic = await readPicture(f)
        const found = detectCorners(pic)
        made.push({
          id: ++counter,
          pic,
          quad: found ?? insetQuad(pic.width, pic.height),
          auto: !!found,
        })
      } catch {
        toast(t('pdftools.scan.badPicture', { name: f.name }))
      }
    }
    setReading(false)
    if (made.length) {
      setShots((list) => {
        setCurrent(list.length)
        return [...list, ...made]
      })
    }
  }
  const shot = shots[current]
  const patch = (id: number, p: Partial<Shot>) =>
    setShots((l) => l.map((s) => (s.id === id ? { ...s, ...p } : s)))
  const move = (i: number, by: -1 | 1) => {
    const j = i + by
    if (j < 0 || j >= shots.length) return
    setShots((l) => {
      const n = l.slice()
      ;[n[i], n[j]] = [n[j]!, n[i]!]
      return n
    })
    setCurrent(j)
  }
  const remove = (i: number) => {
    setShots((l) => l.filter((_, k) => k !== i))
    setCurrent((c) => Math.max(0, Math.min(c, shots.length - 2)))
  }
  const reset = () => {
    if (!shot) return
    const found = detectCorners(shot.pic)
    patch(shot.id, {
      quad: found ?? insetQuad(shot.pic.width, shot.pic.height),
      auto: !!found,
    })
    if (!found) toast(t('pdftools.scan.noSheet'))
  }

  const create = async () => {
    setBusy(true)
    try {
      const pages: ScanPage[] = []
      for (const s of shots) {
        const { w, h } = outputSize(s.quad)
        const flat = enhance(warp(s.pic, s.quad, w, h), look)
        pages.push({ jpeg: await toJpeg(flat), width: w, height: h })
        // Let the screen breathe between big pages.
        await new Promise((r) => setTimeout(r, 0))
      }
      const bytes = await picturesToPdf(
        pages,
        t('pdftools.err.open'),
        t('pdftools.scan.name', { title }),
      )
      await onCreate(bytes, searchable)
    } catch (e) {
      toast(e instanceof PdfEditError ? e.message : t('pdftools.err.failed'))
      setBusy(false)
    }
  }

  const inputs = (
    <>
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        data-testid="scan-camera"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          void add(files)
        }}
      />
      <input
        ref={pick}
        type="file"
        accept="image/*"
        multiple
        hidden
        data-testid="scan-input"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          void add(files)
        }}
      />
    </>
  )

  return (
    <Shell
      title={t('pdftools.scan.title')}
      testId="pdftools-scan"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <label className="mr-auto flex min-h-11 items-center gap-2 text-sm">
            {busy && status ? <span role="status">{status}</span> : null}
            <input
              type="checkbox"
              data-testid="scan-searchable"
              checked={searchable}
              disabled={busy}
              onChange={(e) => setSearchable(e.target.checked)}
            />
            {t('pdftools.scan.searchable')}
          </label>
          <button
            type="button"
            className={btnClass}
            disabled={busy}
            onClick={onClose}
          >
            {t('pdftools.cancel')}
          </button>
          <button
            type="button"
            data-testid="scan-create"
            className={mainBtnClass}
            disabled={busy || shots.length === 0}
            onClick={() => void create()}
          >
            {busy
              ? t('pdftools.saving')
              : t('pdftools.scan.create', { count: shots.length })}
          </button>
        </>
      }
    >
      {inputs}
      <div className="mx-auto flex max-w-xl flex-col gap-3 p-4">
        <p className="text-sm text-muted">{t('pdftools.scan.help')}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="scan-take"
            className={mainBtnClass}
            disabled={busy || reading}
            onClick={() => camera.current?.click()}
          >
            {t('pdftools.scan.take')}
          </button>
          <button
            type="button"
            data-testid="scan-choose"
            className={btnClass}
            disabled={busy || reading}
            onClick={() => pick.current?.click()}
          >
            {t('pdftools.scan.choose')}
          </button>
        </div>
        {reading && (
          <p className="text-sm text-muted" role="status">
            {t('pdftools.scan.reading')}
          </p>
        )}
        {shots.length > 0 && (
          <ol
            aria-label={t('pdftools.scan.pages')}
            className="flex gap-2 overflow-x-auto pb-1"
          >
            {shots.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  data-testid="scan-page"
                  aria-current={i === current}
                  aria-label={t('pdftools.scan.pageN', { n: i + 1 })}
                  onClick={() => setCurrent(i)}
                  className={`min-h-11 min-w-11 rounded-lg border px-3 text-sm ${
                    i === current
                      ? 'border-accent bg-hover font-semibold'
                      : 'border-line hover:bg-hover'
                  }`}
                >
                  {i + 1}
                </button>
              </li>
            ))}
          </ol>
        )}
        {shot && (
          <>
            <CornerEditor
              key={shot.id}
              shot={shot}
              onQuad={(q) => patch(shot.id, { quad: q, auto: false })}
            />
            <p className="text-center text-xs text-muted">
              {shot.auto ? t('pdftools.scan.found') : t('pdftools.scan.drag')}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={btnClass} onClick={reset}>
                {t('pdftools.scan.redetect')}
              </button>
              <button
                type="button"
                className={btnClass}
                disabled={current === 0}
                onClick={() => move(current, -1)}
              >
                {t('pdftools.scan.earlier')}
              </button>
              <button
                type="button"
                className={btnClass}
                disabled={current === shots.length - 1}
                onClick={() => move(current, 1)}
              >
                {t('pdftools.scan.later')}
              </button>
              <button
                type="button"
                data-testid="scan-remove"
                className={btnClass}
                onClick={() => remove(current)}
              >
                {t('pdftools.scan.remove')}
              </button>
            </div>
            <div
              role="radiogroup"
              aria-label={t('pdftools.scan.look')}
              className="flex gap-2"
            >
              {LOOKS.map((l) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={look === l}
                  data-testid={`scan-look-${l}`}
                  onClick={() => setLook(l)}
                  className={`min-h-11 flex-1 rounded-lg border px-2 text-sm ${
                    look === l
                      ? 'border-accent bg-hover font-semibold'
                      : 'border-line hover:bg-hover'
                  }`}
                >
                  {t(`pdftools.scan.look.${l}` as 'pdftools.scan.look.gray')}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Shell>
  )
}
