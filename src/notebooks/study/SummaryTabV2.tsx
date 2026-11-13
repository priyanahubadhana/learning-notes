import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { SummaryView } from '../../app/summary/SummaryView'
import { downloadFile } from '../../app/download'
import { EmptyState } from '../../design/parts/EmptyState'
import type { LearningNotesDB } from '../../core/db'
import { listSummary, type SummaryScope } from '../../core/summaryService'
import { sampleName } from '../../i18n/defaultNames'
import { t } from '../../i18n/t'
import { useUnlocked } from '../../settings/level'
import { StudyTabHeader } from './StudyTabHeader'

type Level = 'page' | 'notebook' | 'all'

/**
 * The Summary tab with the shared study header (slice 15, flag study.v2).
 * A page's tab starts on that page; with `study.summaryScopes` the header's
 * "Show" menu switches to the notebook or all notes, and "⋯" exports it.
 */
export function SummaryTabV2({
  db,
  notebookId,
  pageId,
  onOpenPage,
  onOpenBlock,
  onGoToNotes,
}: {
  db: LearningNotesDB
  notebookId: string
  /** The open page; null on a notebook's own Summary tab. */
  pageId: string | null
  onOpenPage: (pageId: string) => void
  onOpenBlock?: (pageId: string, blockId: string) => void
  /** The Empty state's one button: back to the notes. */
  onGoToNotes?: () => void
}) {
  const scopes = useUnlocked('study.summaryScopes')
  const [level, setLevel] = useState<Level>(pageId ? 'page' : 'notebook')
  const scope: SummaryScope =
    level === 'page' && pageId
      ? { kind: 'page', pageId }
      : level === 'all'
        ? { kind: 'app' }
        : { kind: 'notebook', notebookId }
  const groups = useLiveQuery(
    () => listSummary(db, scope),
    [db, level, pageId, notebookId],
  )
  const count = groups?.reduce((n, g) => n + g.lines.length, 0) ?? 0
  const levels: [Level, string][] = [
    ...(pageId ? ([['page', t('st8.scope.page')]] as [Level, string][]) : []),
    ['notebook', t('st8.scope.notebook')],
    ['all', t('st8.scope.all')],
  ]
  const exportIt = () => {
    const text = (groups ?? [])
      .map((g) =>
        [
          `# ${sampleName(g.page) || t('review.untitled')}`,
          g.ownText.trim(),
          ...g.lines.map((l) => `- ${l.text}`),
        ]
          .filter(Boolean)
          .join('\n'),
      )
      .join('\n\n')
    downloadFile('summary.md', text, 'text/markdown')
  }
  return (
    <section aria-label={t('summary.seg.summary')}>
      <StudyTabHeader
        title={t('summary.seg.summary')}
        count={count}
        countLabel={t('st8.count', { count })}
        filterLabel={t('st8.show')}
        filterItems={
          scopes
            ? levels.map(([value, label]) => ({
                label,
                icon: '',
                checked: level === value,
                onSelect: () => setLevel(value),
              }))
            : undefined
        }
        moreItems={
          scopes
            ? [{ label: t('st8.export'), icon: '', onSelect: exportIt }]
            : undefined
        }
      />
      <div className="px-4">
        <SummaryView
          db={db}
          scope={scope}
          onOpenPage={onOpenPage}
          onOpenBlock={onOpenBlock}
          empty={
            <EmptyState
              variant="inline"
              icon="list"
              title={t('st8.empty.title')}
              text={t(
                level === 'page' && pageId
                  ? 'summary.emptyPage'
                  : 'summary.emptyAll',
              )}
              action={onGoToNotes ? t('st8.empty.action') : undefined}
              onAction={onGoToNotes}
              testId="summary-empty"
              className="mb-4"
            />
          }
        />
      </div>
    </section>
  )
}
