import { useContext, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import { previewLines } from '../../aibuild/names'
import type { LearningNotesDB } from '../../core/db'
import type { ClaudeInboxItem } from '../../core/types'
import { SheetBase } from '../../design/parts/SheetBase'
import { t, type MessageKey } from '../../i18n/t'
import { acceptJobItem, rejectJobItem } from './jobInbox'

const button =
  'min-h-11 rounded-lg border border-line px-4 text-sm font-medium hover:bg-hover disabled:opacity-50'
const when = (ms: number) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(ms)

/**
 * One job Claude sent to the Inbox (flag ai.framework). The same Accept /
 * Reject / Show changes as a page change; the changes open in the shared
 * sheet. Accept saves the whole job at once and offers Undo.
 */
export function JobItem({
  db,
  item,
}: {
  db: LearningNotesDB
  item: ClaudeInboxItem
}) {
  const { toast } = useContext(AppUiContext)
  const [sheet, setSheet] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const entry = item.job
  if (!entry) return null
  const { job, request } = entry
  const goal = job.plan.goal
  const counts = Object.values(job.changeSet?.counts ?? {}).reduce(
    (a, b) => a + b,
    0,
  )
  const undo = request === 'undo'

  const decide = async (accept: boolean) => {
    setBusy(true)
    setNote(null)
    try {
      if (!accept) {
        await rejectJobItem(db, item.id)
        toast(t('claude.inbox.rejected'))
      } else {
        const { getEngine } = await import('../../aibuild/engine')
        const engine = await getEngine(db)
        const r = await acceptJobItem(db, item.id, engine)
        if (r === 'ok')
          toast(
            t(undo ? 'aifw.inbox.undo.done' : 'aifw.inbox.job.accepted'),
            undo
              ? undefined
              : {
                  label: t('aifw.undo'),
                  onSelect: () => void engine.runner.undo(job.id),
                },
          )
        else if (r === 'changed') setNote(t('aifw.inbox.job.changed'))
        else if (r === 'failed') setNote(t('aifw.inbox.job.error'))
      }
    } catch {
      setNote(t('aifw.inbox.job.error'))
    }
    setBusy(false)
  }

  return (
    <li
      className="rounded-xl border border-line p-4"
      data-testid="claude-job-item"
      data-request={request}
    >
      <h3 className="text-sm font-semibold">
        {t(undo ? 'aifw.inbox.undo.title' : 'aifw.inbox.job.title', { goal })}
      </h3>
      <p className="text-xs text-muted">
        {when(item.createdAt)} · {entry.from}
        {' · '}
        {t('aifw.inbox.job.counts', { count: counts })}
      </p>
      {undo ? (
        <p className="mt-2 text-sm">{t('aifw.inbox.undo.help')}</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {entry.reasons.map((r) => (
            <li
              key={r}
              className="rounded-full border border-line px-2.5 py-0.5 text-xs"
            >
              {t(`aifw.inbox.reason.${r}` as MessageKey)}
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className={`${button} mt-3`}
        aria-label={t('aifw.inbox.job.show', { goal })}
        onClick={() => setSheet(true)}
        data-testid="claude-job-show"
      >
        {t('claude.inbox.show')}
      </button>
      {sheet && (
        <SheetBase
          title={t('aifw.inbox.job.sheet')}
          onClose={() => setSheet(false)}
          data-testid="claude-job-sheet"
        >
          <ul className="flex flex-col gap-1 text-sm">
            {previewLines(job.changeSet?.records ?? []).map((line, i) => (
              <li key={i} data-testid="claude-job-line">
                {line}
              </li>
            ))}
          </ul>
          <ul className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
            {Object.entries(job.changeSet?.counts ?? {}).map(([table, n]) => (
              <li key={table} className="rounded-full bg-soft px-2 py-0.5">
                {t('aifw.count', {
                  kind: t(`aifw.table.${table}` as MessageKey),
                  count: n,
                })}
              </li>
            ))}
          </ul>
        </SheetBase>
      )}
      {note && (
        <p className="mt-3 text-sm" role="alert" data-testid="claude-job-note">
          {note}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={`${button} border-ink`}
          disabled={busy}
          aria-label={t(
            undo ? 'aifw.inbox.undo.acceptFor' : 'aifw.inbox.job.acceptFor',
            { goal },
          )}
          onClick={() => void decide(true)}
          data-testid="claude-job-accept"
        >
          {undo ? t('aifw.inbox.undo.accept') : t('claude.inbox.accept')}
        </button>
        <button
          type="button"
          className={button}
          disabled={busy}
          aria-label={t('aifw.inbox.job.rejectFor', { goal })}
          onClick={() => void decide(false)}
          data-testid="claude-job-reject"
        >
          {t('claude.inbox.reject')}
        </button>
      </div>
    </li>
  )
}
