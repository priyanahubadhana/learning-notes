import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useRef, useState } from 'react'
import { AppUiContext } from '../app/appUi'
import { ConfirmDialog, IconButton, MenuPopover } from '../app/ui'
import { useLongPress } from '../app/useLongPress'
import { deletePage } from '../pages/pageService'
import { runTask } from '../app/errors'
import { isBigBook, megabytes } from '../core/bookFormat'
import type { LearningNotesDB } from '../core/db'
import type { Page } from '../core/types'
import { t } from '../i18n/t'
import { useImageUrl } from '../images/useImageUrl'
import { imageRef } from '../images/imageRef'
import { inspectBook } from './inspect'
import {
  LibraryError,
  continueTarget,
  importBook,
  listSources,
  progressPercent,
  readStatus,
  type SourceFilter,
} from './libraryService'

const FILTERS: SourceFilter[] = ['all', 'books', 'videos', 'articles', 'pasted']

/**
 * The Library space (C1/CR1): every book and captured source as a card with a
 * cover, a progress bar and Continue. Import with the button, or drop files
 * (PC); links and text dropped here open Capture.
 */
export function LibraryScreen({
  db,
  workspaceId,
  onOpenPage,
  onRead,
  onCapture,
}: {
  db: LearningNotesDB
  workspaceId: string
  onOpenPage: (pageId: string) => void
  onRead: (pageId: string, at?: string) => void
  onCapture: (draft?: { url?: string; title?: string; text?: string }) => void
}) {
  const { toast } = useContext(AppUiContext)
  const [filter, setFilter] = useState<SourceFilter>('all')
  const [busy, setBusy] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const [pendingDelete, setPendingDelete] = useState<Page | null>(null)
  const sources = useLiveQuery(
    () => listSources(db, workspaceId, filter),
    [db, workspaceId, filter],
  )

  const importFiles = async (files: File[]) => {
    for (const file of files) {
      setBusy(`${file.name} (${megabytes(file.size)} MB)`)
      if (isBigBook(file.size)) toast(t('library.bigFile'))
      try {
        const page = await importBook(db, workspaceId, file, inspectBook)
        toast(t('library.imported', { title: page.title || file.name }))
      } catch (e) {
        if (e instanceof LibraryError) toast(e.message)
        else throw e
      } finally {
        setBusy(null)
      }
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) return void runTask(importFiles(files))
    const url = e.dataTransfer.getData('text/uri-list').split('\n')[0]?.trim()
    const text = e.dataTransfer.getData('text/plain')
    if (url || text)
      onCapture({ url: url || undefined, text: url ? undefined : text })
  }

  const start = (page: Page) =>
    runTask(
      (async () => {
        const target = await continueTarget(db, page)
        if (target.kind === 'read') onRead(page.id, target.at)
        else onOpenPage(target.id)
      })(),
    )

  return (
    <div
      className="mx-auto max-w-[1100px] px-4 pt-8 pb-24 md:px-12 md:pt-12"
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      data-testid="library"
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="flex-1 text-[26px] leading-tight font-bold tracking-[-0.02em]">
          {t('library.title')}
        </h1>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept=".pdf,.epub,.docx,application/pdf,application/epub+zip"
          className="sr-only"
          aria-label={t('library.importHint')}
          data-testid="library-file"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ''
            if (files.length) void runTask(importFiles(files))
          }}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={busy !== null}
          className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {t('library.import')}
        </button>
        <button
          type="button"
          onClick={() => onCapture()}
          className="min-h-11 rounded-lg border border-line px-4 text-sm hover:bg-hover"
        >
          {t('library.capture')}
        </button>
      </div>
      <p className="mb-4 text-xs text-muted">{t('library.importHint')}</p>
      {busy && (
        <p role="status" className="mb-3 text-sm text-muted">
          {t('library.saving', { name: busy })}
        </p>
      )}
      <div
        role="group"
        aria-label={t('library.filters')}
        className="mb-5 flex flex-wrap gap-2"
      >
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`min-h-11 rounded-full border px-4 text-sm ${
              filter === f
                ? 'border-accent bg-accent/10 text-ink'
                : 'border-line text-muted hover:bg-hover'
            }`}
          >
            {t(`library.filter.${f}`)}
          </button>
        ))}
      </div>
      {dragging && (
        <p className="mb-4 rounded-lg border border-dashed border-accent p-4 text-center text-sm">
          {t('library.drop')}
        </p>
      )}
      {sources === undefined ? null : sources.length === 0 ? (
        <p className="mt-10 text-center text-muted">
          {t(filter === 'all' ? 'library.empty' : 'library.emptyFilter')}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {sources.map((page) => (
            <li key={page.id}>
              <SourceCard
                page={page}
                onOpenPage={() => onOpenPage(page.id)}
                onStart={() => void start(page)}
                onDelete={() => setPendingDelete(page)}
              />
            </li>
          ))}
        </ul>
      )}
      {pendingDelete && (
        <ConfirmDialog
          message={t('sidebar.confirm.page', {
            name: pendingDelete.title || t('review.untitled'),
          })}
          confirmLabel={t('ui.delete')}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            const page = pendingDelete
            setPendingDelete(null)
            runTask(deletePage(db, page.id))
          }}
        />
      )}
    </div>
  )
}

