import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useRef, useState } from 'react'
import { AppUiContext } from '../app/appUi'
import { downloadFile } from '../app/download'
import { runTask } from '../app/errors'
import { ConfirmDialog } from '../app/ui'
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
  exportWorkspaceBundle,
  workspaceFileName,
  type Bundle,
} from './bundle'
import {
  fileToSave,
  lockedFileName,
  PasswordNeeded,
  WrongPassword,
  readImportFile,
} from './fileIO'
import { NO_LOCK, passwordProblem } from './lockState'
import { FileButton } from './FileButton'
import { PasswordFields } from './PasswordFields'
import { PasswordInput } from './PasswordInput'
import { recordBackupSaved } from './backupReminder'
import { importBundle, type ImportSummary } from './importBundle'
import {
  listSampleNotebooks,
  loadSampleNotebook,
  removeSampleNotebooks,
} from './sampleNotebook'

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
  const [asking, setAsking] = useState<'again' | 'remove' | null>(null)
  const samples = useLiveQuery(
    () => listSampleNotebooks(db, workspaceId),
    [db, workspaceId],
  )
  const [withJournal, setWithJournal] = useState(true)
  const [withTemplates, setWithTemplates] = useState(true)
  const [lock, setLock] = useState(NO_LOCK)
  /** A protected file waiting for its password. */
  const [locked, setLocked] = useState<File | null>(null)
  const [openPassword, setOpenPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [forgot, setForgot] = useState(false)
  const passwordBox = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const lockProblem = lock.protect
    ? passwordProblem(lock.password, lock.again)
    : ''
  const savePassword = lock.protect ? lock.password : undefined
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
  const addSample = () =>
    run(async () => {
      const notebook = await loadSampleNotebook(db, workspaceId)
      ui.toast(t('data.sample.done', { name: notebook.title }))
    })
  /** Writes the file (locked if the password box is ticked). */
  const save = async (name: string, blob: Blob) => {
    const file = await fileToSave(blob, savePassword)
    const fileName = savePassword ? lockedFileName(name) : name
    downloadFile(fileName, file)
    ui.toast(t('csv.exported', { name: fileName }))
  }
  /** Reads a chosen file; a protected one waits for its password. */
  const openFile = (file: File, password?: string) =>
    run(async () => {
      try {
        await importBundleNow(await readImportFile(file, password))
        setLocked(null)
        setOpenPassword('')
        setPasswordError('')
        setForgot(false)
      } catch (e) {
        if (e instanceof PasswordNeeded) setLocked(file)
        else if (e instanceof WrongPassword) {
          setPasswordError(e.message)
          setOpenPassword('')
          passwordBox.current?.focus()
        } else throw e
      }
    })
  const [progress, setProgress] = useState('')
  /** Anki's .apkg: read, then added as a new notebook. Loaded only now. */
  const importAnkiFile = (file: File) =>
    run(async () => {
      try {
        if (file.size > 400_000_000)
          throw new BundleError(t('data.anki.tooBig'))
        setProgress(t('data.anki.working'))
        const [{ readApkg, AnkiError }, { importAnki }] = await Promise.all([
          import('../anki/readApkg'),
          import('../anki/importApkg'),
        ])
        let collection
        try {
          collection = await readApkg(new Uint8Array(await file.arrayBuffer()))
        } catch (e) {
          if (e instanceof AnkiError) throw new BundleError(e.message)
          throw e
        }
        const summary = await importAnki(
          db,
          workspaceId,
          collection,
          file.name.replace(/\.apkg$/i, ''),
          (done, total) =>
            setProgress(t('data.anki.progress', { done, total })),
        )
        ui.toast(
          [
            t('data.anki.done', {
              cards: summary.cards,
              name: summary.notebookTitle,
            }),
            summary.skipped > 0 &&
              t('data.anki.skipped', { count: summary.skipped }),
            summary.media > 0 && t('data.anki.media', { count: summary.media }),
          ]
            .filter(Boolean)
            .join(' '),
        )
      } finally {
        setProgress('')
      }
    })
  const exportAnkiFile = () =>
    run(async () => {
      const { exportApkg } = await import('../anki/exportApkg')
      let result
      try {
        result = await exportApkg(db, notebookId)
      } catch (e) {
        throw new BundleError(e instanceof Error ? e.message : String(e))
      }
      downloadFile(
        result.fileName,
        new Blob([result.file as BlobPart], {
          type: 'application/octet-stream',
        }),
      )
      ui.toast(
        t('data.anki.exported', { cards: result.cards, name: result.fileName }),
      )
    })
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
      <div className="mx-auto max-w-[760px] px-4 pt-8 pb-24 phone:pt-16 md:px-12 md:pt-12">
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
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={withJournal}
                onChange={(e) => setWithJournal(e.target.checked)}
              />
              {t('data.export.journal')}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={withTemplates}
                onChange={(e) => setWithTemplates(e.target.checked)}
              />
              {t('data.export.templates')}
            </label>
          </div>
          <PasswordFields lock={lock} onChange={setLock} />
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
                disabled={!notebookId || busy || !!lockProblem}
                onClick={() =>
                  run(async () => {
                    const bundle = await exportNotebookBundle(db, notebookId, {
                      journal: withJournal,
                      templates: withTemplates,
                    })
                    await save(
                      bundleFileName(bundle.notebooks[0]),
                      bundleFile(bundle),
                    )
                  })
                }
                className={button}
              >
                {t('data.export.button')}
              </button>
            </Tip>
          </div>
        </section>

        <section aria-label={t('data.all.title')} className={box}>
          <h2 className="mb-1 text-[15px] font-semibold">
            {t('data.all.title')}
          </h2>
          <p className="mb-3 text-sm text-muted">{t('data.all.text')}</p>
          <p className="mb-3 text-xs text-muted">
            {t('data.all.passwordHint')}
          </p>
          <Tip id="data.exportAll" touchInfo={false}>
            <button
              type="button"
              disabled={busy || !!lockProblem}
              onClick={() =>
                run(async () => {
                  const bundle = await exportWorkspaceBundle(db)
                  await save(workspaceFileName(), bundleFile(bundle))
                  await recordBackupSaved(db)
                })
              }
              className={button}
            >
              {t('data.all.button')}
            </button>
          </Tip>
        </section>

        <section aria-label={t('data.anki.title')} className={box}>
          <h2 className="mb-1 text-[15px] font-semibold">
            {t('data.anki.title')}
          </h2>
          <p className="mb-3 text-sm text-muted">{t('data.anki.text')}</p>
          {progress && (
            <p role="status" className="mb-3 text-sm text-muted">
              {progress}
            </p>
          )}
          <div className="flex flex-wrap items-start gap-2">
            <Tip id="data.ankiImport" touchInfo={false}>
              <FileButton
                label={t('data.anki.import')}
                hint={t('data.anki.hint')}
                accept=".apkg,application/octet-stream"
                disabled={busy}
                onFile={importAnkiFile}
              />
            </Tip>
            <select
              aria-label={t('data.anki.which')}
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
            <Tip id="data.ankiExport" touchInfo={false}>
              <button
                type="button"
                disabled={!notebookId || busy}
                onClick={() => exportAnkiFile()}
                className={button}
              >
                {t('data.anki.export')}
              </button>
            </Tip>
          </div>
        </section>

        <section aria-label={t('data.sample.title')} className={box}>
          <h2 className="mb-1 text-[15px] font-semibold">
            {t('data.sample.title')}
          </h2>
          <p className="mb-3 text-sm text-muted">{t('data.sample.text')}</p>
          <div className="flex flex-wrap gap-2">
            <Tip id="data.sample" touchInfo={false}>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  samples && samples.length > 0
                    ? setAsking('again')
                    : addSample()
                }
                className={button}
              >
                {t('data.sample.button')}
              </button>
            </Tip>
            <Tip id="data.sampleRemove" touchInfo={false}>
              <button
                type="button"
                disabled={busy || !samples || samples.length === 0}
                onClick={() => setAsking('remove')}
                className={button}
              >
                {t('data.sample.remove')}
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
            <FileButton
              label={t('data.import.file')}
              disabled={busy}
              onFile={(file) => {
                setLocked(null)
                setPasswordError('')
                setForgot(false)
                openFile(file)
              }}
            />
          </Tip>
          {locked && (
            <form
              className="mt-3 grid gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                openFile(locked, openPassword)
              }}
            >
              <p className="text-sm">
                {t('data.locked.text', { name: locked.name })}
              </p>
              <div className="flex flex-wrap items-start gap-2">
                <PasswordInput
                  inputRef={passwordBox}
                  label={t('data.locked.password')}
                  value={openPassword}
                  error={passwordError}
                  onChange={(value) => {
                    setOpenPassword(value)
                    setPasswordError('')
                  }}
                  className="min-w-48 flex-1"
                />
                <button
                  type="submit"
                  disabled={busy || openPassword === ''}
                  className={button}
                >
                  {t('data.locked.open')}
                </button>
              </div>
              <button
                type="button"
                aria-expanded={forgot}
                onClick={() => setForgot(!forgot)}
                className="min-h-9 justify-self-start text-[13px] text-accent underline"
              >
                {t('data.locked.forgot')}
              </button>
              {forgot && (
                <p
                  role="note"
                  className="rounded-lg bg-soft p-2.5 text-[13px] leading-relaxed"
                >
                  {t('data.locked.forgotText')}
                </p>
              )}
            </form>
          )}
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
        {asking === 'again' && (
          <ConfirmDialog
            message={t('data.sample.again')}
            confirmLabel={t('data.sample.addAnother')}
            onCancel={() => setAsking(null)}
            onConfirm={() => {
              setAsking(null)
              addSample()
            }}
          />
        )}
        {asking === 'remove' && (
          <ConfirmDialog
            message={t('data.sample.removeMessage')}
            confirmLabel={t('data.sample.removeConfirm')}
            onCancel={() => setAsking(null)}
            onConfirm={() => {
              setAsking(null)
              run(async () => {
                const count = await removeSampleNotebooks(db, workspaceId)
                ui.toast(t('data.sample.removed', { count }))
              })
            }}
          />
        )}
      </div>
    </div>
  )
}
