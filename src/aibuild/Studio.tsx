import { Redo2, Undo2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatCost } from '../ai/costCurrency'
import { toCatalog } from '../aitools/catalog'
import { DEFAULT_USD_TO_INR } from '../aitools/plan/cost'
import type { LearningNotesDB } from '../core/db'
import { t, type MessageKey } from '../i18n/t'
import { newDraft, newJobId, type Destination } from './buildState'
import { DestinationPicker } from './DestinationPicker'
import { destinationName, useDestinationLists } from './destinationLists'
import { RunBar } from './RunBar'
import {
  canRedo,
  canUndo,
  commit,
  newHistory,
  redo,
  undo,
} from './studioHistory'
import {
  STUDIO_TILES,
  placements,
  studioCost,
  studioDraft,
  studioPlan,
  toggleTile,
} from './studioPlan'

const card = 'flex flex-col gap-2 rounded-lg border border-line p-3'
const btn =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-line px-3 text-sm hover:bg-hover disabled:opacity-40 sm:w-auto'

const histBtn =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line px-3 text-sm hover:bg-hover disabled:opacity-40'

/** The place in words for the "where it goes" rows. */
function whereText(d: Destination, name: string): string {
  if (d.kind === 'new_notebook')
    return name ? t('aifw.dest.newNb', { title: name }) : t('aifw.dest.new')
  if (d.kind === 'notebook')
    return name ? t('aifw.dest.inNb', { title: name }) : t('aifw.dest.notebook')
  return name ? t('aifw.dest.inPage', { title: name }) : t('aifw.dest.page')
}

/**
 * Studio (owner comment A3): tick what to make, choose where it goes, and
 * "Make selected" builds ONE plan of real catalog steps with one combined
 * cost, then the same run, preview, Apply and Undo flow as Build.
 */
