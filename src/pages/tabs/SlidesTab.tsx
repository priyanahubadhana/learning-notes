import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { loadPdfjs } from '../../app/pdfjs'
import { downloadAttachment } from '../../core/attachments'
import type { LearningNotesDB } from '../../core/db'
import type { BookFile } from '../../core/types'
import { t } from '../../i18n/t'
import { pptxSlides, type SlidePicture } from './slidesModel'

interface PdfDoc {
  getPage: (n: number) => Promise<unknown>
}

/** One PDF page, drawn when it scrolls near the screen. */
function PdfSlide({
  doc,
  n,
  total,
}: {
  doc: PdfDoc
  n: number
  total: number
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const io = new IntersectionObserver(
      (es) => es.some((e) => e.isIntersecting) && setSeen(true),
      { rootMargin: '400px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    if (!seen || !canvas.current) return
    let dead = false
    void (async () => {
      const page = (await doc.getPage(n)) as {
        getViewport: (o: { scale: number }) => { width: number; height: number }
        render: (o: unknown) => { promise: Promise<void> }
      }
      const base = page.getViewport({ scale: 1 })
      const scale = Math.min(2, 960 / base.width)
      const viewport = page.getViewport({ scale })
      const el = canvas.current
      if (dead || !el) return
      el.width = viewport.width
      el.height = viewport.height
      await page.render({ canvas: el, viewport }).promise
    })().catch(() => {})
    return () => {
      dead = true
    }
  }, [seen, doc, n])
  return (
    <canvas
      ref={canvas}
      role="img"
      aria-label={t('tabs.slides.slide', { n, total })}
      data-slide
      className="aspect-video w-full rounded-lg border border-line bg-soft object-contain"
    />
  )
}

function Deck({ db, file }: { db: LearningNotesDB; file: BookFile }) {
  const isPdf = file.mime === 'application/pdf'
  const [pdf, setPdf] = useState<{
    doc: PdfDoc | null
    pages: number
  } | null>(null)
  const [failed, setFailed] = useState(false)
  const pictures = useMemo<SlidePicture[] | null>(() => {
    if (isPdf) return null
    try {
      return pptxSlides(new Uint8Array(file.data))
    } catch {
      return []
    }
  }, [file.data, isPdf])
  const urls = useMemo(
    () =>
      (pictures ?? []).map((p) =>
        URL.createObjectURL(new Blob([p.data as BlobPart], { type: p.mime })),
      ),
    [pictures],
  )
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls])
  useEffect(() => {
    if (!isPdf) return
    let dead = false
    let task: { destroy: () => Promise<void> } | undefined
    void (async () => {
      const lib = await loadPdfjs()
      const loading = lib.getDocument({
        data: new Uint8Array(file.data).slice(),
      })
      task = loading
      const doc = await loading.promise
      if (!dead) setPdf({ doc: doc as unknown as PdfDoc, pages: doc.numPages })
    })().catch(() => setFailed(true))
    return () => {
      dead = true
      void task?.destroy()
    }
  }, [file.data, isPdf])

  const count = isPdf ? (pdf?.pages ?? 0) : urls.length
  return (
    <section
      aria-label={file.name}
      data-slides-deck
      className="mb-6 grid gap-2"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">
          {file.name}
        </h3>
        {count > 0 && (
          <span className="text-xs text-muted">
            {t('tabs.slides.count', { count })}
          </span>
        )}
        <button
          type="button"
          onClick={() => void downloadAttachment(db, file.id)}
          className="min-h-11 rounded-lg px-3 text-sm text-ink hover:bg-hover"
        >
          {t('tabs.slides.save')}
        </button>
      </div>
      {failed || (!isPdf && urls.length === 0) ? (
        <p className="text-sm text-muted">{t('tabs.slides.failed')}</p>
      ) : isPdf && !pdf ? (
        <p role="status" className="text-sm text-muted">
          {t('tabs.slides.loading')}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {isPdf && pdf?.doc
            ? Array.from({ length: pdf.pages }, (_, i) => (
                <PdfSlide key={i} doc={pdf.doc!} n={i + 1} total={pdf.pages} />
              ))
            : urls.map((u, i) => (
                <img
                  key={u}
                  src={u}
                  alt={t('tabs.slides.slide', { n: i + 1, total: urls.length })}
                  data-slide
                  loading="lazy"
                  className="aspect-video w-full rounded-lg border border-line object-contain"
                />
              ))}
        </div>
      )}
    </section>
  )
}

/** The page's Slides tab: each slide deck brought in from NotebookLM as a strip of slides. */
export default function SlidesTab({
  db,
  pageId,
}: {
  db: LearningNotesDB
  pageId: string
}) {
  const decks = useLiveQuery(
    async () =>
      (await db.bookFiles.where('pageId').equals(pageId).toArray())
        .filter((f) => f.deletedAt === null && f.slides && f.data.byteLength)
        .sort((a, b) => a.createdAt - b.createdAt),
    [db, pageId],
  )
  if (!decks) return null
  if (decks.length === 0) {
    return <p className="text-sm text-muted">{t('tabs.slides.empty')}</p>
  }
  return (
    <div>
      {decks.map((f) => (
        <Deck key={f.id} db={db} file={f} />
      ))}
    </div>
  )
}
