import { useContext, useState } from 'react'
import { AppUiContext } from '../app/appUi'
import { ConfirmDialog } from '../app/ui'
import type { LearningNotesDB } from '../core/db'
import { t } from '../i18n/t'
import { FileButton } from './FileButton'
import type { NotionPlan } from './notionImport'

/** The plain-words message for an importer error code. */
function notionError(code: string): string {
  switch (code) {
    case 'nothing':
      return t('notion.err.nothing')
    case 'nested':
      return t('notion.err.nested')
    case 'entries':
      return t('notion.err.entries')
    case 'expanded':
      return t('notion.err.expanded')
    case 'pages':
      return t('notion.err.pages')
    case 'toobig':
      return t('notion.err.toobig')
    default:
      return t('notion.err.damaged')
  }
}

/**
 * Import › Notion export (.zip): reads the zip (nothing written), shows what
 * it holds and where it goes, then imports; one Undo moves it all to Trash.
 * The importer is loaded only when a file is chosen.
 */
export function NotionImportSection({
  db,
  workspaceId,
  notebooks,
  box,
}: {
  db: LearningNotesDB
  workspaceId: string
  notebooks: { id: string; title: string }[]
  box: string
}) {
  const ui = useContext(AppUiContext)
  const [plan, setPlan] = useState<NotionPlan | null>(null)
  const [target, setTarget] = useState('')
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const busy = progress !== ''

  const choose = async (file: File) => {
    setError('')
    setProgress(t('notion.reading'))
    try {
      const { planNotionZip, NotionImportError } =
        await import('./notionImport')
      if (file.size > 400 * 1024 * 1024) throw new Error(t('notion.tooBig'))
      try {
        setPlan(
          planNotionZip(new Uint8Array(await file.arrayBuffer()), file.name),
        )
      } catch (e) {
        if (e instanceof NotionImportError) {
          throw new Error(notionError(e.message), { cause: e })
        }
        throw e
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setProgress('')
    }
  }

  const start = async () => {
    const chosen = plan
    if (!chosen) return
    setPlan(null)
    setProgress(t('notion.working'))
    try {
      const { runNotionImport, undoNotionImport } =
        await import('./notionImport')
      const result = await runNotionImport(
        db,
        workspaceId,
        chosen,
        target || null,
        (done, total) => setProgress(t('notion.progress', { done, total })),
      )
      ui.toast(
        t('notion.done', {
          pages: result.pages,
          databases: result.databases,
          rows: result.rows,
        }),
        {
          label: t('notion.undo'),
          onSelect: () => void undoNotionImport(db, result.created),
        },
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setProgress('')
    }
  }

  return (
    <section aria-label={t('notion.title')} className={box}>
      <h2 className="text-[15px] font-semibold">{t('notion.title')}</h2>
      <p className="text-sm text-muted">{t('notion.text')}</p>
      {progress && (
        <p role="status" className="text-sm text-muted">
          {progress}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-start gap-2">
        <FileButton
          label={t('notion.import')}
          hint={t('notion.hint')}
          accept=".zip,application/zip"
          disabled={busy}
          onFile={(f) => void choose(f)}
        />
        <select
          aria-label={t('notion.where')}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-2 text-[13px]"
        >
          <option value="">{t('notion.newNotebook')}</option>
          {notebooks.map((n) => (
            <option key={n.id} value={n.id}>
              {n.title || t('review.untitled')}
            </option>
          ))}
        </select>
      </div>
      {plan && (
        <ConfirmDialog
          message={t('notion.preview', {
            name: plan.name,
            pages: plan.pages,
            databases: plan.databases,
            rows: plan.rows,
            images: plan.images,
            files: plan.attachments,
            where:
              notebooks.find((n) => n.id === target)?.title ||
              t('notion.newNotebookNamed', { name: plan.name }),
          })}
          confirmLabel={t('notion.import')}
          onConfirm={() => void start()}
          onCancel={() => setPlan(null)}
        />
      )}
    </section>
  )
}
