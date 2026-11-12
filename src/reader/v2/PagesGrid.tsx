import { useMemo, useState } from 'react'
import { Icon } from '../../app/tools/icons'
import { ReorderList } from '../../design/parts/drag/ReorderList'
import { SheetBase } from '../../design/parts/SheetBase'
import { t } from '../../i18n/t'
import { Thumb } from '../BookPanel'
import type { ReaderBridge } from '../readerBridge'
import { originalCapNotice } from './originalCopy'
import { TopSheet } from './StickyDialogs'
import './readerV2.css'

const THUMB = 96

interface Cell {
  id: string
  n: number
}

/**
 * The Pages tab of a PDF in the new reader (slice 7f, RD-B36 to RD-B41).
 * Every change here is made to the REAL book (see usePageEdit): drag a page
 * (hold 0.3 s or use the grip; Alt+arrows too), turn it, delete it, add a
 * blank page. Each shows a toast with Undo. "Restore original" brings back
 * the first copy of the book (kept on this device, up to 200 MB).
 */
export default function PagesGrid({ bridge }: { bridge: ReaderBridge }) {
  const edit = bridge.pageEdit
  const doc = bridge.doc
  const count = bridge.pageCount || doc?.numPages || 0
  const [picked, setPicked] = useState<number | null>(null)
  const [asking, setAsking] = useState(false)
  const selected = Math.min(Math.max(picked ?? bridge.page, 1), count || 1)
  const cells = useMemo<Cell[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({ id: `p${i + 1}`, n: i + 1 })),
    [count],
  )
  if (!doc || !edit) return null
  const busy = edit.busy
  // Said BEFORE any edit: this book is too big to keep a first copy of.
  const notice = edit.hasOriginal ? null : originalCapNotice(edit.size)
  const run = edit.run
  const pick = (n: number) => {
    setPicked(n)
    bridge.go(`pdf:${n}:0`)
  }

  const tool = (
    id: string,
    label: string,
    icon: 'plus' | 'rotate' | 'trash',
    onClick: () => void,
    off = false,
  ) => (
    <button
      type="button"
      className="rv2-pg-chip"
      data-testid={`pg-${id}`}
      disabled={busy || off}
      onClick={onClick}
    >
      <Icon name={icon} size={16} />
      <span>{label}</span>
    </button>
  )

  return (
    <div
      className="rv2-pg"
      data-testid="book-thumbs"
      data-busy={busy || undefined}
    >
      <div
        className="rv2-pg-tools"
        role="toolbar"
        aria-label={t('readerv2.pages.tools')}
      >
        {tool(
          'blank',
          t('readerv2.pages.blank'),
          'plus',
          () => void run(count, { kind: 'blank', after: selected }),
        )}
        {tool(
          'turn',
          t('readerv2.pages.turnRight'),
          'rotate',
          () => void run(count, { kind: 'turn', at: selected, by: 90 }),
        )}
        {tool(
          'delete',
          t('readerv2.pages.delete'),
          'trash',
          () => void run(count, { kind: 'delete', at: selected }),
          count < 2,
        )}
        {edit.hasOriginal && (
          <button
            type="button"
            className="rv2-pg-chip"
            data-testid="pg-restore"
            disabled={busy}
            onClick={() => setAsking(true)}
          >
            <Icon name="undo" size={16} />
            <span>{t('readerv2.pages.restore')}</span>
          </button>
        )}
      </div>
      {notice && (
        <p className="rv2-pg-note" role="note" data-testid="pg-cap-notice">
          {notice}
        </p>
      )}
      <div
        className="rv2-pg-wrap"
        onClick={(e) => {
          const target = e.target as Element
          if (target.closest('.rord-grip')) return
          const id = target
            .closest('[data-reorder-id]')
            ?.getAttribute('data-reorder-id')
          if (id) pick(Number(id.slice(1)))
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return
          const el = e.target as Element
          if (!el.hasAttribute('data-reorder-id')) return
          e.preventDefault()
          pick(Number(el.getAttribute('data-reorder-id')!.slice(1)))
        }}
      >
        <ReorderList<Cell>
          items={cells}
          getId={(c) => c.id}
          axis="grid"
          cols={2}
          handle="both"
          disabled={busy}
          label={(c) => t('readerv2.pages.pageName', { n: c.n })}
          aria-label={t('readerv2.pages.label')}
          testId="pg-list"
          className="rv2-pg-grid"
          onMove={(id, toIndex) => {
            const from = Number(id.slice(1))
            void run(count, { kind: 'move', from, to: toIndex + 1 })
          }}
          renderItem={(c, ctx) => (
            <div
              className="rv2-pg-cell"
              data-selected={c.n === selected ? '' : undefined}
              data-current={c.n === bridge.page ? '' : undefined}
            >
              {/* Taps are read on the wrapper (a pressed page is captured by the shared Drag part, so a click would not reach this child). */}
              <div
                role="button"
                data-chrome
                data-testid="book-thumb"
                data-page={c.n}
                aria-label={t('bookpanel.thumb', { n: c.n })}
                aria-current={c.n === bridge.page ? 'page' : undefined}
                aria-pressed={c.n === selected}
                className="rv2-pg-thumb"
              >
                <Thumb doc={doc} page={c.n} width={THUMB} />
                <span className="rv2-pg-num tabular-nums">{c.n}</span>
              </div>
              <span className="rv2-pg-grip">{ctx.grip}</span>
            </div>
          )}
        />
      </div>
      {asking && (
        <TopSheet small onClose={() => setAsking(false)}>
          <SheetBase
            mode="inline"
            phone={false}
            title={t('readerv2.pages.restoreTitle')}
            onClose={() => setAsking(false)}
            data-testid="pg-restore-dialog"
            footer={
              <>
                <button
                  type="button"
                  className="rv2-stk-foot"
                  data-testid="pg-restore-no"
                  onClick={() => setAsking(false)}
                >
                  {t('readerv2.pages.restoreNo')}
                </button>
                <button
                  type="button"
                  className="rv2-stk-foot rv2-stk-foot--main"
                  data-testid="pg-restore-yes"
                  onClick={() => {
                    setAsking(false)
                    void edit.restore()
                  }}
                >
                  {t('readerv2.pages.restoreYes')}
                </button>
              </>
            }
          >
            <p className="rv2-pg-body">{t('readerv2.pages.restoreBody')}</p>
          </SheetBase>
        </TopSheet>
      )}
    </div>
  )
}
