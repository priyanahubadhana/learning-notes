import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { ReaderBridge } from '../readerBridge'
import PagesGrid from './PagesGrid'

const bridge = (edit: Partial<NonNullable<ReaderBridge['pageEdit']>>) =>
  ({
    pageId: 'p',
    title: 'Book',
    format: 'pdf',
    pageCount: 3,
    page: 1,
    label: '',
    progress: 0,
    outline: [],
    doc: { numPages: 3 } as unknown as PDFDocumentProxy,
    go: vi.fn(),
    jump: vi.fn(),
    makeCards: vi.fn(),
    pageEdit: {
      hasOriginal: false,
      size: 5_000_000,
      busy: false,
      run: vi.fn(),
      restore: vi.fn(),
      ...edit,
    },
  }) as ReaderBridge

describe('Pages grid: the 200 MB notice (said before any edit)', () => {
  it('a book over the cap says plainly that the original cannot be kept', () => {
    const html = renderToString(
      <PagesGrid bridge={bridge({ size: 250_000_000 })} />,
    )
    expect(html).toContain('pg-cap-notice')
    expect(html).toContain('250 MB')
    expect(html).not.toContain('data-testid="pg-restore"')
  })
  it('a normal book shows no notice and no Restore before its first edit', () => {
    const html = renderToString(<PagesGrid bridge={bridge({})} />)
    expect(html).not.toContain('pg-cap-notice')
    expect(html).not.toContain('data-testid="pg-restore"')
  })
  it('once the first copy is kept, Restore original shows', () => {
    const html = renderToString(
      <PagesGrid bridge={bridge({ hasOriginal: true })} />,
    )
    expect(html).toContain('data-testid="pg-restore"')
  })
  it('shows a page picture cell per page', () => {
    const html = renderToString(<PagesGrid bridge={bridge({})} />)
    expect(html.match(/data-testid="book-thumb"/g)).toHaveLength(3)
  })
})
