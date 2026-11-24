import { lazy, Suspense, useContext, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AppUiContext } from '../../app/appUi'
import { useFlag } from '../../app/flags'
import type { LearningNotesDB } from '../../core/db'
import { isLive } from '../../core/records'
import type { ClaudeInboxItem } from '../../core/types'
import { t } from '../../i18n/t'
import {
  acceptItem,
  previewOps,
  rejectItem,
  type DiffRow,
} from './inboxService'

/**
 * Settings › Claude › Inbox. Changes Claude proposed to existing pages wait
 * here with a diff: green = new, the old text struck through = replaced. Accept
 * or Reject; neither deletes anything.
 */

// A whole job from Claude (flag ai.framework): loaded only when one is there.
const JobItem = lazy(() =>
  import('./JobItem').then((m) => ({ default: m.JobItem })),
)

const button =
  'min-h-11 rounded-lg border border-line px-4 text-sm font-medium hover:bg-hover disabled:opacity-50'
const when = (ms: number) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(ms)

function Diff({ db, item }: { db: LearningNotesDB; item: ClaudeInboxItem }) {
  const [rows, setRows] = useState<DiffRow[] | null>(null)
  useEffect(() => {
    let alive = true
    void previewOps(db, item).then((r) => alive && setRows(r))
    return () => {
      alive = false
    }
  }, [db, item])
  if (!rows) return null
  return (
    <ol
      className="flex flex-col gap-3 text-sm"
      data-testid="claude-diff"
      aria-label={t('claude.inbox.item', { page: item.pageTitle })}
    >
      {rows.map((r, i) => (
        <li key={i} className="rounded-lg border border-line p-3">
          {r.op === 'replace' ? (
            r.gone ? (
              <p className="text-muted">{t('claude.inbox.diff.gone')}</p>
            ) : (
              <>
                <p className="mb-1 text-xs font-medium text-muted">
                  {t('claude.inbox.diff.replaced')}
                  {r.typeBefore ? ` (${r.typeBefore})` : ''}
                </p>
                <p
                  className="mb-2 rounded bg-[color-mix(in_srgb,#c8402f_14%,transparent)] px-2 py-1 line-through decoration-[#c8402f]"
                  data-testid="claude-diff-was"
                >
                  {r.before || t('claude.inbox.diff.empty')}
                </p>
                <p className="mb-1 text-xs font-medium text-muted">
                  {t('claude.inbox.diff.now')} ({r.typeAfter})
                </p>
              </>
            )
          ) : (
            <p className="mb-1 text-xs font-medium text-muted">
              {t('claude.inbox.diff.new')} ({r.typeAfter}),{' '}
              {r.place?.kind === 'start'
                ? t('claude.inbox.diff.atStart')
                : r.place?.kind === 'after'
                  ? t('claude.inbox.diff.after', {
                      text: r.place.text.slice(0, 40),
                    })
                  : t('claude.inbox.diff.atEnd')}
            </p>
          )}
          <p
            className="rounded bg-[color-mix(in_srgb,#2e9e6b_16%,transparent)] px-2 py-1 whitespace-pre-wrap"
            data-testid="claude-diff-now"
          >
            {r.after || t('claude.inbox.diff.empty')}
          </p>
          {r.more.map((line, j) => (
            <p
              key={j}
              className="mt-1 ml-4 rounded bg-[color-mix(in_srgb,#2e9e6b_16%,transparent)] px-2 py-1 whitespace-pre-wrap"
            >
              {line}
            </p>
          ))}
        </li>
      ))}
    </ol>
  )
}

