import { lazy, Suspense, useContext, useEffect, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import type { LearningNotesDB } from '../../core/db'
import { t } from '../../i18n/t'
import {
  claudeActivity,
  type ActivityEntry,
} from '../../sync/connectors/claudeServer'
import { accountAuth } from '../../sync/syncService'

const HistoryDialog = lazy(() =>
  import('../../history/HistoryDialog').then((m) => ({
    default: m.HistoryDialog,
  })),
)

/**
 * Settings › Claude › Activity: every write Claude made, newest first. The
 * server keeps only the tool, the time and ids (never text); the titles shown
 * here are looked up on this device. "Undo" opens the page's History, where
 * the copy made just before the change is marked "before a change by Claude".
 */

const TOOL_KEYS = {
  add_cards: 'claude.activity.tool.add_cards',
  add_page: 'claude.activity.tool.add_page',
  apply_style: 'claude.activity.tool.apply_style',
  create_database: 'claude.activity.tool.create_database',
  create_notebook: 'claude.activity.tool.create_notebook',
  refine_page: 'claude.activity.tool.refine_page',
} as const

const when = (ms: number) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(ms)

interface Row {
  entry: ActivityEntry
  where: string
  pageId: string | null
}

async function resolve(
  db: LearningNotesDB,
  entries: ActivityEntry[],
): Promise<Row[]> {
  const rows: Row[] = []
  for (const entry of entries) {
    let where = ''
    let pageId: string | null = null
    // Ids run notebook first, then pages; the newest page or notebook still here is shown.
    for (const id of [...entry.ids].reverse()) {
      const page = await db.pages.get(id)
      if (page && page.deletedAt === null) {
        where = page.title
        pageId = page.id
        break
      }
      const nb = await db.notebooks.get(id)
      if (nb && nb.deletedAt === null) {
        where = nb.title
        break
      }
    }
    rows.push({
      entry,
      where: where || t('claude.activity.where.gone'),
      pageId,
    })
  }
  return rows
}

export function ClaudeActivity({ db }: { db: LearningNotesDB }) {
  const { toast } = useContext(AppUiContext)
  const [state, setState] = useState<
    { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; rows: Row[] }
  >({ kind: 'loading' })
  const [history, setHistory] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const r = await claudeActivity(await accountAuth().accessToken())
        if (!alive) return
        if (!r.ok) return setState({ kind: 'error' })
        const rows = await resolve(db, r.value.entries)
        if (alive) setState({ kind: 'ready', rows })
      } catch {
        if (alive) setState({ kind: 'error' })
      }
    })()
    return () => {
      alive = false
    }
  }, [db])

  return (
    <section
      className="flex flex-col gap-4"
      aria-labelledby="claude-activity-title"
      data-testid="claude-activity"
    >
      <h2 id="claude-activity-title" className="text-base font-semibold">
        {t('claude.activity.title')}
      </h2>
      <p className="text-sm text-muted">{t('claude.activity.help')}</p>
      {state.kind === 'loading' && (
        <p className="text-sm text-muted" role="status">
          {t('claude.loading')}
        </p>
      )}
      {state.kind === 'error' && (
        <p className="text-sm" role="alert">
          {t('claude.error.generic')}
        </p>
      )}
      {state.kind === 'ready' && state.rows.length === 0 && (
        <p className="text-sm" role="status">
          {t('claude.activity.empty')}
        </p>
      )}
      {state.kind === 'ready' && state.rows.length > 0 && (
        <ul>
          {state.rows.map(({ entry, where, pageId }, i) => {
            const waiting = entry.tool === 'refine_page' && !!entry.counts.inbox
            const what = t(
              waiting
                ? 'claude.activity.tool.refine_page.inbox'
                : (TOOL_KEYS[entry.tool as keyof typeof TOOL_KEYS] ??
                    'claude.activity.tool.refine_page'),
            )
            // A change made at once has a copy of the page from just before it.
            const canUndo = entry.tool === 'refine_page' && !waiting && !!pageId
            return (
              <li
                key={`${entry.at}-${i}`}
                className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-sm"
                data-testid="claude-activity-row"
              >
                <span>
                  <span className="block">
                    {t('claude.activity.row', { what, where })}
                  </span>
                  <span className="block text-xs text-muted">
                    {when(entry.at)}
                  </span>
                </span>
                {canUndo && (
                  <button
                    type="button"
                    className="min-h-11 rounded-lg border border-line px-4 text-sm font-medium hover:bg-hover"
                    aria-label={t('claude.activity.undoFor', { what })}
                    onClick={() => setHistory(pageId)}
                  >
                    {t('claude.activity.undo')}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <p className="text-xs text-muted">{t('claude.activity.noUndo')}</p>
      {history && (
        <Suspense fallback={null}>
          <HistoryDialog
            db={db}
            pageId={history}
            onClose={() => setHistory(null)}
            onRestored={() => {
              setHistory(null)
              toast(t('claude.activity.restored'))
            }}
          />
        </Suspense>
      )}
    </section>
  )
}
