import type { AiJob } from '../aitools/jobs/jobTypes'
import { dateLocale, t, type MessageKey } from '../i18n/t'
import type { Engine } from './engine'
import { useJobs } from './hooks'

const btn =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-3 text-sm hover:bg-hover'

function when(ms: number): string {
  try {
    return new Intl.DateTimeFormat(dateLocale(), {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(ms)
  } catch {
    return new Date(ms).toLocaleString()
  }
}

/** Where a job's result went, in plain words. */
function destination(job: AiJob): string {
  const d = job.plan.destination
  const title = d.title ?? job.plan.goal
  if (d.kind === 'new_notebook') return t('aifw.dest.newNb', { title })
  if (d.kind === 'page') return t('aifw.dest.inPage', { title })
  return t('aifw.dest.inNb', { title })
}

/** AF-23: one row per job with time, destination and Undo / Redo. */
export function Activity({
  engine,
  onUndo,
  onRedo,
}: {
  engine: Engine
  onUndo: (job: AiJob) => void
  onRedo: (job: AiJob) => void
}) {
  const jobs = useJobs(engine.store)
  if (!jobs.length)
    return (
      <p className="text-sm text-muted" data-testid="aifw-activity-empty">
        {t('aifw.act.empty')}
      </p>
    )
  return (
    <ul
      aria-label={t('aifw.act.list')}
      className="flex flex-col gap-2"
      data-testid="aifw-activity"
    >
      {jobs.map((job) => (
        <li
          key={job.id}
          data-testid="aifw-activity-row"
          data-state={job.state}
          className="flex flex-wrap items-center gap-2 rounded-lg border border-line p-3"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-sm font-medium">
              {job.plan.goal}
            </span>
            <span className="text-xs text-muted">
              <span data-testid="aifw-activity-state">
                {t(`aifw.jobstate.${job.state}` as MessageKey)}
              </span>
              {' · '}
              <time dateTime={new Date(job.timings.createdAt).toISOString()}>
                {when(job.timings.createdAt)}
              </time>
            </span>
            <span className="text-xs text-muted">
              {t('aifw.act.to', { dest: destination(job) })}
              {' · '}
              {t('aifw.act.steps', { count: job.steps.length })}
            </span>
          </div>
          {job.state === 'applied' && (
            <button
              type="button"
              className={btn}
              data-testid="aifw-activity-undo"
              onClick={() => onUndo(job)}
            >
              {t('aifw.undo')}
            </button>
          )}
          {job.state === 'undone' && (
            <button
              type="button"
              className={btn}
              data-testid="aifw-activity-redo"
              onClick={() => onRedo(job)}
            >
              {t('aifw.redo')}
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
