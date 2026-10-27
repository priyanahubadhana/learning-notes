import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { runTask } from '../app/errors'
import type { LearningNotesDB } from '../core/db'
import type { PageVersion } from '../core/types'
import { t } from '../i18n/t'
import { previewLines } from './previewLines'
import { KEEP_VERSIONS, listVersions, restoreVersion } from './versionService'

const when = (time: number) =>
  new Date(time).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

/**
 * Earlier copies of a page: pick one on the left, read it on the right,
 * "Restore this copy" brings it back (the page as it is now is kept first).
 */
export function HistoryDialog({
  db,
  pageId,
  onClose,
  onRestored,
}: {
  db: LearningNotesDB
  pageId: string
  onClose: () => void
  /** Called after a restore, so the open editor can reload. */
  onRestored: (version: PageVersion) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const versions = useLiveQuery(() => listVersions(db, pageId), [db, pageId])
  const [pickedId, setPickedId] = useState<string | null>(null)
  useEffect(() => ref.current?.showModal(), [])

  const current = versions?.find((v) => v.id === pickedId) ?? versions?.[0]
  const lines = current ? previewLines(current.blocks) : []

  return (
    <dialog
      ref={ref}
      aria-label={t('history.title')}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className="m-auto h-[min(34rem,calc(100vh-2rem))] w-[min(46rem,calc(100vw-2rem))] rounded-xl border border-line bg-bg p-0 text-ink shadow-[0_12px_32px_rgba(0,0,0,0.14)] backdrop:bg-black/20"
    >
      <div className="flex h-full flex-col p-5">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="flex-1 text-[15px] font-semibold">
            {t('history.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2.5 py-1 text-[13px] hover:bg-hover"
          >
            {t('history.close')}
          </button>
        </div>
        {!versions ? null : versions.length === 0 ? (
          <p className="text-sm text-muted">{t('history.empty')}</p>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[13rem_minmax(0,1fr)]">
            <ul
              aria-label={t('history.list')}
              className="flex gap-1.5 overflow-x-auto md:grid md:content-start md:gap-0.5 md:overflow-y-auto"
            >
              {versions.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    aria-pressed={v.id === current?.id}
                    onClick={() => setPickedId(v.id)}
                    className="min-h-9 w-full rounded-lg px-2.5 text-start text-sm whitespace-nowrap hover:bg-hover aria-pressed:bg-soft aria-pressed:font-semibold"
                  >
                    {when(v.createdAt)}
                  </button>
                </li>
              ))}
            </ul>
            {current && (
              <section
                aria-label={t('history.preview', {
                  when: when(current.createdAt),
                })}
                className="flex min-h-0 flex-col"
              >
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="flex-1 truncate text-[17px] font-semibold">
                    {current.title || t('review.untitled')}
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      runTask(
                        (async () => {
                          await restoreVersion(db, current.id)
                          onRestored(current)
                        })(),
                      )
                    }
                    className="rounded-lg bg-accent px-3 py-1.5 text-[13px] text-white hover:opacity-90"
                  >
                    {t('history.restore')}
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-line p-3 text-sm whitespace-pre-wrap">
                  {lines.length > 0 ? (
                    lines.join('\n')
                  ) : (
                    <span className="text-muted">{t('history.blank')}</span>
                  )}
                </div>
              </section>
            )}
          </div>
        )}
        <p className="mt-3 text-xs text-muted">
          {t('history.keep', { count: String(KEEP_VERSIONS) })}
        </p>
      </div>
    </dialog>
  )
}
