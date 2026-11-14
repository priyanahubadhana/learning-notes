import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useReducer } from 'react'
import type { LearningNotesDB } from '../core/db'
import { toCatalog } from '../aitools/catalog'
import { OnOffChoice } from '../design/parts/OnOff'
import { t, type MessageKey } from '../i18n/t'
import { toolDesc, toolName } from './names'
import {
  COLOURS,
  NEEDS_OWN_ARGS,
  check,
  isReady,
  newDraft,
  newJobId,
  reduce,
  toPlan,
  type Destination,
  type Problem,
} from './buildState'

const field =
  'min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm outline-none focus:border-accent'
/** The one card frame every block of the Build screen uses. */
const card = 'flex flex-col gap-2 rounded-lg border border-line p-3'
const primary =
  'aifw-primary inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-5 text-sm font-semibold text-on-accent'
const btn =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line px-3 text-sm hover:bg-hover disabled:opacity-40'
const iconBtn =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-hover disabled:opacity-30'

const problemText = (p: Problem) => t(`aifw.problem.${p}` as MessageKey)

type Kind = Destination['kind']
const DEST_KINDS: readonly Kind[] = ['new_notebook', 'notebook', 'page']

/**
 * The Build screen's first half (AF-20): where the result goes, the steps to
 * pick from the catalog, and the plan as a list to reorder, untick or remove.
 */
