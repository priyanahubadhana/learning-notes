import { sampleName } from '../i18n/defaultNames'
import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useEffect, useRef, useState } from 'react'
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
  checkBundle,
  exportNotebookBundle,
  type Bundle,
} from './bundle'
import {
  fileToSave,
  lockedFileName,
  openSavedFile,
  PasswordNeeded,
  WrongPassword,
  type SavedFile,
} from './fileIO'
import { NO_LOCK, passwordProblem } from './lockState'
import { FileButton } from './FileButton'
import { PasswordFields } from './PasswordFields'
import { PasswordInput } from './PasswordInput'
import { recordBackupSaved } from './backupReminder'
import { importBundle, type ImportSummary } from './importBundle'
import {
  fullFileName,
  MAX_FULL_BYTES,
  writeFullFile,
  type FullKind,
} from './fullFile'
import { formatSize } from './formatSize'
import { readFullFile } from './readFull'
import { RestoreDialog } from './RestoreDialog'
import {
  canReplaceFrom,
  fullToBundle,
  readRestoreMark,
  replaceWithFile,
  undoRestore,
} from './restore'
import {
  listSampleNotebooks,
  loadSampleNotebook,
  removeSampleNotebooks,
} from './sampleNotebook'

/** Remembers across the page reload that a restore or undo just happened. */
const FLAG = 'ln-restore-flag'

const when = (ms: number) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(ms)

