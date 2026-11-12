import { useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AppUiContext } from '../../app/appUi'
import { usePref } from '../../app/usePref'
import type { LearningNotesDB } from '../../core/db'
import type { Project, Task } from '../../core/homeTypes'
import { ReorderList } from '../../design/parts/drag/ReorderList'
import { t, type MessageKey } from '../../i18n/t'
import type { Briefing } from '../briefing'
import { BriefingCard } from '../BriefingCard'
import { TimerCard } from '../TimerCard'
import { Top3 } from '../Top3'
import {
  BOARD_COLS,
  DEFAULT_LAYOUT,
  SIZES,
  spanOf,
  fitsSlot,
  isLayoutish,
  moveWidget,
  normalizeLayout,
  setSize,
  settleWidget,
  type Layout,
  type Slot,
  type WidgetId,
} from './boardLogic'
import { PendingCard } from './PendingCard'
import { SourcePopup } from './SourcePopup'
import './board.css'

export interface BoardData {
  db: LearningNotesDB
  today: string
  tasks: Task[]
  projects: Project[]
  briefing: Briefing | null
  cardsDue: number
  record: { open: unknown[]; done: unknown[]; carried: unknown[] }
  openReview: () => void
}

/**
 * Home v2 > Today: a board of widgets you can arrange. Edit layout turns on
 * the grip, S / M / L and the up/down buttons on each widget, with Done,
 * Cancel and Reset.
 */
export function HomeBoard({ data }: { data: BoardData }) {
  const { toast } = useContext(AppUiContext)
  const [stored, setStored] = usePref<unknown[]>(
    'home.v2.layout',
    isLayoutish,
    DEFAULT_LAYOUT,
  )
  const saved = normalizeLayout(stored)
  const [draft, setDraft] = useState<Layout | null>(null)
  const editing = draft !== null
  const layout = draft ?? saved
  const [cols, listRef] = useGridCols()

  const done = () => {
    if (draft) setStored(draft)
    setDraft(null)
    toast(t('home.v2.saved'))
  }

  return (
    <div
      data-testid="home-board"
      data-editing={editing ? '' : undefined}
      className="flex flex-col"
    >
      <div ref={listRef}>
        <ReorderList<Slot>
          items={layout}
          getId={(s) => s.id}
          axis="grid"
          cols={BOARD_COLS}
          span={(s) => spanOf(s.size, cols)}
          handle="grip"
          showMoveButtons
          disabled={!editing}
          label={(s) => t(`home.v2.w.${s.id}` as MessageKey)}
          fit={(_id, slot, order) => fitsSlot(layout, order, slot, cols)}
          onMove={(id, to) => setDraft(moveWidget(layout, id as WidgetId, to))}
          aria-label={t('home.v2.board')}
          testId="home-widgets"
          className="home-board"
          renderItem={(slot, ctx) => (
            <WidgetFrame
              slot={slot}
              editing={editing}
              grip={ctx.grip}
              moveButtons={ctx.moveButtons}
              onSize={(size) =>
                setDraft(
                  settleWidget(setSize(layout, slot.id, size), slot.id, cols),
                )
              }
            >
              <WidgetBody id={slot.id} data={data} />
            </WidgetFrame>
          )}
        />
      </div>
      {/* After the list in the page, shown first: it then paints above the widgets. */}
      {editing ? (
        <div
          role="toolbar"
          aria-label={t('home.v2.editBar')}
          data-testid="home-edit-bar"
          className="sticky top-0 order-first mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-accent bg-bg px-3 py-2"
        >
          <span className="me-auto text-sm font-semibold">
            {t('home.v2.editBar')}
          </span>
          <button
            type="button"
            onClick={() => setDraft(null)}
            className="min-h-11 rounded-lg border border-line px-4 text-sm hover:bg-hover"
          >
            {t('home.v2.cancel')}
          </button>
          <button
            type="button"
            onClick={() => setDraft(normalizeLayout(null))}
            className="min-h-11 rounded-lg border border-line px-4 text-sm hover:bg-hover"
          >
            {t('home.v2.reset')}
          </button>
          <button
            type="button"
            onClick={done}
            className="min-h-11 rounded-lg bg-accent px-5 text-sm font-semibold text-on-accent"
          >
            {t('home.v2.done')}
          </button>
        </div>
      ) : (
        <div className="order-first mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setDraft(saved)}
            data-testid="home-edit"
            className="min-h-11 rounded-lg border border-line px-4 text-sm hover:border-accent"
          >
            {t('home.v2.edit')}
          </button>
        </div>
      )}
    </div>
  )
}

