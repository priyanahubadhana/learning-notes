import { lazy, Suspense, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { LearningNotesDB } from '../core/db'
import { useFlag } from '../app/flags'
import { isLive } from '../core/records'
import { t } from '../i18n/t'

// Each screen loads only when opened (the app's first download stays small).
const ClaudeSection = lazy(() =>
  import('./ClaudeSection').then((m) => ({ default: m.ClaudeSection })),
)
const ClaudeInbox = lazy(() =>
  import('./inbox/ClaudeInbox').then((m) => ({ default: m.ClaudeInbox })),
)
const ClaudeActivity = lazy(() =>
  import('./inbox/ClaudeActivity').then((m) => ({
    default: m.ClaudeActivity,
  })),
)

type Tab = 'settings' | 'inbox' | 'activity'

/** Settings › Claude: the switch and privacy, the Inbox of proposed changes, and the Activity list. */
export function ClaudeArea({ db }: { db: LearningNotesDB }) {
  const [tab, setTab] = useState<Tab>('settings')
  const framework = useFlag('ai.framework')
  const waiting =
    useLiveQuery(
      async () =>
        (await db.claudeInbox.toArray()).filter(
          (i) => isLive(i) && i.status === 'pending' && (framework || !i.job),
        ).length,
      [db, framework],
    ) ?? 0
  const tabs: { id: Tab; label: string }[] = [
    { id: 'settings', label: t('claude.tab.settings') },
    {
      id: 'inbox',
      label:
        waiting > 0
          ? t('claude.tab.inboxCount', { count: waiting })
          : t('claude.tab.inbox'),
    },
    { id: 'activity', label: t('claude.tab.activity') },
  ]
  return (
    <div className="flex flex-col gap-4" data-testid="claude-area">
      <div
        role="tablist"
        aria-label={t('claude.tab.label')}
        className="flex gap-1.5 overflow-x-auto"
      >
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            id={`claude-tab-${x.id}`}
            aria-selected={tab === x.id}
            aria-controls="claude-panel"
            data-testid={`claude-tab-${x.id}`}
            onClick={() => setTab(x.id)}
            className={`min-h-11 shrink-0 rounded-full border px-4 text-sm transition-colors ${
              tab === x.id
                ? 'border-ink font-semibold'
                : 'border-line text-muted hover:bg-hover'
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="claude-panel"
        aria-labelledby={`claude-tab-${tab}`}
      >
        <Suspense fallback={null}>
          {tab === 'settings' && <ClaudeSection db={db} />}
          {tab === 'inbox' && <ClaudeInbox db={db} />}
          {tab === 'activity' && <ClaudeActivity db={db} />}
        </Suspense>
      </div>
    </div>
  )
}