/**
 * "Save & restore": save everything (or just the notes) as one file, bring
 * a saved file back by replacing the notes (with a safety copy and Undo) or
 * adding copies, share one notebook, and bring back the automatic copy made
 * before an upgrade. Anki and the sample notebook are under "More".
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
    async () =>
      (await readBrowserBackup(DEFAULT_DB_NAME, undefined, ['notebooks'])) ??
      null,
    [],
  )
  const mark = useLiveQuery(
    async () => (await readRestoreMark(db)) ?? null,
    [db],
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
  /** The file just opened, waiting for "Replace" or "Add as copies". */
  const [opened, setOpened] = useState<SavedFile | null>(null)
  const [restoring, setRestoring] = useState(false)
  /** The dark bar after a restore (kept across the reload that follows). */
  const [flag] = useState(() => {
    try {
      return sessionStorage.getItem(FLAG)
    } catch {
      return null
    }
  })
  const passwordBox = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const lockProblem = lock.protect
    ? passwordProblem(lock.password, lock.again)
    : ''
  const savePassword = lock.protect ? lock.password : undefined
  const [busy, setBusy] = useState(false)
  const notebookId = picked || notebooks?.[0]?.id || ''
  useEffect(() => {
    try {
      sessionStorage.removeItem(FLAG)
    } catch {
      // No storage: nothing to clear.
    }
    if (flag === 'undone') ui.toast(t('restore.undone'))
    // Only once, when the screen opens after the reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
          else {
            setError(t('data.failed'))
            throw e // logged; a full device also says so
          }
        })
        .finally(() => setBusy(false)),
    )
  }
  const addSample = () =>
    run(async () => {
      const notebook = await loadSampleNotebook(db, workspaceId)
      ui.toast(t('data.sample.done', { name: sampleName(notebook) }))
    })
  /** Writes a file (locked if the password box is ticked). */
  const save = async (name: string, blob: Blob, chunked = false) => {
    const file = await fileToSave(blob, savePassword, chunked)
    const fileName = savePassword ? lockedFileName(name) : name
    downloadFile(fileName, file)
    return { fileName, size: file.size }
  }
  const saveFull = (kind: FullKind) =>
    run(async () => {
      const blob = await writeFullFile(db, kind)
      const { fileName, size } = await save(
        fullFileName(Date.now(), kind),
        blob,
        true,
      )
      ui.toast(
        t(kind === 'full' ? 'data.saved.full' : 'data.saved.notes', {
          name: fileName,
          size: formatSize(size),
        }),
      )
      if (size > MAX_FULL_BYTES) setError(t('data.tooBigToRestore'))
      await recordBackupSaved(db)
    })
  /** Reads a chosen file; a protected one waits for its password. */
  const openFile = (file: File, password?: string) =>
    run(async () => {
      try {
        setOpened(await openSavedFile(file, db, password))
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
  /** "Replace my notes": check the whole file, keep a safety copy, write, reload. */
  const replace = (file: SavedFile) => {
    if (file.type !== 'zip') return
    setOpened(null)
    setRestoring(true)
    run(async () => {
      try {
        const parsed = await readFullFile(file.blob, db)
        await replaceWithFile(db, parsed)
        try {
          sessionStorage.setItem(FLAG, 'restored')
        } catch {
          // The Undo row still shows.
        }
        // The workspace and open page may be different now: start fresh.
        location.hash = '#/data'
        location.reload()
      } finally {
        setRestoring(false)
      }
    })
  }
  const undo = () =>
    run(async () => {
      await undoRestore(db)
      try {
        sessionStorage.setItem(FLAG, 'undone')
      } catch {
        // Nothing to remember; the notes are back anyway.
      }
      location.hash = '#/data'
      location.reload()
    })
  /** "Add as copies": any file; the new zip is turned into the same bundle. */
  const addCopies = (file: SavedFile) => {
    setOpened(null)
    run(async () => {
      const bundle =
        file.type === 'json'
          ? file.bundle
          : fullToBundle(await readFullFile(file.blob, db))
      await importBundleNow(bundle)
    })
  }
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

  const box = 'mb-4 grid gap-2.5 rounded-xl border border-line p-4'
  const button =
    'min-h-11 rounded-lg border border-line px-3 text-[13px] hover:bg-hover disabled:opacity-50'
  const notebookPicker = (label: string) => (
    <select
      aria-label={label}
      value={notebookId}
      onChange={(e) => setPicked(e.target.value)}
      className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-2 text-[13px]"
    >
      {notebooks?.map((n) => (
        <option key={n.id} value={n.id}>
          {n.title || t('review.untitled')}
        </option>
      ))}
    </select>
  )

  return (
    <div>
      <div className="mx-auto max-w-[760px] px-4 pt-8 pb-24 md:px-12 md:pt-12">
        {flag === 'restored' && mark && (
          <div
            role="status"
            className="sticky top-2 z-10 mb-4 flex flex-wrap items-center gap-2 rounded-[10px] bg-ink py-2 ps-3.5 pe-2 text-sm text-bg"
          >
            <span className="min-w-48 flex-1">
              {t('restore.bar', { date: when(mark.fileSavedAt) })}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={undo}
              className="min-h-9 rounded-lg px-3 font-semibold underline"
            >
              {t('restore.undo')}
            </button>
          </div>
        )}
        <div className="mb-1 flex items-center gap-2">
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

        <section aria-label={t('data.save.title')} className={box}>
          <h2 className="text-[15px] font-semibold">{t('data.save.title')}</h2>
          <div className="flex flex-wrap gap-2">
            <Tip id="data.exportAll" touchInfo={false}>
              <button
                type="button"
                disabled={busy || !!lockProblem}
                onClick={() => saveFull('full')}
                className={`${button} flex-1 basis-40 border-accent bg-accent font-semibold text-bg hover:bg-accent hover:opacity-90`}
              >
                {t('data.all.button')}
              </button>
            </Tip>
            <Tip id="data.exportNotes" touchInfo={false}>
              <button
                type="button"
                disabled={busy || !!lockProblem}
                onClick={() => saveFull('notes')}
                className={`${button} flex-1 basis-40`}
              >
                {t('data.save.notes')}
              </button>
            </Tip>
          </div>
          <p className="text-[13px] text-muted">{t('data.save.text')}</p>
          <PasswordFields lock={lock} onChange={setLock} />
        </section>

        <section aria-label={t('restore.title')} className={box}>
          <h2 className="text-[15px] font-semibold">{t('restore.title')}</h2>
          <div className="flex flex-wrap gap-2">
            <Tip id="data.import" touchInfo={false}>
              <FileButton
                label={t('data.import.file')}
                disabled={busy}
                className="min-w-40 flex-1 [&>label]:min-h-11"
                onFile={(file) => {
                  setLocked(null)
                  setPasswordError('')
                  setForgot(false)
                  openFile(file)
                }}
              />
            </Tip>
          </div>
          <p className="text-[13px] text-muted">{t('restore.text')}</p>
          {mark && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-48 flex-1 text-[13px] text-muted">
                {t('restore.undoRow', { date: when(mark.safetyAt) })}
              </span>
              <Tip id="data.undoRestore" touchInfo={false}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={undo}
                  className={button}
                >
                  {t('restore.undo')}
                </button>
              </Tip>
            </div>
          )}
          {locked && (
            <form
              className="grid gap-2"
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

        <section aria-label={t('data.export.title')} className={box}>
          <h2 className="text-[15px] font-semibold">
            {t('data.export.title')}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {notebookPicker(t('data.export.which'))}
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
                    const { fileName } = await save(
                      bundleFileName(bundle.notebooks[0]),
                      bundleFile(bundle),
                    )
                    ui.toast(t('csv.exported', { name: fileName }))
                  })
                }
                className={button}
              >
                {t('data.export.button')}
              </button>
            </Tip>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
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
          <p className="text-[13px] text-muted">{t('data.export.text')}</p>
        </section>

        <section aria-label={t('data.restore.title')} className={box}>
          <h2 className="text-[15px] font-semibold">
            {t('data.restore.title')}
          </h2>
          {backup === undefined ? null : backup === null ? (
            <p className="text-sm text-muted">{t('data.restore.none')}</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-48 flex-1 text-[13px] text-muted">
                {t('data.restore.info', {
                  date: when(backup.createdAt),
                  notebooks: bundleFromSnapshot(backup).notebooks.length,
                })}
              </span>
              <Tip id="data.restore" touchInfo={false}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const full = await readBrowserBackup(DEFAULT_DB_NAME)
                      if (full) {
                        await importBundleNow(
                          checkBundle(bundleFromSnapshot(full)),
                        )
                      }
                    })
                  }
                  className={button}
                >
                  {t('data.restore.button')}
                </button>
              </Tip>
            </div>
          )}
        </section>

        <details className="mb-4">
          <summary className="flex min-h-11 cursor-pointer items-center text-[15px] font-semibold">
            {t('data.more.title')}
          </summary>
          <section aria-label={t('data.anki.title')} className={box}>
            <h2 className="text-[15px] font-semibold">
              {t('data.anki.title')}
            </h2>
            <p className="text-sm text-muted">{t('data.anki.text')}</p>
            {progress && (
              <p role="status" className="text-sm text-muted">
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
              {notebookPicker(t('data.anki.which'))}
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
            <h2 className="text-[15px] font-semibold">
              {t('data.sample.title')}
            </h2>
            <p className="text-sm text-muted">{t('data.sample.text')}</p>
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
        </details>

        {opened && (
          <RestoreDialog
            file={opened}
            canReplace={
              opened.type === 'zip' &&
              canReplaceFrom(opened.manifest.dbVersion, db.verno)
            }
            disabled={busy}
            onReplace={() => replace(opened)}
            onCopies={() => addCopies(opened)}
            onCancel={() => setOpened(null)}
          />
        )}
        {restoring && (
          <dialog
            open
            aria-labelledby="restoring-title"
            className="fixed inset-0 z-20 m-auto w-[min(440px,calc(100%-32px))] rounded-xl border border-line bg-bg p-5 text-ink"
          >
            <h2 id="restoring-title" className="mb-1 text-[15px] font-semibold">
              {t('restore.busy')}
            </h2>
            <p role="status" className="text-[13px] text-muted">
              {t('restore.busy.text')}
            </p>
          </dialog>
        )}
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
