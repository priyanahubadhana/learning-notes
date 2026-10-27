import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useState } from 'react'
import { AppUiContext } from '../app/appUi'
import { downloadFile } from '../app/download'
import { runTask } from '../app/errors'
import type { LearningNotesDB } from '../core/db'
import { DEFAULT_DB_NAME } from '../core/db'
import { readBrowserBackup } from '../core/upgradeBackup'
import { Tip } from '../help/Help'
import { t } from '../i18n/t'
import { listNotebooks } from '../notebooks/notebookService'
import {
  BundleError,
  bundleFile,
  bundleFileName,
  bundleFromSnapshot,
  exportNotebookBundle,
  MAX_BUNDLE_BYTES,
  readAnyFile,
  type Bundle,
} from './bundle'
import { importBundle, type ImportSummary } from './importBundle'

/**
 * "Backup & files": save a notebook as a file, bring a file (or a backup
 * file) in, and restore the automatic backup the app keeps in this browser
 * before an upgrade. Everything that comes in is added as new copies.
 */
export function DataScreen({
  db,
  workspaceId,
  onClose,
}: {
  db: LearningNotesDB
  workspaceId: string
  onClose: () => void
}) {
  const ui = useContext(AppUiContext)
  const notebooks = useLiveQuery(
    async () => (await listNotebooks(db, workspaceId)).filter((n) => !n.kind),
    [db, workspaceId],
  )
  const backup = useLiveQuery(
    async () => (await readBrowserBackup(DEFAULT_DB_NAME)) ?? null,
    [],
  )
  const [picked, setPicked] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const notebookId = picked || notebooks?.[0]?.id || ''

  const done = (summary: ImportSummary) =>
    ui.toast(
      t('data.imported', {
        notebooks: summary.notebooks,
        pages: summary.pages,
        cards: summary.cards,
      }),
    )
  const run = (work: () => Promise<void>) => {
    setError('')
    setBusy(true)
    runTask(
      work()
        .catch((e: unknown) => {
          if (e instanceof BundleError) setError(e.message)
          else throw e
        })
        .finally(() => setBusy(false)),
    )
  }
  const importBundleNow = async (bundle: Bundle) => {
    if (bundle.notebooks.length === 0 && bundle.databases.length === 0) {
      setError(t('data.nothing'))
      return
    }
    done(await importBundle(db, workspaceId, bundle))
  }

  const box = 'mb-5 rounded-xl border border-line p-4'
  const button =
    'min-h-9 rounded-lg border border-line px-3 text-[13px] hover:bg-hover disabled:opacity-50'

  return (
    <div className="phone:fixed phone:inset-0 phone:z-30 phone:overflow-auto phone:bg-bg">
      <div className="mx-auto max-w-[760px] px-4 pt-8 pb-24 phone:pt-3 md:px-12 md:pt-12">
        <div className="mb-4 flex items-center gap-2">
          <h1 className="flex-1 text-[26px] leading-tight font-bold tracking-[-0.02em]">
            {t('data.title')}
          </h1>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('databases.close')}
            className="hidden size-11 items-center justify-center rounded-lg text-lg text-muted hover:bg-hover hover:text-ink phone:flex"
          >
            ×
          </button>
        </div>
        <p className="mb-5 text-sm text-muted">{t('data.intro')}</p>
        {error && (
          <p role="alert" className="mb-4 text-sm text-danger">
            {error}
          </p>
        )}

        <section aria-label={t('data.export.title')} className={box}>
          <h2 className="mb-1 text-[15px] font-semibold">
            {t('data.export.title')}
          </h2>
          <p className="mb-3 text-sm text-muted">{t('data.export.text')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label={t('data.export.which')}
              value={notebookId}
              onChange={(e) => setPicked(e.target.value)}
              className="min-h-9 min-w-0 flex-1 rounded-lg border border-line bg-bg px-2 text-[13px]"
            >
              {notebooks?.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title || t('review.untitled')}
                </option>
              ))}
            </select>
            <Tip id="data.export" touchInfo={false}>
              <button
                type="button"
                disabled={!notebookId || busy}
                onClick={() =>
                  run(async () => {
                    const bundle = await exportNotebookBundle(db, notebookId)
                    const name = bundleFileName(bundle.notebooks[0])
                    downloadFile(name, bundleFile(bundle))
                    ui.toast(t('csv.exported', { name }))
                  })
                }
                className={button}
              >
                {t('data.export.button')}
              </button>
            </Tip>
          </div>
        </section>

        <section aria-label={t('data.import.title')} className={box}>
          <h2 className="mb-1 text-[15px] font-semibold">
            {t('data.import.title')}
          </h2>
          <p className="mb-3 text-sm text-muted">{t('data.import.text')}</p>
          <Tip id="data.import" touchInfo={false}>
            <input
              type="file"
              accept=".json,application/json"
              aria-label={t('data.import.file')}
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                run(async () => {
                  if (file.size > MAX_BUNDLE_BYTES)
                    throw new BundleError(t('data.tooBig'))
                  await importBundleNow(readAnyFile(await file.text()))
                })
              }}
              className="block w-full text-sm"
            />
          </Tip>
        </section>

        <section aria-label={t('data.restore.title')} className={box}>
          <h2 className="mb-1 text-[15px] font-semibold">
            {t('data.restore.title')}
          </h2>
          <p className="mb-3 text-sm text-muted">{t('data.restore.text')}</p>
          {backup === undefined ? null : backup === null ? (
            <p className="text-sm text-muted">{t('data.restore.none')}</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="me-auto text-sm">
                {t('data.restore.info', {
                  date: new Intl.DateTimeFormat(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(backup.createdAt),
                  notebooks: bundleFromSnapshot(backup).notebooks.length,
                })}
              </span>
              <Tip id="data.restore" touchInfo={false}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(() => importBundleNow(bundleFromSnapshot(backup)))
                  }
                  className={button}
                >
                  {t('data.restore.button')}
                </button>
              </Tip>
            </div>
          )}
        </section>
        <p className="text-xs text-muted">{t('data.notIncluded')}</p>
      </div>
    </div>
  )
}
