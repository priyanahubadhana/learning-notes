import { useContext, useRef, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import {
  MAX_BOOK_BYTES,
  detectBookFormat,
  megabytes,
} from '../../core/bookFormat'
import { t } from '../../i18n/t'
import { combineFiles, PdfEditError } from './pdfEdit'
import { btnClass, mainBtnClass, Shell } from './Shell'

interface Item {
  id: number
  name: string
  data: ArrayBuffer
}

let counter = 0

/**
 * Combine files (Q8): this PDF plus any others from the device, in the order
 * shown, become one new PDF in the Library. The originals are not changed.
 */
export default function CombineSheet({
  data,
  title,
  onClose,
  onCombine,
}: {
  data: ArrayBuffer
  title: string
  onClose: () => void
  onCombine: (bytes: Uint8Array, count: number) => Promise<void>
}) {
  const { toast } = useContext(AppUiContext)
  const input = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<Item[]>(() => [
    { id: ++counter, name: title, data },
  ])
  const [busy, setBusy] = useState(false)
  const total = items.reduce((n, i) => n + i.data.byteLength, 0)

  const add = async (files: File[]) => {
    const next: Item[] = []
    let size = total
    for (const f of files) {
      const bytes = new Uint8Array(await f.arrayBuffer())
      if ((await detectBookFormat(bytes)) !== 'pdf') {
        toast(t('pdftools.comb.notPdf', { name: f.name }))
        continue
      }
      size += bytes.byteLength
      if (size > MAX_BOOK_BYTES) {
        toast(t('pdftools.comb.tooBig'))
        break
      }
      next.push({
        id: ++counter,
        name: f.name.replace(/\.pdf$/i, ''),
        data: bytes.buffer as ArrayBuffer,
      })
    }
    if (next.length) setItems((list) => [...list, ...next])
  }
  const move = (i: number, by: -1 | 1) =>
    setItems((list) => {
      const j = i + by
      if (j < 0 || j >= list.length) return list
      const next = list.slice()
      ;[next[i], next[j]] = [next[j]!, next[i]!]
      return next
    })
  const combine = async () => {
    setBusy(true)
    try {
      const bytes = await combineFiles(
        items.map((i) => i.data),
        t('pdftools.err.open'),
        t('pdftools.comb.name', { title, count: items.length }),
      )
      await onCombine(bytes, items.length)
    } catch (e) {
      toast(e instanceof PdfEditError ? e.message : t('pdftools.err.failed'))
      setBusy(false)
    }
  }

  return (
    <Shell
      title={t('pdftools.comb.title')}
      testId="pdftools-combine"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <span className="mr-auto text-sm text-muted">
            {t('pdftools.comb.size', { mb: megabytes(total) })}
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
            data-testid="comb-go"
            className={mainBtnClass}
            disabled={busy || items.length < 2}
            onClick={() => void combine()}
          >
            {busy ? t('pdftools.saving') : t('pdftools.comb.go')}
          </button>
        </>
      }
    >
      <div className="mx-auto flex max-w-xl flex-col gap-3 p-4">
        <p className="text-sm text-muted">{t('pdftools.comb.help')}</p>
        <ol
          aria-label={t('pdftools.comb.list')}
          className="flex flex-col gap-2"
        >
          {items.map((it, i) => (
            <li
              key={it.id}
              data-testid="comb-item"
              className="flex items-center gap-2 rounded-xl border border-line p-2"
            >
              <span className="w-6 text-center text-sm tabular-nums text-muted">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{it.name}</span>
              <span className="text-xs text-muted">
                {t('pdftools.comb.itemSize', {
                  mb: megabytes(it.data.byteLength),
                })}
              </span>
              <button
                type="button"
                aria-label={t('pdftools.comb.up', { name: it.name })}
                disabled={i === 0 || busy}
                className={`${btnClass} min-w-11`}
                onClick={() => move(i, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={t('pdftools.comb.down', { name: it.name })}
                disabled={i === items.length - 1 || busy}
                className={`${btnClass} min-w-11`}
                onClick={() => move(i, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                aria-label={t('pdftools.comb.remove', { name: it.name })}
                disabled={items.length === 1 || busy}
                className={`${btnClass} min-w-11`}
                onClick={() => setItems((l) => l.filter((x) => x.id !== it.id))}
              >
                ✕
              </button>
            </li>
          ))}
        </ol>
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          hidden
          data-testid="comb-input"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ''
            void add(files)
          }}
        />
        <button
          type="button"
          data-testid="comb-add"
          className={btnClass}
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          {t('pdftools.comb.add')}
        </button>
      </div>
    </Shell>
  )
}
