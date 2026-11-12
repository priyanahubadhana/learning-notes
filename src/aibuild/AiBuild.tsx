import { X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { trapFocus } from '../app/overlay'
import type { LearningNotesDB } from '../core/db'
import type { AiJob } from '../aitools/jobs/jobTypes'
import { t } from '../i18n/t'
import { Activity } from './Activity'
import { BuildPlan } from './BuildPlan'
import { BuildToasts, type BuildToastsApi } from './BuildToasts'
import { getEngine, type Engine } from './engine'
import { RunCard } from './RunCard'

type Tab = 'build' | 'activity'
const TABS: readonly Tab[] = ['build', 'activity']

/**
 * The Build screen (AF-20 to AF-23): pick steps, run them, look at the
 * preview, apply, and see every job in Activity. Loaded only when the flag
 * `ai.framework` is on and the person opens it.
 */
export default function AiBuild({
  db,
  onClose,
}: {
  db: LearningNotesDB
  onClose: () => void
}) {
  const [engine, setEngine] = useState<Engine | null>(null)
  const [tab, setTab] = useState<Tab>('build')
  const [run, setRun] = useState<{ id: string; name: string } | null>(null)
  const [fresh, setFresh] = useState(0)
  const toasts = useRef<BuildToastsApi>(null)
  const sheet = useRef<HTMLDivElement>(null)

  // A full-screen sheet in the browser's top layer (no stacking number of its own).
  useEffect(() => {
    const el = sheet.current
    if (!el) return
    try {
      el.showPopover?.()
    } catch {
      // Already open.
    }
    const opener = document.activeElement as HTMLElement | null
    const release = trapFocus(el, opener)
    el.querySelector<HTMLElement>('[role="tab"][tabindex="0"]')?.focus()
    return release
  }, [])

  useEffect(() => {
    let live = true
    void getEngine(db).then((e) => live && setEngine(e))
    return () => {
      live = false
    }
  }, [db])

  const say = useCallback(
    (message: string, action?: { label: string; run: () => void }) =>
      toasts.current?.push(message, action),
    [],
  )

  async function change(job: AiJob, dir: 'undo' | 'redo') {
    if (!engine) return
    try {
      if (dir === 'undo') await engine.runner.undo(job.id)
      else await engine.runner.redo(job.id)
      const back = dir === 'undo' ? 'redo' : 'undo'
      say(
        t(dir === 'undo' ? 'aifw.toast.undone' : 'aifw.toast.redone', {
          name: job.plan.goal,
        }),
        {
          label: t(back === 'undo' ? 'aifw.undo' : 'aifw.redo'),
          run: () => void change(job, back),
        },
      )
    } catch {
      say(t('aifw.run.error'))
    }
  }
  const undo = (job: AiJob) => void change(job, 'undo')
  const redo = (job: AiJob) => void change(job, 'redo')

  const start = (plan: Record<string, unknown>, name: string) => {
    if (!engine) return
    void (async () => {
      const made = await engine.runner.create(plan)
      if (!made.ok) return say(t('aifw.run.error'))
      setRun({ id: made.job.id, name })
      await engine.runner.run(made.job.id)
    })().catch(() => say(t('aifw.run.error')))
  }

  const tabButton = (id: Tab) => (
    <button
      key={id}
      type="button"
      role="tab"
      id={`aifw-tab-${id}`}
      aria-selected={tab === id}
      aria-controls="aifw-panel"
      tabIndex={tab === id ? 0 : -1}
      data-testid={`aifw-tab-${id}`}
      className={`min-h-11 rounded-lg px-4 text-sm font-medium ${
        tab === id ? 'bg-soft' : 'text-muted hover:bg-hover'
      }`}
      onClick={() => setTab(id)}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
        e.preventDefault()
        const next = TABS[(TABS.indexOf(id) + 1) % TABS.length]
        setTab(next)
        document.getElementById(`aifw-tab-${next}`)?.focus()
      }}
    >
      {t(id === 'build' ? 'aifw.tab.build' : 'aifw.tab.activity')}
    </button>
  )

  return (
    <div
      ref={sheet}
      popover="manual"
      role="dialog"
      aria-modal="true"
      aria-label={t('aifw.entry.title')}
      data-testid="aifw-screen"
      style={{
        inset: 0,
        width: '100vw',
        height: '100dvh',
        margin: 0,
        padding: 0,
        border: 0,
        overflow: 'auto',
      }}
      className="bg-bg text-ink"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pb-24">
        <div className="flex items-center gap-2">
          <div
            role="tablist"
            aria-label={t('aifw.tabs.label')}
            className="flex flex-1 gap-1"
          >
            {TABS.map(tabButton)}
          </div>
          <button
            type="button"
            aria-label={t('aifw.close')}
            data-testid="aifw-close"
            className="inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-hover"
            onClick={onClose}
          >
            <X size={20} strokeWidth={1.6} aria-hidden />
          </button>
        </div>
        <div
          role="tabpanel"
          id="aifw-panel"
          aria-labelledby={`aifw-tab-${tab}`}
        >
          {!engine ? null : tab === 'activity' ? (
            <Activity engine={engine} onUndo={undo} onRedo={redo} />
          ) : run ? (
            <RunCard
              engine={engine}
              jobId={run.id}
              name={run.name}
              onApplied={(job) =>
                say(t('aifw.toast.done', { name: run.name }), {
                  label: t('aifw.undo'),
                  run: () => undo(job),
                })
              }
              onUndo={undo}
              onRedo={redo}
              onBack={() => {
                setRun(null)
                setFresh((n) => n + 1)
              }}
            />
          ) : (
            <BuildPlan key={fresh} db={db} onStart={start} />
          )}
        </div>
        <BuildToasts ref={toasts} />
      </div>
    </div>
  )
}
