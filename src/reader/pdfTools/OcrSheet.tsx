import type { PDFDocumentProxy } from 'pdfjs-dist'
import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useEffect, useRef, useState } from 'react'
import { AiOffCard } from '../../ai/AiOffCard'
import { useAiTick } from '../../ai/aiOffStore'
import {
  aiLockedBlock,
  blocker,
  forNotebook,
  readAiConfig,
} from '../../ai/aiRun'
import { formatCost } from '../../ai/costCurrency'
import { AiError, PROVIDERS } from '../../ai/provider'
import { blobToImage } from '../../ai/vision'
import { AppUiContext } from '../../app/appUi'
import { loadPdfjs } from '../../app/pdfjs'
import type { LearningNotesDB } from '../../core/db'
import { t } from '../../i18n/t'
import { aiReadPage, estimateAiOcrCost } from './aiOcr'
import { addAiText, ocrPdf, scannedPages, type OcrProgress } from './ocr'
import { PdfEditError } from './pdfEdit'
import { btnClass, mainBtnClass, Shell } from './Shell'

/**
 * Make searchable (Q8). Two ways to read scanned pages:
 * - On this device (free, the default): the file never leaves the device.
 * - With AI (optional, costs money): shows the price first and obeys AI off,
 *   the notebook switch and the monthly spending limit.
 * The result is the same book with an invisible text layer; one Undo takes it
 * back.
 */
