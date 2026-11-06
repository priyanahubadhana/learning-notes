import type { PDFDocumentProxy } from 'pdfjs-dist'
import { useEffect, useRef, useState } from 'react'
import { t } from '../../i18n/t'
import { liquidBlocks, type LiquidBlock, type TextPiece } from './liquid'

const CHUNK = 8

/**
 * Liquid mode (C5, beta): the PDF's text as plain reflowed paragraphs at the
 * text size you choose. Pages load eight at a time as you reach the end.
 * "Show original" is always on the bar. Reports the page in view so the
 * reading position keeps up.
 */
export function LiquidView({
  doc,
  startPage,
  size,
  onPage,
}: {
  doc: PDFDocumentProxy
  startPage: number
  /** Text size in percent. */
  size: number
  onPage: (page: number) => void
}) {
  const [pages, setPages] = useState<Map<number, LiquidBlock[]>>(new Map())
  const [loaded, setLoaded] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)
  const loading = useRef(false)
  const first = useRef(Math.max(1, startPage))

  // Load the next chunk, starting at the page the reader was on.
  const more = async () => {
    if (loading.current) return
    loading.current = true
    const next = new Map<number, LiquidBlock[]>()
    const from = loaded === 0 ? first.current : loaded + 1
    for (let n = from; n < from + CHUNK && n <= doc.numPages; n++) {
      try {
        const page = await doc.getPage(n)
        const content = await page.getTextContent()
        page.cleanup()
        next.set(
          n,
          liquidBlocks(
            content.items.flatMap((i) =>
              'str' in i && 'transform' in i
                ? [
                    {
                      str: i.str,
                      transform: i.transform as number[],
                      height: i.height,
                    } satisfies TextPiece,
                  ]
                : [],
            ),
          ),
        )
      } catch {
        next.set(n, [])
      }
    }
    setPages((prev) => new Map([...prev, ...next]))
    setLoaded(Math.min(doc.numPages, from + CHUNK - 1))
    loading.current = false
  }
  useEffect(() => {
    void more()
    // First chunk only; more() is called again at the end of the column.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc])

  // Which page is in view.
  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    const top = el.getBoundingClientRect().top + 8
    let current = first.current
    for (const node of el.querySelectorAll<HTMLElement>('[data-liquid-page]')) {
      if (node.getBoundingClientRect().top <= top) {
        current = Number(node.dataset.liquidPage)
      } else break
    }
    onPage(current)
    if (
      el.scrollHeight - el.scrollTop - el.clientHeight < 600 &&
      loaded < doc.numPages
    ) {
      void more()
    }
  }

  const sorted = [...pages.entries()].sort((a, b) => a[0] - b[0])
  const empty = sorted.length > 0 && sorted.every(([, b]) => b.length === 0)
  return (
    <div
      ref={scroller}
      onScroll={onScroll}
      data-testid="liquid-view"
      data-reader-scroll
      tabIndex={0}
      className="min-h-0 flex-1 overflow-auto bg-bg"
    >
      <article
        className="mx-auto max-w-[680px] px-5 py-6"
        style={{ fontSize: `${size}%`, lineHeight: 1.6 }}
      >
        <p className="mb-4 rounded-lg bg-soft px-3 py-2 text-xs text-muted">
          {t('reader.liquid.note')}
        </p>
        {empty && <p className="text-sm">{t('reader.liquid.noText')}</p>}
        {sorted.map(([n, blocks]) => (
          <section key={n} data-liquid-page={n} className="mb-6">
            <p className="mb-2 text-xs text-muted">
              {t('reader.find.page', { page: n })}
            </p>
            {blocks.length === 0 && !empty && (
              <p className="text-sm text-muted">{t('reader.liquid.empty')}</p>
            )}
            {blocks.map((b, i) =>
              b.kind === 'heading' ? (
                <h2 key={i} className="mt-4 mb-2 text-[1.25em] font-semibold">
                  {b.text}
                </h2>
              ) : (
                <p key={i} className="mb-3">
                  {b.text}
                </p>
              ),
            )}
          </section>
        ))}
        {loaded < doc.numPages && (
          <button
            type="button"
            onClick={() => void more()}
            className="min-h-11 rounded-lg border border-line px-4 text-sm hover:bg-hover"
          >
            {t('reader.liquid.more')}
          </button>
        )}
      </article>
    </div>
  )
}
