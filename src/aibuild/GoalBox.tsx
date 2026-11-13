import { Check, Copy, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { OnOffChoice } from '../design/parts/OnOff'
import { formatCost } from '../ai/costCurrency'
import { toCatalog } from '../aitools/catalog'
import { DEFAULT_USD_TO_INR, estimateAllEfforts } from '../aitools/plan/cost'
import { DEFAULT_EFFORT, EFFORTS, type Effort } from '../aitools/plan/effort'
import {
  MAX_REPAIRS,
  buildPlannerPrompt,
  checkPlanAnswer,
  templatePlan,
  type PlanDestination,
  type PlannerInput,
} from '../aitools/plan/planner'
import { t, type MessageKey } from '../i18n/t'
import { newJobId, type Destination } from './buildState'
import { toolName } from './names'

const field =
  'min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm outline-none focus:border-accent'
const area =
  'min-h-24 w-full rounded-lg border border-line bg-bg p-3 font-mono text-xs outline-none focus:border-accent'
const btn =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line px-3 text-sm hover:bg-hover disabled:opacity-40'
const fit = (el: HTMLTextAreaElement) => {
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}
const primary =
  'aifw-primary inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-5 text-sm font-semibold text-on-accent'

type Plan = Record<string, unknown>
type Step = { id: string; tool: string }

/** A problem line: codes are made plain, exact-path lines are shown as they are. */
function problemLine(p: string): string {
  if (p === ':empty') return t('aifw.paste.empty')
  if (p === ':json') return t('aifw.paste.json')
  if (p === ':object') return t('aifw.paste.object')
  return p
}

/**
 * The goal box (slice 4, V4-C1 to V4-C6): type a goal, pick where it goes and
 * how much effort, copy the planner prompt into any chat, paste the answer
 * back. The pasted plan is checked; after 2 repair rounds a simple built-in
 * plan is offered. The app makes no AI call and spends nothing.
 */
export function GoalBox({
  place,
  onStart,
  onReady,
}: {
  /** Where it goes: the one place set in the card below. */
  place: Destination
  onStart: (plan: Plan, name: string) => void
  /** Told when a plan becomes ready (the screen shows the toast). */
  onReady: (title: string) => void
}) {
  const tools = useMemo(() => toCatalog(), [])
  const [goal, setGoal] = useState('')
  const [effort, setEffort] = useState<Effort>(DEFAULT_EFFORT)
  const [input, setInput] = useState<PlannerInput | null>(null)
  const [answer, setAnswer] = useState('')
  const [problems, setProblems] = useState<string[]>([])
  const [rounds, setRounds] = useState(0)
  const [copied, setCopied] = useState(false)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [simple, setSimple] = useState(false)
  const failed = useRef(0)

  const destination: PlanDestination | null =
    place.kind === 'new_notebook'
      ? place.title.trim()
        ? { kind: place.kind, title: place.title.trim() }
        : null
      : place.id
        ? { kind: place.kind, id: place.id }
        : null
  const canAsk = goal.trim().length > 0 && !!destination

  const ask = () => {
    if (!canAsk || !destination) return
    failed.current = 0
    setRounds(0)
    setProblems([])
    setAnswer('')
    setSimple(false)
    setInput({
      id: newJobId(),
      goal: goal.trim(),
      destination,
      effort,
      maxInr: 0,
    })
  }

  const ready = (p: Plan, usedSimple: boolean) => {
    setPlan(p)
    setSimple(usedSimple)
    setInput(null)
  }
  // The notice waits until the plan title is on the screen, so it can be placed clear of it.
  const told = useRef(onReady)
  useEffect(() => {
    told.current = onReady
  })
  useEffect(() => {
    if (plan) told.current(String(plan.goal))
  }, [plan])

  const check = () => {
    if (!input) return
    const r = checkPlanAnswer(answer, input, tools)
    if (r.ok) return ready(r.plan, false)
    failed.current++
    setRounds(failed.current)
    setProblems(r.errors)
  }

  const useSimple = () => {
    if (!input) return
    ready(templatePlan(input), true)
  }

  const reset = () => {
    setInput(null)
    setPlan(null)
    setProblems([])
    setAnswer('')
    setRounds(0)
  }

  const prompt = input ? buildPlannerPrompt(input, tools, problems) : ''
  const copy = () => {
    void navigator.clipboard
      ?.writeText(prompt)
      .then(() => setCopied(true))
      .catch(() => setCopied(false))
  }

  const steps = (plan?.steps ?? []) as Step[]
  const estimates = useMemo(
    () =>
      plan
        ? estimateAllEfforts({
            plan: plan as never,
            tools,
            usdToInr: DEFAULT_USD_TO_INR,
          })
        : null,
    [plan, tools],
  )
  const money = (inr: number) => formatCost(inr / DEFAULT_USD_TO_INR)

  return (
    <section
      className="flex flex-col gap-3 rounded-lg border border-line p-3"
      data-aifw-card
      aria-labelledby="aifw-goal-h"
      data-testid="aifw-goal"
    >
      <h3 id="aifw-goal-h" className="text-sm font-semibold">
        {t('aifw.goal.title')}
      </h3>

      {plan ? (
        <div className="flex flex-col gap-2" data-testid="aifw-goal-plan">
          <h4 className="text-base font-semibold" data-aifw-title>
            {String(plan.goal)}
          </h4>
          <p role="status" className="text-sm" data-testid="aifw-plan-ready">
            {t('aifw.goal.ready')}
          </p>
          {simple && (
            <p className="text-xs text-muted" data-testid="aifw-goal-simple">
              {t('aifw.goal.simpleNote')}
            </p>
          )}
          <ol className="flex flex-col gap-1 text-sm">
            {steps.map((s) => (
              <li
                key={s.id}
                data-testid="aifw-goal-step"
                className="rounded-lg border border-line px-3 py-2"
              >
                {toolName(s.tool)}
              </li>
            ))}
          </ol>
          {estimates && (
            <div className="text-xs text-muted" data-testid="aifw-goal-cost">
              <p>{t('aifw.goal.free')}</p>
              <p>
                {t('aifw.goal.wouldCost', {
                  quick: money(estimates.quick.totalInr),
                  standard: money(estimates.standard.totalInr),
                  deep: money(estimates.deep.totalInr),
                })}
              </p>
              <p>{t('aifw.goal.limit')}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={primary}
              data-testid="aifw-goal-run"
              onClick={() => onStart(plan, String(plan.goal))}
            >
              {t('aifw.start')}
            </button>
            <button
              type="button"
              className={btn}
              data-testid="aifw-goal-back"
              onClick={reset}
            >
              <X size={18} strokeWidth={1.6} aria-hidden />
              {t('aifw.goal.discard')}
            </button>
          </div>
        </div>
      ) : input ? (
        <div className="flex flex-col gap-2" data-testid="aifw-goal-ask">
          <p className="text-xs text-muted">{t('aifw.goal.askHint')}</p>
          {problems.length > 0 && (
            <div
              role="alert"
              className="text-xs"
              data-testid="aifw-goal-problems"
            >
              <p className="font-semibold">
                {rounds > MAX_REPAIRS
                  ? t('aifw.goal.tooMany')
                  : t('aifw.goal.bad')}
              </p>
              <ul className="ml-4 list-disc">
                {problems.slice(0, 5).map((p) => (
                  <li key={p}>{problemLine(p)}</li>
                ))}
              </ul>
            </div>
          )}
          <textarea
            readOnly
            value={prompt}
            aria-label={t('aifw.paste.prompt')}
            data-testid="aifw-goal-prompt"
            className={area}
          />
          <button
            type="button"
            className={`${btn} self-start`}
            data-testid="aifw-goal-copy"
            onClick={copy}
          >
            {copied ? (
              <Check size={18} strokeWidth={1.6} aria-hidden />
            ) : (
              <Copy size={18} strokeWidth={1.6} aria-hidden />
            )}
            {copied ? t('aifw.paste.copied') : t('aifw.paste.copy')}
          </button>
          <textarea
            value={answer}
            aria-label={t('aifw.goal.pasteLabel')}
            data-testid="aifw-goal-answer"
            className={area}
            onChange={(e) => {
              setAnswer(e.target.value)
              setProblems([])
            }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={primary}
              data-testid="aifw-goal-check"
              disabled={!answer.trim()}
              onClick={check}
            >
              {t('aifw.goal.check')}
            </button>
            <button
              type="button"
              className={btn}
              data-testid="aifw-goal-simple-btn"
              onClick={useSimple}
            >
              {t('aifw.goal.useSimple')}
            </button>
            <button
              type="button"
              className={btn}
              data-testid="aifw-goal-cancel"
              onClick={reset}
            >
              <X size={18} strokeWidth={1.6} aria-hidden />
              {t('aifw.goal.discard')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <textarea
            value={goal}
            maxLength={2000}
            rows={2}
            aria-label={t('aifw.goal.label')}
            placeholder={t('aifw.goal.placeholder')}
            data-testid="aifw-goal-text"
            className={`${field} aifw-grow py-2`}
            onChange={(e) => {
              setGoal(e.target.value)
              fit(e.target)
            }}
          />
          <OnOffChoice<Effort>
            block
            label={t('aifw.goal.effort')}
            value={effort}
            onChange={setEffort}
            options={EFFORTS.map((e) => ({
              value: e,
              testId: `aifw-effort-${e}`,
              label: t(`aifw.effort.${e}` as MessageKey),
            }))}
          />
          <p className="text-xs text-muted">
            {t(`aifw.effort.${effort}.hint` as MessageKey)}
          </p>
          <button
            type="button"
            className={`${primary} self-start`}
            data-testid="aifw-goal-make"
            disabled={!canAsk}
            onClick={ask}
          >
            {t('aifw.goal.make')}
          </button>
        </div>
      )}
    </section>
  )
}