function SourceCard({
  page,
  onOpenPage,
  onStart,
  onDelete,
}: {
  page: Page
  onOpenPage: () => void
  onStart: () => void
  onDelete: () => void
}) {
  // The ⋯ button or a press-and-hold (finger or Pencil) opens the actions.
  const [menuAt, setMenuAt] = useState<DOMRect | null>(null)
  const hold = useLongPress((x, y) => {
    const card = document.elementFromPoint(x, y)?.closest('article')
    if (card) setMenuAt(card.getBoundingClientRect())
  }, true)
  const source = page.source
  const cover = useImageUrl(
    source?.coverImageId ? imageRef(source.coverImageId) : null,
  )
  const status = readStatus(source)
  const percent = progressPercent(source)
  const title = page.title || t('review.untitled')
  return (
    <article
      data-chrome
      data-testid="source-card"
      {...hold}
      className="relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-bg"
    >
      <button
        type="button"
        onClick={onOpenPage}
        className="block aspect-[3/4] w-full overflow-hidden bg-soft"
        aria-label={title}
      >
        {cover ? (
          <img
            src={cover}
            alt={t('library.cover', { title })}
            className="size-full object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center p-3 text-center text-sm text-muted">
            {t(`library.kind.${source?.kind ?? 'file'}`)}
          </span>
        )}
      </button>
      <IconButton
        tip="library.cardMenu"
        bare
        tipClassName="absolute top-1 right-1 inline-flex"
        data-testid="source-menu-button"
        aria-label={t('library.cardMenu')}
        aria-haspopup="menu"
        onClick={(e) => setMenuAt(e.currentTarget.getBoundingClientRect())}
        className="grid size-11 place-items-center rounded-full bg-bg/80 text-ink-soft hover:bg-hover"
      >
        ⋯
      </IconButton>
      {menuAt && (
        <MenuPopover
          anchor={menuAt}
          onClose={() => setMenuAt(null)}
          items={[
            { label: t('library.openNotes'), icon: '📄', onSelect: onOpenPage },
            { label: t('ui.delete'), icon: '🗑', onSelect: onDelete },
          ]}
        />
      )}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h2 className="line-clamp-2 text-sm font-semibold">{title}</h2>
        <p className="line-clamp-1 text-xs text-muted">
          {source?.author ?? t(`library.kind.${source?.kind ?? 'file'}`)}
        </p>
        {source?.kind === 'book' && (
          <div className="mt-1">
            <div
              role="progressbar"
              aria-label={t('library.progressLabel', { percent })}
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 overflow-hidden rounded-full bg-soft"
            >
              <div
                className="h-full bg-accent"
                style={{ inlineSize: `${percent}%` }}
              />
            </div>
            <span className="text-xs text-muted">
              {t('library.progress', { percent })}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={onStart}
          className="mt-auto min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover"
        >
          {source?.kind !== 'book'
            ? t('library.open')
            : status === 'finished'
              ? t('library.readAgain')
              : status === 'reading'
                ? `▶ ${t('library.continue')}`
                : `▶ ${t('library.startReading')}`}
        </button>
      </div>
    </article>
  )
}
