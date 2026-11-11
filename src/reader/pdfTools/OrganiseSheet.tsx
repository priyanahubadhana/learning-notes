import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import { loadPdfjs } from '../../app/pdfjs'
import { t } from '../../i18n/t'
import {
  identityPlan,
  insertBlank,
  isIdentity,
  movePage,
  removePages,
  turnPages,
  type PagePlan,
} from './pageOps'
import { applyPlan, PdfEditError } from './pdfEdit'
import { btnClass, mainBtnClass, Shell } from './Shell'

const THUMB_W = 132

/** One page picture, drawn only when it scrolls into view. */
function PageThumb({ doc, page }: { doc: PDFDocumentProxy; page: number }) {
  const holder = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [seen, setSeen] = useState(
    () => typeof IntersectionObserver === 'undefined',
  )
  useEffect(() => {
    const el = holder.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (e) => e.some((x) => x.isIntersecting) && setSeen(true),
      { rootMargin: '300px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    const el = canvas.current
    if (!seen || !el) return
    let cancelled = false
    let task: RenderTask | undefined
    void (async () => {
      try {
        const p = await doc.getPage(page)
        if (cancelled) return
        const base = p.getViewport({ scale: 1 })
        const vp = p.getViewport({ scale: (THUMB_W / base.width) * 2 })
        el.width = Math.ceil(vp.width)
        el.height = Math.ceil(vp.height)
        el.style.width = `${Math.ceil(vp.width / 2)}px`
        el.style.height = `${Math.ceil(vp.height / 2)}px`
        task = p.render({ canvas: el, viewport: vp })
        await task.promise
        p.cleanup()
      } catch {
        // A cancelled picture just stays blank.
      }
    })()
    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [seen, doc, page])
  return (
    <div
      ref={holder}
      className="flex h-full w-full items-center justify-center"
    >
      <canvas
        ref={canvas}
        aria-hidden
        className="rounded border border-line bg-white"
      />
    </div>
  )
}

/**
 * Organise pages (Q8): every page as a picture. Tap pages to pick them, then
 * move, turn, delete, extract, or add a blank page. Nothing is saved until
 * Save; then the book gets the new file and the highlights, notes and ink
 * follow their pages. A change can be taken back with Undo.
 */
export default function OrganiseSheet({
  data,
  title,
  onClose,
  onSave,
  onExtract,
}: {
  data: ArrayBuffer
  title: string
  onClose: () => void
  /** Saves the plan to the book; resolves when done. */
  onSave: (plan: PagePlan) => Promise<void>
  /** Makes a new Library item from the picked pages. */
  onExtract: (bytes: Uint8Array, count: number) => Promise<void>
}) {
  const { toast } = useContext(AppUiContext)
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [failed, setFailed] = useState(false)
  const [plan, setPlan] = useState<PagePlan>([])
  const [oldCount, setOldCount] = useState(0)
  const [history, setHistory] = useState<PagePlan[]>([])
  const [picked, setPicked] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const [dragFrom, setDragFrom] = useState<number | null>(null)

  useEffect(() => {
    let dead = false
    let opened: { destroy: () => Promise<void> } | null = null
    void (async () => {
      try {
        const pdfjs = await loadPdfjs()
        const task = pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) })
        const pdf = await task.promise
        if (dead) return void task.destroy()
        opened = task
        setDoc(pdf)
        setOldCount(pdf.numPages)
        setPlan(identityPlan(pdf.numPages))
      } catch {
        if (!dead) setFailed(true)
      }
    })()
    return () => {
      dead = true
      void opened?.destroy()
    }
  }, [data])

  const change = (next: PagePlan, keep: number[] = []) => {
    setHistory((h) => [...h.slice(-30), plan])
    setPlan(next)
    setPicked(keep)
  }
  const undo = () => {
    const last = history[history.length - 1]
    if (!last) return
    setHistory((h) => h.slice(0, -1))
    setPlan(last)
    setPicked([])
  }
  const sorted = useMemo(() => [...picked].sort((a, b) => a - b), [picked])
  const none = picked.length === 0
  const dirty = plan.length > 0 && !isIdentity(plan, oldCount)

  const toggle = (i: number) =>
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))
  const earlier = () => {
    if (none || sorted[0] === 0) return
    let next = plan
    for (const i of sorted) next = movePage(next, i, i - 1)
    change(
      next,
      sorted.map((i) => i - 1),
    )
  }
  const later = () => {
    if (none || sorted[sorted.length - 1] === plan.length - 1) return
    let next = plan
    for (const i of [...sorted].reverse()) next = movePage(next, i, i + 1)
    change(
      next,
      sorted.map((i) => i + 1),
    )
  }
  const remove = () => {
    if (none) return
    if (sorted.length >= plan.length) return toast(t('pdftools.org.keepOne'))
    change(removePages(plan, sorted))
  }
  const blank = () => {
    const after = none ? plan.length - 1 : sorted[sorted.length - 1]!
    change(insertBlank(plan, after), [after + 1])
  }
  const extract = async () => {
    if (none) return
    setBusy(true)
    try {
      const subset = sorted.map((i) => plan[i]!).filter((p) => p.from !== null)
      if (subset.length === 0) return toast(t('pdftools.org.nothingToExtract'))
      const bytes = await applyPlan(data, subset, t('pdftools.err.open'))
      await onExtract(bytes, subset.length)
    } catch (e) {
      toast(e instanceof PdfEditError ? e.message : t('pdftools.err.failed'))
    } finally {
      setBusy(false)
    }
  }
  const save = async () => {
    setBusy(true)
    try {
      await onSave(plan)
    } catch (e) {
      toast(e instanceof PdfEditError ? e.message : t('pdftools.err.failed'))
      setBusy(false)
    }
  }

  const tool = (label: string, id: string, run: () => void, off = false) => (
    <button
      type="button"
      data-testid={`org-${id}`}
      className={btnClass}
      disabled={off || busy}
      onClick={run}
    >
      {label}
    </button>
  )

  return (
    <Shell
      title={t('pdftools.org.title')}
      testId="pdftools-organise"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <span className="mr-auto text-sm text-muted" aria-live="polite">
            {t('pdftools.org.count', { count: plan.length })}
            {picked.length > 0
              ? ` · ${t('pdftools.org.picked', { count: picked.length })}`
              : ''}
          </span>
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
            data-testid="org-save"
            className={mainBtnClass}
            disabled={!dirty || busy}
            onClick={() => void save()}
          >
            {busy ? t('pdftools.saving') : t('pdftools.org.save')}
          </button>
        </>
      }
    >
      <div
        role="toolbar"
        aria-label={t('pdftools.org.tools')}
        className="sticky top-0 z-10 flex flex-wrap gap-2 border-b border-line bg-bg px-3 py-2"
      >
        {tool(
          t('pdftools.org.turnLeft'),
          'left',
          () => change(turnPages(plan, picked, -90), picked),
          none,
        )}
        {tool(
          t('pdftools.org.turnRight'),
          'right',
          () => change(turnPages(plan, picked, 90), picked),
          none,
        )}
        {tool(t('pdftools.org.earlier'), 'earlier', earlier, none)}
        {tool(t('pdftools.org.later'), 'later', later, none)}
        {tool(t('pdftools.org.delete'), 'delete', remove, none)}
        {tool(t('pdftools.org.blank'), 'blank', blank)}
        {tool(t('pdftools.org.extract'), 'extract', () => void extract(), none)}
        {tool(
          picked.length === plan.length
            ? t('pdftools.org.selectNone')
            : t('pdftools.org.selectAll'),
          'all',
          () =>
            setPicked(
              picked.length === plan.length ? [] : plan.map((_, i) => i),
            ),
          plan.length === 0,
        )}
        {tool(t('pdftools.org.undo'), 'undo', undo, history.length === 0)}
      </div>
      {failed ? (
        <p className="p-6">{t('pdftools.err.open')}</p>
      ) : !doc ? (
        <p className="p-6 text-muted">{t('pdftools.loading')}</p>
      ) : (
        <ul
          aria-label={t('pdftools.org.pages', { title })}
          className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 p-3"
        >
          {plan.map((item, i) => {
            const on = picked.includes(i)
            const sideways = item.turn === 90 || item.turn === 270
            return (
              <li
                key={item.from ?? `blank-${i}`}
                draggable={!busy}
                onDragStart={() => setDragFrom(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragFrom !== null && dragFrom !== i) {
                    change(movePage(plan, dragFrom, i), [i])
                  }
                  setDragFrom(null)
                }}
                onDragEnd={() => setDragFrom(null)}
              >
                <button
                  type="button"
                  data-testid="org-page"
                  data-from={item.from ?? 'blank'}
                  data-turn={item.turn}
                  aria-pressed={on}
                  aria-label={
                    item.from === null
                      ? t('pdftools.org.blankPage', { n: i + 1 })
                      : t('pdftools.org.page', { n: i + 1, old: item.from })
                  }
                  onClick={() => toggle(i)}
                  className={`flex w-full flex-col items-center gap-1 rounded-xl border p-2 ${
                    on
                      ? 'border-accent bg-hover ring-2 ring-accent'
                      : 'border-line hover:bg-hover'
                  }`}
                >
                  <span
                    className="flex h-[190px] w-full items-center justify-center overflow-hidden"
                    aria-hidden
                  >
                    <span
                      className="flex items-center justify-center transition-transform duration-200"
                      style={{
                        transform: `rotate(${item.turn}deg)${
                          sideways ? ' scale(0.78)' : ''
                        }`,
                      }}
                    >
                      {item.from === null ? (
                        <span className="block h-[170px] w-[128px] rounded border border-dashed border-line bg-white" />
                      ) : (
                        <PageThumb doc={doc} page={item.from} />
                      )}
                    </span>
                  </span>
                  <span className="text-sm tabular-nums">{i + 1}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Shell>
  )
}
