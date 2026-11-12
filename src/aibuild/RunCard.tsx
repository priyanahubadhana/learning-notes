import { useState } from 'react'
import type { AiJob } from '../aitools/jobs/jobTypes'
import { t, type MessageKey } from '../i18n/t'
import type { Engine } from './engine'
import { useJob, usePasteRequest } from './hooks'
import { previewLines, toolName } from './names'
import { PasteBox } from './PasteBox'

const btn =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line px-3 text-sm hover:bg-hover disabled:opacity-40'
const primary =
  'inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-5 text-sm font-semibold text-on-accent disabled:opacity-40'

const total = (job: AiJob) =>
  Object.values(job.changeSet?.counts ?? {}).reduce((a, b) => a + b, 0)

/**
 * One job from start to finish (AF-22): steps with their state and Retry /
 * Skip / Stop, the paste box when a step needs content, then Preview, Apply
 * and the done card with Undo and Redo.
 */
export function RunCard({
  engine,
  jobId,
  name,
  onApplied,
  onUndo,
  onRedo,
  onBack,
}: {
  engine: Engine
  jobId: string
  name: string
  onApplied: (job: AiJob) => void
  onUndo: (job: AiJob) => void
  onRedo: (job: AiJob) => void
  onBack: () => void
}) {
  const job = useJob(engine.store, jobId)
  const pending = usePasteRequest(engine.filler)
  const [error, setError] = useState(false)
  const { runner } = engine

  const guard = (work: Promise<unknown>) =>
    work.then(
      () => setError(false),
      () => setError(true),
    )

  if (!job) return null
  const state = job.state
  const active =
    state === 'validated' ||
    state === 'queued' ||
    state === 'running' ||
    state === 'needs_attention' ||
    state === 'waiting_offline'
  const makesNotebook = job.plan.destination.kind === 'new_notebook'

  return (
    <section
      className="flex flex-col gap-4"
      data-testid="aifw-run"
      data-state={state}
      aria-labelledby="aifw-run-title"
    >
      <h3
        id="aifw-run-title"
        data-aifw-title
        data-testid="aifw-run-title"
        className="text-base font-semibold"
      >
        {t('aifw.run.title', { name })}
      </h3>

      <ol className="flex flex-col gap-2" data-testid="aifw-run-steps">
        {job.steps.map((step) => {
          // The saved step still says waiting while it waits for the answer.
          const waiting = pending?.stepId === step.id
          const s = waiting ? { ...step, state: 'running' as const } : step
          return (
            <li
              key={s.id}
              data-testid="aifw-run-step"
              data-state={s.state}
              className="flex flex-col gap-2 rounded-lg border border-line p-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 text-sm">
                  {toolName(s.tool)}
                </span>
                <span
                  className="rounded-full bg-soft px-2 py-0.5 text-xs"
                  data-testid="aifw-step-state"
                >
                  {t(`aifw.state.${s.state}` as MessageKey)}
                </span>
                {s.state === 'failed' && state === 'needs_attention' && (
                  <>
                    <button
                      type="button"
                      className={btn}
                      data-testid="aifw-retry"
                      onClick={() => void guard(runner.retryStep(job.id, s.id))}
                    >
                      {t('aifw.retry')}
                    </button>
                    {!(makesNotebook && s.tool === 'notebooks.create') && (
                      <button
                        type="button"
                        className={btn}
                        data-testid="aifw-skip"
                        onClick={() =>
                          void guard(runner.skipStep(job.id, s.id))
                        }
                      >
                        {t('aifw.skip')}
                      </button>
                    )}
                  </>
                )}
              </div>
              {s.state === 'failed' && s.error && (
                <p className="text-xs text-muted">{s.error}</p>
              )}
              {waiting && pending && (
                <PasteBox
                  key={`${pending.stepId}-${pending.repair?.join('|') ?? ''}`}
                  filler={engine.filler}
                  request={pending}
                />
              )}
            </li>
          )
        })}
      </ol>

      {active && (
        <div>
          <button
            type="button"
            className={btn}
            data-testid="aifw-stop"
            onClick={() => void guard(runner.stop(job.id))}
          >
            {t('aifw.stop')}
          </button>
        </div>
      )}

      {state === 'preview' && job.changeSet && (
        <div
          className="flex flex-col gap-3 rounded-lg border border-line p-3"
          data-testid="aifw-preview"
        >
          <h4 className="text-sm font-semibold">{t('aifw.preview.title')}</h4>
          <p className="text-xs text-muted">{t('aifw.preview.hint')}</p>
          {job.notice && (
            <p className="text-xs" data-testid="aifw-preview-changed">
              {t('aifw.preview.changed')}
            </p>
          )}
          <ul className="flex flex-col gap-1 text-sm">
            {previewLines(job.changeSet.records).map((line, i) => (
              <li key={i} data-testid="aifw-preview-line">
                {line}
              </li>
            ))}
          </ul>
          <ul className="flex flex-wrap gap-2 text-xs text-muted">
            {Object.entries(job.changeSet.counts).map(([table, count]) => (
              <li key={table} className="rounded-full bg-soft px-2 py-0.5">
                {t('aifw.count', {
                  kind: t(`aifw.table.${table}` as MessageKey),
                  count,
                })}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={primary}
              data-testid="aifw-apply"
              onClick={() =>
                void runner.apply(job.id).then(
                  (r) => {
                    setError(false)
                    if (r.outcome === 'applied') onApplied(r.job)
                  },
                  () => setError(true),
                )
              }
            >
              {t('aifw.apply')}
            </button>
            {job.notice && (
              <button
                type="button"
                className={btn}
                data-testid="aifw-restage"
                onClick={() => void guard(runner.restage(job.id))}
              >
                {t('aifw.preview.again')}
              </button>
            )}
            <button
              type="button"
              className={btn}
              data-testid="aifw-cancel"
              onClick={() => void guard(runner.stop(job.id))}
            >
              {t('aifw.stop')}
            </button>
          </div>
        </div>
      )}

      {(state === 'applied' || state === 'undone') && (
        <div
          className="flex flex-col gap-2 rounded-lg border border-line bg-soft p-3"
          data-testid="aifw-done"
        >
          <h4 className="text-sm font-semibold">{t('aifw.done.title')}</h4>
          <p className="text-sm">
            {state === 'applied'
              ? t('aifw.done.text', { count: total(job) })
              : t('aifw.done.undone')}
          </p>
          <div className="flex flex-wrap gap-2">
            {state === 'applied' ? (
              <button
                type="button"
                className={btn}
                data-testid="aifw-undo"
                onClick={() => onUndo(job)}
              >
                {t('aifw.undo')}
              </button>
            ) : (
              <button
                type="button"
                className={btn}
                data-testid="aifw-redo"
                onClick={() => onRedo(job)}
              >
                {t('aifw.redo')}
              </button>
            )}
            <button
              type="button"
              className={btn}
              data-testid="aifw-another"
              onClick={onBack}
            >
              {t('aifw.done.another')}
            </button>
          </div>
        </div>
      )}

      {(state === 'cancelled' || state === 'failed') && (
        <div className="flex flex-col gap-2" data-testid="aifw-ended">
          <p className="text-sm">
            {state === 'cancelled'
              ? t('aifw.run.stopped')
              : t('aifw.run.failed')}
          </p>
          <div>
            <button type="button" className={btn} onClick={onBack}>
              {t('aifw.run.again')}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm" data-testid="aifw-error">
          {t('aifw.run.error')}
        </p>
      )}
    </section>
  )
}