export function BuildPlan({
  db,
  onStart,
  onDestination,
}: {
  db: LearningNotesDB
  onStart: (plan: Record<string, unknown>, name: string) => void
  /** Told whenever the destination changes (the goal box above uses it). */
  onDestination: (destination: Destination) => void
}) {
  const tools = useMemo(() => toCatalog(), [])
  const [draft, dispatch] = useReducer(reduce, undefined, newDraft)
  const notebooks = useLiveQuery(
    () =>
      db.notebooks
        .filter((n) => !n.deletedAt && !n.kind)
        .toArray()
        .then((l) => l.sort((a, b) => a.title.localeCompare(b.title))),
    [db],
  )
  const pages = useLiveQuery(
    () =>
      db.pages
        .filter((p) => !p.deletedAt)
        .limit(500)
        .toArray()
        .then((l) => l.sort((a, b) => a.title.localeCompare(b.title))),
    [db],
  )
  const told = draft.destination
  useEffect(() => onDestination(told), [told, onDestination])
  const checked = check(draft, tools)
  const dest = draft.destination
  const pickable = tools.filter(
    (x) =>
      x.id !== 'notebooks.create' &&
      x.surfaces.includes('app') &&
      !NEEDS_OWN_ARGS.has(x.id),
  )

  const setKind = (kind: Kind) =>
    dispatch({
      type: 'destination',
      destination:
        kind === 'new_notebook'
          ? { kind, title: '' }
          : kind === 'notebook'
            ? { kind, id: '' }
            : { kind, id: '', notebookId: '' },
    })

  const nameOf = (): string => {
    if (dest.kind === 'new_notebook') return dest.title.trim()
    if (dest.kind === 'notebook')
      return notebooks?.find((n) => n.id === dest.id)?.title ?? ''
    return pages?.find((p) => p.id === dest.id)?.title ?? ''
  }

  const start = () => {
    if (!isReady(checked)) return
    const name = nameOf() || t('aifw.tab.build')
    const id = newJobId()
    onStart(
      toPlan(draft, tools, {
        id,
        goal: name,
        defaultBrief: t('aifw.defaultBrief'),
      }),
      name,
    )
  }

  return (
    <div className="flex flex-col gap-4" data-testid="aifw-build">
      <fieldset className={card} data-aifw-card>
        <legend className="float-left mb-1 w-full text-sm font-semibold">
          {t('aifw.dest.title')}
        </legend>
        <OnOffChoice<Kind>
          block
          label={t('aifw.dest.title')}
          value={dest.kind}
          onChange={setKind}
          options={DEST_KINDS.map((k) => ({
            value: k,
            testId: `aifw-dest-kind-${k}`,
            label: t(
              (k === 'new_notebook'
                ? 'aifw.dest.new'
                : k === 'notebook'
                  ? 'aifw.dest.notebook'
                  : 'aifw.dest.page') as MessageKey,
            ),
          }))}
        />
        {dest.kind === 'new_notebook' && (
          <input
            type="text"
            value={dest.title}
            maxLength={120}
            aria-label={t('aifw.dest.name')}
            placeholder={t('aifw.dest.name')}
            data-testid="aifw-dest-name"
            className={field}
            onChange={(e) =>
              dispatch({
                type: 'destination',
                destination: { kind: 'new_notebook', title: e.target.value },
              })
            }
          />
        )}
        {dest.kind === 'notebook' && (
          <select
            value={dest.id}
            aria-label={t('aifw.dest.pickNotebook')}
            data-testid="aifw-dest-notebook"
            className={field}
            onChange={(e) =>
              dispatch({
                type: 'destination',
                destination: { kind: 'notebook', id: e.target.value },
              })
            }
          >
            <option value="">{t('aifw.dest.choose')}</option>
            {notebooks?.map((n) => (
              <option key={n.id} value={n.id}>
                {n.title}
              </option>
            ))}
          </select>
        )}
        {dest.kind === 'page' && (
          <select
            value={dest.id}
            aria-label={t('aifw.dest.pickPage')}
            data-testid="aifw-dest-page"
            className={field}
            onChange={(e) =>
              dispatch({
                type: 'destination',
                destination: {
                  kind: 'page',
                  id: e.target.value,
                  notebookId:
                    pages?.find((p) => p.id === e.target.value)?.notebookId ??
                    '',
                },
              })
            }
          >
            <option value="">{t('aifw.dest.choose')}</option>
            {pages?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        )}
        {checked.plan && checked.plan !== 'empty' && (
          <p className="text-xs text-muted" data-testid="aifw-plan-problem">
            {problemText(checked.plan)}
          </p>
        )}
      </fieldset>

      <section className={card} data-aifw-card aria-labelledby="aifw-pick">
        <h3 id="aifw-pick" className="text-sm font-semibold">
          {t('aifw.pick.title')}
        </h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {pickable.map((tool) => (
            <li key={tool.id}>
              <button
                type="button"
                data-testid={`aifw-pick-${tool.id}`}
                aria-label={t('aifw.pick.add', { name: toolName(tool.id) })}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-line px-3 py-2 text-left hover:bg-hover"
                onClick={() => dispatch({ type: 'add', tool: tool.id })}
              >
                <Plus size={18} strokeWidth={1.6} aria-hidden />
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">
                    {toolName(tool.id)}
                  </span>
                  <span className="text-xs text-muted">
                    {toolDesc(tool.id)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className={card} data-aifw-card aria-labelledby="aifw-plan">
        <h3 id="aifw-plan" className="text-sm font-semibold">
          {t('aifw.plan.title')}
        </h3>
        <ol className="flex flex-col gap-2" data-testid="aifw-steps">
          {dest.kind === 'new_notebook' && (
            <li className="rounded-lg border border-line bg-soft px-3 py-2 text-sm text-muted">
              {t('aifw.plan.first')}
            </li>
          )}
          {draft.steps.length === 0 && (
            <li className="text-sm text-muted">{t('aifw.plan.empty')}</li>
          )}
          {draft.steps.map((s, i) => {
            const tool = tools.find((x) => x.id === s.tool)
            if (!tool) return null
            const name = toolName(s.tool)
            const problem = checked.steps[s.uid]
            const hasBrief =
              s.tool !== 'styles.apply' && !!tool.inputs.properties?.brief
            return (
              <li
                key={s.uid}
                data-testid="aifw-step"
                data-tool={s.tool}
                className="flex flex-col gap-2 rounded-lg border border-line p-2"
              >
                <div className="flex items-center gap-1">
                  <label className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      aria-label={t('aifw.step.include', { name })}
                      data-testid="aifw-step-on"
                      className="size-5"
                      onChange={() => dispatch({ type: 'toggle', uid: s.uid })}
                    />
                    <span
                      className={s.enabled ? '' : 'text-muted line-through'}
                    >
                      {name}
                    </span>
                  </label>
                  <button
                    type="button"
                    className={iconBtn}
                    disabled={i === 0}
                    aria-label={t('aifw.step.up', { name })}
                    data-testid="aifw-step-up"
                    onClick={() =>
                      dispatch({ type: 'move', uid: s.uid, by: -1 })
                    }
                  >
                    <ArrowUp size={18} strokeWidth={1.6} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={iconBtn}
                    disabled={i === draft.steps.length - 1}
                    aria-label={t('aifw.step.down', { name })}
                    data-testid="aifw-step-down"
                    onClick={() =>
                      dispatch({ type: 'move', uid: s.uid, by: 1 })
                    }
                  >
                    <ArrowDown size={18} strokeWidth={1.6} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={iconBtn}
                    aria-label={t('aifw.step.remove', { name })}
                    data-testid="aifw-step-remove"
                    onClick={() => dispatch({ type: 'remove', uid: s.uid })}
                  >
                    <X size={18} strokeWidth={1.6} aria-hidden />
                  </button>
                </div>
                {s.enabled && (hasBrief || tool.inputs.properties?.count) && (
                  <div className="flex flex-wrap items-center gap-2 pl-8">
                    {hasBrief && (
                      <input
                        type="text"
                        value={s.brief}
                        maxLength={500}
                        aria-label={t('aifw.step.brief')}
                        placeholder={t('aifw.step.brief')}
                        title={t('aifw.step.briefHint')}
                        data-testid="aifw-step-brief"
                        className={`${field} min-w-0 flex-1`}
                        onChange={(e) =>
                          dispatch({
                            type: 'edit',
                            uid: s.uid,
                            patch: { brief: e.target.value },
                          })
                        }
                      />
                    )}
                    {tool.inputs.properties?.count && (
                      <label className="flex items-center gap-2 text-sm">
                        {t('aifw.step.count')}
                        <input
                          type="number"
                          min={1}
                          max={200}
                          value={s.count}
                          data-testid="aifw-step-count"
                          className={`${field} w-24`}
                          onChange={(e) =>
                            dispatch({
                              type: 'edit',
                              uid: s.uid,
                              patch: { count: Number(e.target.value) },
                            })
                          }
                        />
                      </label>
                    )}
                  </div>
                )}
                {s.enabled && s.tool === 'styles.apply' && (
                  <div
                    role="radiogroup"
                    aria-label={t('aifw.step.colourLabel')}
                    className="flex flex-wrap gap-1 pl-8"
                  >
                    {COLOURS.map((c, n) => (
                      <button
                        key={c}
                        type="button"
                        role="radio"
                        aria-checked={s.colour === c}
                        aria-label={t('aifw.step.colour', { n: n + 1 })}
                        className={`inline-flex size-11 items-center justify-center rounded-lg ${
                          s.colour === c ? 'bg-soft' : 'hover:bg-hover'
                        }`}
                        onClick={() =>
                          dispatch({
                            type: 'edit',
                            uid: s.uid,
                            patch: { colour: c },
                          })
                        }
                      >
                        <span
                          className="size-6 rounded-full border border-line"
                          style={{ background: c }}
                        />
                      </button>
                    ))}
                  </div>
                )}
                {s.enabled && problem && (
                  <p
                    className="pl-8 text-xs text-muted"
                    data-testid="aifw-step-problem"
                  >
                    {problemText(problem)}
                  </p>
                )}
              </li>
            )
          })}
        </ol>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="aifw-start"
          disabled={!isReady(checked)}
          className={primary}
          onClick={start}
        >
          {t('aifw.start')}
        </button>
        <button
          type="button"
          className={btn}
          disabled={draft.steps.length === 0}
          onClick={() => dispatch({ type: 'reset' })}
        >
          {t('aifw.reset')}
        </button>
        {checked.plan === 'empty' && (
          <span className="text-xs text-muted">{problemText('empty')}</span>
        )}
      </div>
    </div>
  )
}
