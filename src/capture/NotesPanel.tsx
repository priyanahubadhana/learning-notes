import { useContext, useState } from 'react'
import { recordAiBatch } from '../core/aiHistory'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import { usePref } from '../app/usePref'
import type { LearningNotesDB } from '../core/db'
import { createId } from '../core/ids'
import { t } from '../i18n/t'
import { saveImage } from '../images/imageService'
import { shrinkImage } from '../images/shrinkImage'
import type { CaptureInput } from './captureService'
import { importNotes } from './importNotes'
import { MAX_NOTES_CHARS, NotesFormatError } from './notesFormat'
import {
  MAX_PRESETS,
  buildPrompt,
  isPresetList,
  withPreset,
} from './promptBuilder'
import { NotesZipError, readNotesZip } from './zipNotes'

/**
 * Copy prompt, Paste notes and Drop a zip (CR2): the bridge between "paste
 * the link into your AI" and a finished page. Used on the Capture screen and
 * on any source page.
 */
export function NotesPanel({
  db,
  workspaceId,
  input,
  pageId,
  onDone,
}: {
  db: LearningNotesDB
  workspaceId: string
  /** The source (link, title, pasted text) the prompt is about. */
  input: CaptureInput
  /** Add to this source page; unset = make a new page. */
  pageId?: string
  onDone: (pageId: string) => void
}) {
  const { toast } = useContext(AppUiContext)
  const [presets, setPresets] = usePref('capture.presets', isPresetList, [])
  const [extra, setExtra] = useState('')
  const [presetName, setPresetName] = useState('')
  const [presetId, setPresetId] = useState('')
  const [pasted, setPasted] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const copy = () =>
    runTask(navigator.clipboard.writeText(buildPrompt(input, extra)))

  const savePreset = () => {
    const next = withPreset(presets, {
      id: createId(),
      name: presetName,
      text: extra,
    })
    if (next === null) return toast(t('capture.presetFull'))
    setPresets(next)
    setPresetName('')
  }

  const finish = async (
    markdown: string,
    images?: ReadonlyMap<string, string>,
  ) => {
    setError(null)
    setBusy(true)
    try {
      const result = await importNotes(db, workspaceId, markdown, {
        pageId,
        images,
      })
      recordAiBatch(
        result.pageId,
        result.batchId,
        t('capture.notesMade', { count: result.cards }),
      )
      toast(t('capture.notesMade', { count: result.cards }))
      setPasted('')
      onDone(result.pageId)
    } catch (e) {
      if (e instanceof NotesFormatError) {
        setError(
          markdown.length > MAX_NOTES_CHARS
            ? t('capture.notesTooBig')
            : t('capture.notesBad'),
        )
      } else throw e
    } finally {
      setBusy(false)
    }
  }

  const importZip = async (file: File) => {
    setError(null)
    setBusy(true)
    try {
      const zip = readNotesZip(new Uint8Array(await file.arrayBuffer()))
      const ids = new Map<string, string>()
      for (const img of zip.images) {
        const saved = await saveImage(
          db,
          Object.assign(img.blob, { name: img.name }),
          shrinkImage,
        )
        ids.set(img.name, saved.id)
      }
      setBusy(false)
      await finish(zip.markdown, ids)
    } catch (e) {
      setBusy(false)
      if (e instanceof NotesZipError) setError(t('capture.zipBad'))
      else throw e
    }
  }

  const field =
    'w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent'
  return (
    <section
      data-testid="notes-panel"
      aria-label={t('capture.promptSection')}
      className="mt-8 border-t border-line pt-5"
    >
      <h2 className="mb-1 text-base font-semibold">
        {t('capture.promptSection')}
      </h2>
      <p className="mb-3 text-sm text-muted">{t('capture.promptHelp')}</p>
      <label className="mb-2 flex flex-col gap-1 text-sm">
        {t('capture.preset')}
        <select
          value={presetId}
          data-testid="preset-select"
          onChange={(e) => {
            setPresetId(e.target.value)
            const p = presets.find((x) => x.id === e.target.value)
            if (p) {
              setExtra(p.text)
              setPresetName(p.name)
            } else setExtra('')
          }}
          className={field}
        >
          <option value="">{t('capture.presetNone')}</option>
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="mb-2 flex flex-col gap-1 text-sm">
        {t('capture.presetText')}
        <textarea
          rows={2}
          value={extra}
          maxLength={2000}
          placeholder={t('capture.presetPlaceholder')}
          onChange={(e) => setExtra(e.target.value)}
          data-testid="preset-text"
          className={field}
        />
      </label>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <input
          value={presetName}
          maxLength={80}
          aria-label={t('capture.presetName')}
          placeholder={t('capture.presetName')}
          onChange={(e) => setPresetName(e.target.value)}
          data-testid="preset-name"
          className={`${field} max-w-[14rem]`}
        />
        <button
          type="button"
          onClick={savePreset}
          disabled={!presetName.trim() || presets.length >= MAX_PRESETS}
          data-testid="preset-save"
          className="min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover disabled:opacity-50"
        >
          {t('capture.presetSave')}
        </button>
        {presets.some((p) => p.name === presetName.trim()) && (
          <button
            type="button"
            onClick={() =>
              setPresets(presets.filter((p) => p.name !== presetName.trim()))
            }
            className="min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover"
          >
            {t('capture.presetDelete')}
          </button>
        )}
      </div>
      <button
        type="button"
        data-testid="copy-prompt"
        onClick={copy}
        className="mb-4 min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90"
      >
        {t('capture.copyPrompt')}
      </button>
      <label className="mb-2 flex flex-col gap-1 text-sm">
        {t('capture.pasteNotes')}
        <textarea
          rows={8}
          value={pasted}
          placeholder={t('capture.pasteNotesPlaceholder')}
          onChange={(e) => setPasted(e.target.value)}
          data-testid="notes-text"
          className={field}
        />
      </label>
      {error && (
        <p role="alert" className="mb-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="notes-import"
          disabled={busy || !pasted.trim()}
          onClick={() => void runTask(finish(pasted))}
          className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {t('capture.importNotes')}
        </button>
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-line px-3 text-sm hover:bg-hover">
          {t('capture.dropZip')}
          <input
            type="file"
            accept=".zip,application/zip"
            data-testid="notes-zip"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) void runTask(importZip(file))
            }}
          />
        </label>
      </div>
    </section>
  )
}