function Item({ db, item }: { db: LearningNotesDB; item: ClaudeInboxItem }) {
  const { toast } = useContext(AppUiContext)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const decide = async (accept: boolean) => {
    setBusy(true)
    setNote(null)
    try {
      if (!accept) {
        await rejectItem(db, item.id)
        toast(t('claude.inbox.rejected'))
      } else {
        const r = await acceptItem(db, item.id)
        if (r === 'ok') toast(t('claude.inbox.accepted'))
        else if (r === 'gone') setNote(t('claude.inbox.failed'))
        else if (r === 'pageGone') setNote(t('claude.inbox.pageGone'))
      }
    } catch {
      setNote(t('claude.inbox.error'))
    }
    setBusy(false)
  }

  return (
    <li
      className="rounded-xl border border-line p-4"
      data-testid="claude-inbox-item"
    >
      <h3 className="text-sm font-semibold">
        {t('claude.inbox.item', { page: item.pageTitle })}
      </h3>
      <p className="text-xs text-muted">
        {when(item.createdAt)} ·{' '}
        {t('claude.inbox.counts', {
          added: item.stats.added,
          replaced: item.stats.replaced,
        })}
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {item.reasons.map((r) => (
          <li
            key={r}
            className="rounded-full border border-line px-2.5 py-0.5 text-xs"
          >
            {t(`claude.inbox.reason.${r}`)}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={`${button} mt-3`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? t('claude.inbox.hide') : t('claude.inbox.show')}
      </button>
      {open && (
        <div className="mt-3">
          <Diff db={db} item={item} />
        </div>
      )}
      {(item.failed || note) && (
        <p className="mt-3 text-sm" role="alert">
          {note ?? t('claude.inbox.failed')}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={`${button} border-ink`}
          disabled={busy || !!item.failed}
          aria-label={t('claude.inbox.acceptFor', { page: item.pageTitle })}
          onClick={() => void decide(true)}
          data-testid="claude-accept"
        >
          {t('claude.inbox.accept')}
        </button>
        <button
          type="button"
          className={button}
          disabled={busy}
          aria-label={t('claude.inbox.rejectFor', { page: item.pageTitle })}
          onClick={() => void decide(false)}
          data-testid="claude-reject"
        >
          {t('claude.inbox.reject')}
        </button>
      </div>
    </li>
  )
}

export function ClaudeInbox({ db }: { db: LearningNotesDB }) {
  const framework = useFlag('ai.framework')
  const all = useLiveQuery(
    async () =>
      (await db.claudeInbox.toArray())
        .filter(isLive)
        .sort((a, b) => b.createdAt - a.createdAt),
    [db],
  )
  // Job items belong to the flag: with it off they are not shown.
  const items = all?.filter((i) => framework || !i.job)
  const pending = (items ?? []).filter((i) => i.status === 'pending')
  const decided = (items ?? [])
    .filter((i) => i.status !== 'pending')
    .slice(0, 20)
  return (
    <section
      className="flex flex-col gap-4"
      aria-labelledby="claude-inbox-title"
      data-testid="claude-inbox"
    >
      <h2 id="claude-inbox-title" className="text-base font-semibold">
        {t('claude.inbox.title')}
      </h2>
      <p className="text-sm text-muted">{t('claude.inbox.help')}</p>
      {items && pending.length === 0 && (
        <p className="text-sm" role="status">
          {t('claude.inbox.empty')}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {pending.map((i) =>
          i.job ? (
            <Suspense key={i.id} fallback={null}>
              <JobItem db={db} item={i} />
            </Suspense>
          ) : (
            <Item key={i.id} db={db} item={i} />
          ),
        )}
      </ul>
      {decided.length > 0 && (
        <details>
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">
            {t('claude.inbox.decided')} ({decided.length})
          </summary>
          <ul className="flex flex-col gap-1 text-sm text-muted">
            {decided.map((i) => (
              <li key={i.id}>
                {i.job
                  ? t('aifw.inbox.job.decidedItem', {
                      goal: i.job.job.plan.goal,
                    })
                  : t('claude.inbox.item', { page: i.pageTitle })}
                ,{' '}
                {t(
                  i.status === 'accepted'
                    ? 'claude.inbox.status.accepted'
                    : 'claude.inbox.status.rejected',
                  { when: when(i.decidedAt ?? i.updatedAt) },
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
