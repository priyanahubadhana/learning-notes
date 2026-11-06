import { useEffect, useRef } from 'react'
import { t } from '../i18n/t'
import { formatSize } from './formatSize'
import type { SavedFile } from './fileIO'

const when = (ms: number) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(ms)

/** What a chosen file holds: notebooks, pages, cards (and pictures). */
function facts(file: SavedFile) {
  if (file.type === 'zip') {
    const { counts, kind, createdAt } = file.manifest
    return {
      savedAt: createdAt,
      notebooks: counts.notebooks,
      pages: counts.pages,
      cards: counts.cards,
      also:
        kind === 'full'
          ? t('restore.dlg.alsoFull', { count: counts.pictures })
          : t('restore.dlg.alsoNotes', { count: counts.pictures }),
    }
  }
  const { bundle } = file
  return {
    savedAt: bundle.exportedAt,
    notebooks: bundle.notebooks.length,
    pages: bundle.pages.length,
    cards: bundle.cards.length,
    also: '',
  }
}

/**
 * The question after "Open saved file": what the file holds and two ways to
 * bring it in. Replace only for new full files of this app's version.
 */
export function RestoreDialog({
  file,
  canReplace,
  disabled,
  onReplace,
  onCopies,
  onCancel,
}: {
  file: SavedFile
  canReplace: boolean
  disabled: boolean
  onReplace: () => void
  onCopies: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
  }, [])
  const info = facts(file)
  const choice =
    'grid min-h-11 gap-0.5 rounded-lg border border-line px-3.5 py-2.5 text-start hover:bg-hover disabled:opacity-50'
  return (
    <dialog
      ref={ref}
      aria-labelledby="restore-dialog-title"
      onCancel={onCancel}
      onClick={(e) => {
        if (e.target === ref.current) onCancel()
      }}
      className="m-auto w-[min(440px,calc(100%-32px))] rounded-xl border border-line bg-bg p-5 text-ink shadow-[0_12px_32px_rgba(0,0,0,0.14)] backdrop:bg-black/40"
    >
      <h2
        id="restore-dialog-title"
        className="mb-3 text-[15px] font-semibold break-words"
      >
        {file.name}
      </h2>
      <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-soft px-3 py-2.5 text-[13px] tabular-nums">
        <dt className="text-muted">{t('restore.dlg.saved')}</dt>
        <dd>{info.savedAt ? when(info.savedAt) : '–'}</dd>
        <dt className="text-muted">{t('restore.dlg.contains')}</dt>
        <dd>
          {t('restore.dlg.contents', {
            notebooks: info.notebooks,
            pages: info.pages,
            cards: info.cards,
          })}
        </dd>
        {info.also && (
          <>
            <dt className="text-muted">{t('restore.dlg.also')}</dt>
            <dd>{info.also}</dd>
          </>
        )}
        <dt className="text-muted">{t('restore.dlg.size')}</dt>
        <dd>{formatSize(file.size)}</dd>
      </dl>
      <div className="grid gap-2">
        {canReplace ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onReplace}
            className={choice}
          >
            <b className="text-[14px] text-danger">{t('restore.replace')}</b>
            <span className="text-xs text-muted">
              {t('restore.replace.text')}
            </span>
          </button>
        ) : (
          <p role="note" className="text-[13px] text-muted">
            {file.type === 'json'
              ? t('restore.onlyCopies')
              : t('restore.olderVersion')}
          </p>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={onCopies}
          className={choice}
        >
          <b className="text-[14px]">{t('restore.copies')}</b>
          <span className="text-xs text-muted">{t('restore.copies.text')}</span>
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-lg px-3 text-[13px] text-muted hover:bg-hover hover:text-ink"
        >
          {t('ui.cancel')}
        </button>
      </div>
    </dialog>
  )
}
