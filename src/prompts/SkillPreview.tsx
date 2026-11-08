import { useMemo, useState } from 'react'
import { runTask } from '../app/errors'
import { t, type MessageKey } from '../i18n/t'
import type { RunCost } from './promptRun'
import { CostLine } from './RunParts'
import { choose, NOTHING_OFF, type Off, type Sections } from './skillChoose'
import { SkillIcon } from './SkillIcon'
import { levelOf, type SkillResult } from './skillFormat'
import type { Chosen, Target } from './skillSave'

const btn =
  'min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover disabled:opacity-50'
const primary =
  'min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50'
const input = 'min-h-11 rounded-lg border border-line bg-bg px-2 text-sm'

const toggle = (set: ReadonlySet<number>, i: number): Set<number> => {
  const next = new Set(set)
  if (next.has(i)) next.delete(i)
  else next.add(i)
  return next
}

/** A section heading with its on/off box. */
function Section({
  label,
  on,
  onChange,
  count,
  children,
}: {
  label: string
  on: boolean
  onChange: (on: boolean) => void
  count?: number
  children?: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-line p-2">
      <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          className="size-5"
          checked={on}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label}
        {count !== undefined && (
          <span className="font-normal text-muted">({count})</span>
        )}
      </label>
      {on && children}
    </section>
  )
}

/**
 * The preview of a skill result: every part can be edited or unticked, then
 * Save puts the ticked parts into an existing notebook or a new one (for
 * example a Research book). Nothing is written before Save.
 */