/** How many columns the grid really has right now (it drops to fewer on narrow screens). */
function useGridCols() {
  const ref = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(BOARD_COLS)
  useEffect(() => {
    const el = ref.current
    const ul = el?.querySelector('ul')
    if (!el || !ul) return
    const read = () => {
      const n = getComputedStyle(ul)
        .gridTemplateColumns.split(' ')
        .filter(Boolean).length
      if (n > 0) setCols(n)
    }
    read()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(read)
    ro.observe(ul)
    return () => ro.disconnect()
  }, [])
  return [cols, ref] as const
}

function WidgetFrame({
  slot,
  editing,
  grip,
  moveButtons,
  onSize,
  children,
}: {
  slot: Slot
  editing: boolean
  grip: ReactNode
  moveButtons: ReactNode
  onSize: (size: Slot['size']) => void
  children: ReactNode
}) {
  const [source, setSource] = useState(false)
  const opener = useRef<HTMLButtonElement>(null)
  const name = t(`home.v2.w.${slot.id}` as MessageKey)
  return (
    <section
      aria-label={name}
      data-testid={`widget-${slot.id}`}
      data-size={slot.size}
      className={`home-widget rounded-xl border border-line bg-bg p-3 ${editing ? 'select-none' : ''}`}
    >
      <header className="mb-2 flex flex-wrap items-center gap-1">
        {editing && grip}
        <h3 className="me-auto text-sm font-semibold">{name}</h3>
        {editing && moveButtons}
        {editing && (
          <div
            role="radiogroup"
            aria-label={t('home.v2.size', { name })}
            className="inline-flex"
          >
            {SIZES.map((size) => (
              <button
                key={size}
                type="button"
                role="radio"
                aria-checked={slot.size === size}
                aria-label={t(`home.v2.size.${size}.name` as MessageKey)}
                data-testid={`size-${slot.id}-${size}`}
                onClick={() => onSize(size)}
                className={`min-h-11 min-w-11 rounded-lg text-sm ${
                  slot.size === size
                    ? 'bg-hover font-semibold text-accent'
                    : 'text-ink-soft hover:bg-hover'
                }`}
              >
                {t(`home.v2.size.${size}` as MessageKey)}
              </button>
            ))}
          </div>
        )}
        <button
          ref={opener}
          type="button"
          onClick={() => setSource(true)}
          data-testid={`source-${slot.id}`}
          className="min-h-11 rounded-lg px-2 text-xs text-muted hover:bg-hover hover:text-ink"
        >
          {t('home.v2.source')}
        </button>
      </header>
      {/* key: a size change replays the short settle animation. */}
      <div
        key={slot.size}
        className="home-widget-body"
        inert={editing}
        data-testid={`body-${slot.id}`}
      >
        {children}
      </div>
      {source && (
        <SourcePopup
          id={slot.id}
          opener={opener}
          onClose={() => setSource(false)}
        />
      )}
    </section>
  )
}

function WidgetBody({ id, data }: { id: WidgetId; data: BoardData }) {
  const { db, today, tasks, projects } = data
  switch (id) {
    case 'cards':
      return data.cardsDue > 0 ? (
        <button
          type="button"
          data-testid="due-tile"
          onClick={data.openReview}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-start text-accent hover:bg-hover"
        >
          <span className="font-semibold tabular-nums">
            {t('home.due.tile', { count: data.cardsDue })}
          </span>
          <span aria-hidden>›</span>
        </button>
      ) : (
        <p className="text-sm text-muted">{t('home.v2.cards.none')}</p>
      )
    case 'briefing':
      return data.briefing ? (
        <BriefingCard briefing={data.briefing} onOpenCards={data.openReview} />
      ) : null
    case 'top3':
      return <Top3 db={db} tasks={tasks} today={today} />
    case 'timer':
      return <TimerCard db={db} projects={projects} />
    case 'pending':
      return <PendingCard db={db} tasks={tasks} today={today} />
    case 'record':
      return (
        <div className="grid grid-cols-3 gap-2 text-center">
          {(
            [
              ['home.record.open', data.record.open.length],
              ['home.record.done', data.record.done.length],
              ['home.record.carried', data.record.carried.length],
            ] as const
          ).map(([key, n]) => (
            <div key={key}>
              <div className="text-2xl font-semibold tabular-nums">{n}</div>
              <div className="text-xs text-muted">{t(key)}</div>
            </div>
          ))}
        </div>
      )
  }
}