export function Studio({
  db,
  onStart,
  onSave,
}: {
  db: LearningNotesDB
  onStart: (plan: Record<string, unknown>, name: string) => void
  onSave: (plan: Record<string, unknown>, name: string) => void
}) {
  const tools = useMemo(() => toCatalog(), [])
  const lists = useDestinationLists(db)
  const [h, setH] = useState(() =>
    newHistory<{ sel: string[]; dest: Destination }>({
      sel: [],
      dest: newDraft().destination,
    }),
  )
  const [note, setNote] = useState('')
  const { sel, dest } = h.present
  const tileName = (id: string) => t(`aifw.studio.tile.${id}` as MessageKey)
  const tick = (id: string) => {
    const on = sel.includes(id)
    setNote('')
    setH(
      commit(
        h,
        { sel: toggleTile(sel, id), dest },
        t(on ? 'aifw.studio.did.untick' : 'aifw.studio.did.tick', {
          name: tileName(id),
        }),
      ),
    )
  }
  const place = (d: Destination) => {
    const typing = d.kind === 'new_notebook' && dest.kind === 'new_notebook'
    setNote('')
    setH(
      commit(
        h,
        { sel, dest: d },
        t(typing ? 'aifw.studio.did.name' : 'aifw.studio.did.dest'),
        typing ? 'name' : undefined,
      ),
    )
  }
  const step = (dir: 'undo' | 'redo') => {
    const next = dir === 'undo' ? undo(h) : redo(h)
    const what = dir === 'undo' ? h.label : next.label
    setH(next)
    setNote(
      t(dir === 'undo' ? 'aifw.studio.undid' : 'aifw.studio.redid', { what }),
    )
  }
  const name = destinationName(dest, lists)
  const draft = studioDraft(sel, dest)
  const cost = studioCost(draft, tools)
  const ready = sel.length > 0 && !cost.checked.plan
  const goal = t('aifw.studio.goal', { name: name || t('aifw.studio.title') })
  const brief = t('aifw.defaultBrief')
  const make = () => studioPlan(sel, dest, tools, newJobId(), { goal, brief })

  return (
    <div className="flex flex-col gap-4" data-testid="aifw-studio">
      <section className={card} data-aifw-card aria-labelledby="aifw-stu-h">
        <h3 id="aifw-stu-h" className="text-sm font-semibold">
          {t('aifw.studio.title')}
        </h3>
        <p className="text-xs text-muted">{t('aifw.studio.hint')}</p>
        <div
          role="group"
          aria-label={t('aifw.studio.tiles')}
          className="grid gap-2 sm:grid-cols-2"
        >
          {STUDIO_TILES.map((x) => {
            const on = sel.includes(x.id)
            return (
              <button
                key={x.id}
                type="button"
                aria-pressed={on}
                data-testid={`aifw-tile-${x.id}`}
                className={`flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm hover:bg-hover ${
                  on ? 'border-accent bg-soft font-semibold' : 'border-line'
                }`}
                onClick={() => tick(x.id)}
              >
                <span
                  aria-hidden
                  className={`inline-flex size-5 shrink-0 items-center justify-center rounded border text-xs ${
                    on
                      ? 'border-accent bg-accent text-on-accent'
                      : 'border-line'
                  }`}
                >
                  {on ? '✓' : ''}
                </span>
                {tileName(x.id)}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={histBtn}
            disabled={!canUndo(h)}
            data-testid="aifw-studio-undo"
            onClick={() => step('undo')}
          >
            <Undo2 size={18} strokeWidth={1.6} aria-hidden />
            {t('aifw.undo')}
          </button>
          <button
            type="button"
            className={histBtn}
            disabled={!canRedo(h)}
            data-testid="aifw-studio-redo"
            onClick={() => step('redo')}
          >
            <Redo2 size={18} strokeWidth={1.6} aria-hidden />
            {t('aifw.redo')}
          </button>
          <span
            role="status"
            aria-live="polite"
            className="min-w-0 text-xs text-muted"
            data-testid="aifw-studio-note"
          >
            {note || h.label}
          </span>
        </div>
      </section>

      <fieldset className={card} data-aifw-card>
        <legend className="float-left mb-1 w-full text-sm font-semibold">
          {t('aifw.dest.title')}
        </legend>
        <DestinationPicker value={dest} lists={lists} onChange={place} />
      </fieldset>

      {sel.length > 0 && (
        <section
          className={card}
          data-aifw-card
          aria-labelledby="aifw-stu-where"
          data-testid="aifw-studio-where"
        >
          <h3 id="aifw-stu-where" className="text-sm font-semibold">
            {t('aifw.studio.where')}
          </h3>
          <ul className="flex flex-col gap-1 text-sm">
            {placements(sel).map((x) => (
              <li
                key={x.id}
                data-testid={`aifw-place-${x.id}`}
                className="flex flex-wrap gap-x-2"
              >
                <b className="font-semibold">{tileName(x.id)}</b>
                <span className="min-w-0 break-words text-muted">
                  {t('aifw.studio.placeRow', {
                    where: whereText(dest, name),
                    place: t(`aifw.studio.place.${x.place}` as MessageKey),
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {sel.length === 0 ? (
        <p className="text-xs text-muted" data-testid="aifw-studio-none">
          {t('aifw.studio.none')}
        </p>
      ) : (
        <p className="text-xs text-muted" data-testid="aifw-studio-steps">
          {t('aifw.studio.steps', { n: cost.steps })}
        </p>
      )}
      <RunBar
        path={name}
        chip={t('aifw.effort.standard')}
        estimate={
          ready
            ? t('aifw.bar.estimate', {
                cost: formatCost(cost.totalInr / DEFAULT_USD_TO_INR),
              })
            : t('aifw.bar.noEstimate')
        }
        runLabel={t('aifw.studio.make', { n: sel.length })}
        runTestId="aifw-studio-make"
        disabled={!ready}
        onRun={() => {
          const plan = make()
          if (plan) onStart(plan, goal)
        }}
      >
        <button
          type="button"
          className={btn}
          disabled={!ready}
          data-testid="aifw-studio-save"
          onClick={() => {
            const plan = make()
            if (plan) onSave(plan, goal)
          }}
        >
          {t('aifw.wf.save')}
        </button>
      </RunBar>
    </div>
  )
}