export function SkillPreview({
  initial,
  notebooks,
  defaultNotebookId,
  saving,
  onSave,
  onCancel,
  fact,
  footer,
}: {
  initial: SkillResult
  notebooks: { id: string; title: string }[]
  defaultNotebookId?: string
  saving: boolean
  onSave: (chosen: Chosen, target: Target) => void
  onCancel: () => void
  /** The optional second-model fact check: its cost is shown before it runs. */
  fact?: { cost: RunCost; run: (current: SkillResult) => Promise<SkillResult> }
  /** Shown under the sections (the result rating). */
  footer?: React.ReactNode
}) {
  const [result, setResult] = useState(initial)
  const [off, setOff] = useState<Off>(NOTHING_OFF)
  const [sections, setSections] = useState<Sections>({
    summary: !!initial.summary,
    keywords: initial.keywords.length > 0 || initial.points.length > 0,
    mindMap: initial.points.length > 0,
    rows: initial.points.length > 0,
    pages: initial.pages.length > 0,
    cards: initial.cards.length > 0 || initial.points.length > 0,
    sources: initial.sources.length > 0,
  })
  const [place, setPlace] = useState<string>(
    defaultNotebookId && notebooks.some((n) => n.id === defaultNotebookId)
      ? defaultNotebookId
      : 'new',
  )
  const [newTitle, setNewTitle] = useState(t('prompts.researchBook'))
  const [checking, setChecking] = useState(false)

  const flip = (k: keyof Sections) => (on: boolean) =>
    setSections((s) => ({ ...s, [k]: on }))
  const edit = (patch: Partial<SkillResult>) =>
    setResult((r) => ({ ...r, ...patch }))
  const chosen = useMemo(
    () => choose(result, off, sections),
    [result, off, sections],
  )
  const pointsOn = result.points.length - off.points.size
  const unchecked = chosen.result.points.filter((p) => !p.checked).length

  const label = (key: MessageKey) => t(key)
  const setPoint = (i: number, patch: Partial<SkillResult['points'][number]>) =>
    setResult((r) => ({
      ...r,
      points: r.points.map((p, j) => (j === i ? { ...p, ...patch } : p)),
    }))

  return (
    <div className="flex flex-col gap-3" data-testid="skill-preview">
      <h3 className="text-base font-semibold">{t('prompts.preview.title')}</h3>
      <p className="text-sm text-muted">{t('prompts.preview.help')}</p>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">{t('prompts.col.name')}</span>
        <input
          className={input}
          value={result.title}
          maxLength={200}
          onChange={(e) => edit({ title: e.target.value })}
        />
      </label>

      {result.summary !== '' && (
        <Section
          label={label('prompts.part.summary')}
          on={sections.summary}
          onChange={flip('summary')}
        >
          <textarea
            aria-label={label('prompts.part.summary')}
            className={`${input} min-h-24 w-full py-2`}
            value={result.summary}
            onChange={(e) => edit({ summary: e.target.value })}
          />
        </Section>
      )}

      <Section
        label={label('prompts.part.keywords')}
        on={sections.keywords}
        onChange={flip('keywords')}
        count={pointsOn}
      >
        <input
          aria-label={label('prompts.part.keywords')}
          className={`${input} mb-2 w-full`}
          value={result.keywords.join(', ')}
          onChange={(e) =>
            edit({
              keywords: e.target.value
                .split(',')
                .map((k) => k.trim())
                .filter(Boolean),
            })
          }
        />
        {unchecked > 0 && (
          <p className="mb-1 text-xs text-muted" data-testid="unchecked-count">
            {t('prompts.uncheckedCount', { count: unchecked })}
          </p>
        )}
        <ul className="flex max-h-[40vh] flex-col gap-1 overflow-auto">
          {result.points.map((p, i) => (
            <li
              key={i}
              data-testid="skill-point"
              className="flex flex-wrap items-center gap-1 rounded-lg border border-line px-1"
            >
              <input
                type="checkbox"
                className="size-5"
                aria-label={t('prompts.keepPoint', { text: p.text })}
                checked={!off.points.has(i)}
                onChange={() =>
                  setOff((o) => ({ ...o, points: toggle(o.points, i) }))
                }
              />
              <span className="flex size-6 items-center justify-center">
                <SkillIcon icon={p.icon} />
              </span>
              <input
                aria-label={t('prompts.icon')}
                className={`${input} w-20 px-1 text-center`}
                value={p.icon}
                maxLength={24}
                onChange={(e) => setPoint(i, { icon: e.target.value })}
              />
              <input
                aria-label={t('prompts.pointText')}
                className={`${input} min-w-40 flex-1`}
                value={p.text}
                maxLength={1000}
                onChange={(e) => setPoint(i, { text: e.target.value })}
              />
              <select
                aria-label={t('prompts.col.pointStars')}
                className={`${input} w-16`}
                value={p.stars}
                onChange={(e) => {
                  const stars = Number(e.target.value)
                  setPoint(i, { stars, level: levelOf(stars) })
                }}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span className="text-xs text-muted">
                {t(`prompts.level.${levelOf(p.stars)}` as MessageKey)}
                {p.sources.length > 0 &&
                  ` ${p.sources.map((n) => `[${n}]`).join('')}`}
                {p.flag
                  ? ` · ${t(`prompts.flag.${p.flag}` as MessageKey)}`
                  : !p.checked && ` · ${t('prompts.unchecked')}`}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {result.points.length > 0 && (
        <>
          <Section
            label={label('prompts.part.mindMap')}
            on={sections.mindMap}
            onChange={flip('mindMap')}
          />
          <Section
            label={label('prompts.part.rows')}
            on={sections.rows}
            onChange={flip('rows')}
          />
        </>
      )}

      {result.pages.length > 0 && (
        <Section
          label={label('prompts.part.pages')}
          on={sections.pages}
          onChange={flip('pages')}
          count={result.pages.length - off.pages.size}
        >
          <ul className="flex flex-col gap-2">
            {result.pages.map((p, i) => (
              <li
                key={i}
                data-testid="skill-page"
                className="rounded-lg border border-line p-1"
              >
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-5"
                    aria-label={t('prompts.keepPage', { title: p.title })}
                    checked={!off.pages.has(i)}
                    onChange={() =>
                      setOff((o) => ({ ...o, pages: toggle(o.pages, i) }))
                    }
                  />
                  <input
                    aria-label={t('prompts.pageTitle')}
                    className={`${input} flex-1`}
                    value={p.title}
                    onChange={(e) =>
                      setResult((r) => ({
                        ...r,
                        pages: r.pages.map((x, j) =>
                          j === i ? { ...x, title: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                </label>
                <textarea
                  aria-label={t('prompts.pageBody')}
                  className={`${input} mt-1 min-h-24 w-full py-2`}
                  value={p.body}
                  onChange={(e) =>
                    setResult((r) => ({
                      ...r,
                      pages: r.pages.map((x, j) =>
                        j === i ? { ...x, body: e.target.value } : x,
                      ),
                    }))
                  }
                />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(result.cards.length > 0 || result.points.length > 0) && (
        <Section
          label={label('prompts.part.cards')}
          on={sections.cards}
          onChange={flip('cards')}
          count={result.cards.length - off.cards.size}
        >
          <ul className="flex max-h-[35vh] flex-col gap-1 overflow-auto">
            {result.cards.map((c, i) => (
              <li
                key={i}
                data-testid="skill-card"
                className="flex flex-wrap items-center gap-1 rounded-lg border border-line px-1"
              >
                <input
                  type="checkbox"
                  className="size-5"
                  aria-label={t('prompts.keepCard', { text: c.q })}
                  checked={!off.cards.has(i)}
                  onChange={() =>
                    setOff((o) => ({ ...o, cards: toggle(o.cards, i) }))
                  }
                />
                <span className="text-xs text-muted">
                  {t(`prompts.card.${c.kind}` as MessageKey)}
                </span>
                <input
                  aria-label={t('prompts.cardFront')}
                  className={`${input} min-w-40 flex-1`}
                  value={c.q}
                  onChange={(e) =>
                    setResult((r) => ({
                      ...r,
                      cards: r.cards.map((x, j) =>
                        j === i ? { ...x, q: e.target.value } : x,
                      ),
                    }))
                  }
                />
                {c.kind !== 'cloze' && (
                  <input
                    aria-label={t('prompts.cardBack')}
                    className={`${input} min-w-40 flex-1`}
                    value={c.a}
                    onChange={(e) =>
                      setResult((r) => ({
                        ...r,
                        cards: r.cards.map((x, j) =>
                          j === i ? { ...x, a: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {result.sources.length > 0 && (
        <Section
          label={label('prompts.part.sources')}
          on={sections.sources}
          onChange={flip('sources')}
          count={result.sources.length - off.sources.size}
        >
          <ul className="flex flex-col gap-1">
            {result.sources.map((s, i) => (
              <li key={s.n} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-5"
                  aria-label={t('prompts.keepSource', { title: s.title })}
                  checked={!off.sources.has(i)}
                  onChange={() =>
                    setOff((o) => ({ ...o, sources: toggle(o.sources, i) }))
                  }
                />
                <span className="min-w-0 flex-1 break-words">
                  [{s.n}] {s.title}
                  {s.url && <span className="text-muted"> — {s.url}</span>}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {fact && result.points.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-line p-2">
          <CostLine cost={fact.cost} extra={t('prompts.factCheck')} />
          <button
            type="button"
            data-testid="fact-check"
            className={btn}
            disabled={checking}
            onClick={() => {
              setChecking(true)
              runTask(
                fact
                  .run(result)
                  .then(setResult)
                  .finally(() => setChecking(false)),
              )
            }}
          >
            {checking ? t('ai.working') : t('prompts.factCheckRun')}
          </button>
        </div>
      )}

      {footer}

      <div className="flex flex-col gap-2 rounded-lg border border-line p-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">{t('prompts.saveTo')}</span>
          <select
            data-testid="save-target"
            className={input}
            value={place}
            onChange={(e) => setPlace(e.target.value)}
          >
            <option value="new">{t('prompts.newNotebook')}</option>
            {notebooks.map((n) => (
              <option key={n.id} value={n.id}>
                {n.title || t('prompts.untitled')}
              </option>
            ))}
          </select>
        </label>
        {place === 'new' && (
          <input
            data-testid="save-new-title"
            aria-label={t('prompts.newNotebookName')}
            className={input}
            value={newTitle}
            maxLength={200}
            onChange={(e) => setNewTitle(e.target.value)}
          />
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={btn} onClick={onCancel}>
          {t('annot.cancel')}
        </button>
        <button
          type="button"
          data-testid="skill-save"
          className={primary}
          disabled={saving}
          onClick={() =>
            onSave(
              chosen,
              place === 'new'
                ? { kind: 'new', title: newTitle }
                : { kind: 'existing', notebookId: place },
            )
          }
        >
          {t('prompts.saveResult')}
        </button>
      </div>
    </div>
  )
}