export default function OcrSheet({
  db,
  pageId,
  data,
  onClose,
  onDone,
}: {
  db: LearningNotesDB
  pageId: string
  data: ArrayBuffer
  onClose: () => void
  /** Saves the new file; resolves when done. */
  onDone: (bytes: Uint8Array, pages: number) => Promise<void>
}) {
  const { toast } = useContext(AppUiContext)
  useAiTick()
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [scanned, setScanned] = useState<number[] | null>(null)
  const [scope, setScope] = useState<'scanned' | 'all'>('scanned')
  const [progress, setProgress] = useState<OcrProgress | null>(null)
  const [mode, setMode] = useState<'idle' | 'device' | 'ai'>('idle')
  const [confirmAi, setConfirmAi] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const notebook = useLiveQuery(async () => {
    const pg = await db.pages.get(pageId)
    return pg ? db.notebooks.get(pg.notebookId) : undefined
  }, [db, pageId])

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
        setScanned(await scannedPages(pdf))
      } catch {
        if (!dead) setScanned([])
      }
    })()
    return () => {
      dead = true
      abort.current?.abort()
      void opened?.destroy()
    }
  }, [data])

  const total = doc?.numPages ?? 0
  const targets =
    scope === 'all'
      ? Array.from({ length: total }, (_, i) => i + 1)
      : (scanned ?? [])
  const busy = mode !== 'idle'
  const config = forNotebook(readAiConfig(), notebook)
  const aiReady = config.enabled && config.candidates.length > 0
  const cost = aiReady ? estimateAiOcrCost(config, targets.length) : 0

  const stop = () => abort.current?.abort()
  const fail = (e: unknown) =>
    toast(
      e instanceof PdfEditError || e instanceof AiError
        ? e.message
        : t('pdftools.err.failed'),
    )

  const runDevice = async () => {
    if (targets.length === 0) return
    const ctl = new AbortController()
    abort.current = ctl
    setMode('device')
    setProgress(null)
    try {
      const r = await ocrPdf(data, {
        pages: targets,
        onProgress: setProgress,
        signal: ctl.signal,
        message: t('pdftools.err.open'),
      })
      if (ctl.signal.aborted && r.pages === 0) {
        toast(t('pdftools.ocr.stopped'))
        setMode('idle')
        return
      }
      if (r.pages === 0) {
        toast(t('pdftools.ocr.nothing'))
        setMode('idle')
        return
      }
      await onDone(r.bytes, r.pages)
    } catch (e) {
      fail(e)
      setMode('idle')
    }
  }

  const runAi = async () => {
    if (!doc) return
    const page = await db.pages.get(pageId)
    const nb = page ? await db.notebooks.get(page.notebookId) : undefined
    const why = blocker(config, !!nb?.allowAi, await aiLockedBlock(db, pageId))
    if (why) {
      toast(
        t(
          why === 'notReady'
            ? 'pdftools.ocr.needsAi'
            : why === 'lockedOff'
              ? 'ai.lockedOff'
              : 'ai.allowOff',
        ),
      )
      return
    }
    const ctl = new AbortController()
    abort.current = ctl
    setConfirmAi(false)
    setMode('ai')
    const texts = new Map<number, string>()
    try {
      for (let i = 0; i < targets.length; i++) {
        if (ctl.signal.aborted) break
        const n = targets[i]!
        setProgress({
          page: n,
          total: targets.length,
          done: i,
          fraction: i / targets.length,
          stage: 'read',
        })
        const p = await doc.getPage(n)
        const base = p.getViewport({ scale: 1 })
        const vp = p.getViewport({
          scale: Math.min(3, 1568 / Math.max(base.width, base.height)),
        })
        const canvas = document.createElement('canvas')
        canvas.width = Math.ceil(vp.width)
        canvas.height = Math.ceil(vp.height)
        await p.render({ canvas, viewport: vp }).promise
        p.cleanup()
        const blob = await new Promise<Blob | null>((ok) =>
          canvas.toBlob(ok, 'image/png'),
        )
        canvas.width = canvas.height = 0
        if (!blob) continue
        const text = await aiReadPage(
          config,
          await blobToImage(blob),
          { db, pageId },
          ctl.signal,
        )
        if (text) texts.set(n, text)
      }
      if (texts.size === 0) {
        toast(t('pdftools.ocr.nothing'))
        setMode('idle')
        return
      }
      // Pages already read are kept even when it was stopped or ran into the limit.
      const bytes = await addAiText(data, texts, t('pdftools.err.open'))
      await onDone(bytes, texts.size)
    } catch (e) {
      if (texts.size > 0) {
        try {
          const bytes = await addAiText(data, texts, t('pdftools.err.open'))
          toast(e instanceof AiError ? e.message : t('pdftools.err.failed'))
          return await onDone(bytes, texts.size)
        } catch (inner) {
          fail(inner)
        }
      } else fail(e)
      setMode('idle')
    }
  }

  const percent = Math.round((progress?.fraction ?? 0) * 100)
  return (
    <Shell
      title={t('pdftools.ocr.title')}
      testId="pdftools-ocr"
      onClose={() => {
        stop()
        onClose()
      }}
      busy={false}
      footer={
        busy ? (
          <button
            type="button"
            data-testid="ocr-stop"
            className={btnClass}
            onClick={stop}
          >
            {t('pdftools.ocr.stop')}
          </button>
        ) : (
          <button type="button" className={btnClass} onClick={onClose}>
            {t('pdftools.cancel')}
          </button>
        )
      }
    >
      <div className="mx-auto flex max-w-xl flex-col gap-4 p-4">
        <p className="text-sm text-muted">{t('pdftools.ocr.help')}</p>
        {scanned === null ? (
          <p className="text-sm text-muted" role="status">
            {t('pdftools.loading')}
          </p>
        ) : (
          <fieldset className="flex flex-col gap-2" disabled={busy}>
            <legend className="mb-1 text-sm font-medium">
              {t('pdftools.ocr.which')}
            </legend>
            {(['scanned', 'all'] as const).map((s) => (
              <label
                key={s}
                className="flex min-h-11 items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  name="ocr-scope"
                  data-testid={`ocr-scope-${s}`}
                  checked={scope === s}
                  onChange={() => setScope(s)}
                />
                {s === 'scanned'
                  ? t('pdftools.ocr.scanned', { count: scanned.length, total })
                  : t('pdftools.ocr.all', { total })}
              </label>
            ))}
          </fieldset>
        )}

        <section className="flex flex-col gap-2 rounded-xl border border-line p-3">
          <h3 className="text-sm font-semibold">{t('pdftools.ocr.device')}</h3>
          <p className="text-sm text-muted">{t('pdftools.ocr.deviceHelp')}</p>
          <button
            type="button"
            data-testid="ocr-device"
            className={mainBtnClass}
            disabled={busy || targets.length === 0}
            onClick={() => void runDevice()}
          >
            {t('pdftools.ocr.run')}
          </button>
          {scanned !== null && scanned.length === 0 && scope === 'scanned' && (
            <p className="text-sm" data-testid="ocr-none">
              {t('pdftools.ocr.noScanned')}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-2 rounded-xl border border-line p-3">
          <h3 className="text-sm font-semibold">{t('pdftools.ocr.ai')}</h3>
          <p className="text-sm text-muted">{t('pdftools.ocr.aiHelp')}</p>
          <AiOffCard />
          {aiReady && (
            <>
              <p className="text-sm" data-testid="ocr-ai-cost">
                {t('pdftools.ocr.aiCost', {
                  count: targets.length,
                  cost: formatCost(cost),
                  provider: t(`ai.provider.${config.provider}`),
                  host: PROVIDERS[config.provider].host,
                })}
              </p>
              {confirmAi ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    data-testid="ocr-ai-confirm"
                    className={mainBtnClass}
                    disabled={busy || targets.length === 0}
                    onClick={() => void runAi()}
                  >
                    {t('pdftools.ocr.aiConfirm', { cost: formatCost(cost) })}
                  </button>
                  <button
                    type="button"
                    className={btnClass}
                    disabled={busy}
                    onClick={() => setConfirmAi(false)}
                  >
                    {t('pdftools.cancel')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  data-testid="ocr-ai"
                  className={btnClass}
                  disabled={busy || targets.length === 0}
                  onClick={() => setConfirmAi(true)}
                >
                  {t('pdftools.ocr.aiRun')}
                </button>
              )}
            </>
          )}
        </section>

        {busy && (
          <div role="status" aria-live="polite" data-testid="ocr-progress">
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label={t('pdftools.ocr.progress')}
              className="h-2 overflow-hidden rounded-full bg-hover"
            >
              <div
                className="h-full bg-accent transition-[width] duration-200"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-1 text-sm text-muted">
              {progress?.stage === 'prepare' || !progress
                ? t('pdftools.ocr.preparing')
                : t('pdftools.ocr.reading', {
                    page: Math.min(progress.done + 1, progress.total),
                    total: progress.total,
                    percent,
                  })}
            </p>
          </div>
        )}
      </div>
    </Shell>
  )
}
