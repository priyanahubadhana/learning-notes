import { useState, type ReactNode } from 'react'
import { ReorderList } from '../parts/drag/ReorderList'
import { moveItem } from '../parts/drag/reorder'
import { Cells, Demo, Section } from './Bits'
import { G } from './galleryText'

type Item = { id: string; name: string; wide?: boolean }

const LIST: Item[] = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'].map(
  (n) => ({
    id: n.toLowerCase(),
    name: n,
  }),
)
const GRID: Item[] = [
  { id: 'g1', name: 'Small 1' },
  { id: 'g2', name: 'Small 2' },
  { id: 'g3', name: 'Wide', wide: true },
  { id: 'g4', name: 'Small 3' },
  { id: 'g5', name: 'Small 4' },
  { id: 'g6', name: 'Small 5' },
]
const COLS = 4

/** Every item must start inside its row (a wide one never straddles the end). */
function gridFits(order: string[], cols: number): boolean {
  let col = 0
  for (const id of order) {
    const span = GRID.find((g) => g.id === id)?.wide ? 2 : 1
    if (col + span > cols) return false
    col = (col + span) % cols
  }
  return true
}

/** Columns the grid really shows right now (it drops columns on a phone). */
function gridCols(): number {
  const el = document.querySelector('[data-testid="drag-grid"]')
  if (!el) return COLS
  return Math.max(1, getComputedStyle(el).gridTemplateColumns.split(' ').length)
}

function Row({
  item,
  grip,
  moves,
}: {
  item: Item
  grip: ReactNode
  moves: ReactNode
}) {
  return (
    <div className="gal-drag-row flex items-center gap-2 p-2">
      {grip}
      <span className="flex-1 select-text">{item.name}</span>
      {moves}
    </div>
  )
}

/** The live list: grip, long-hold, ▲▼ and Alt+arrows; every move is one Undo step. */
function LiveList() {
  const [items, setItems] = useState(LIST)
  const [past, setPast] = useState<Item[][]>([])
  const [last, setLast] = useState('No move yet')
  const [toast, setToast] = useState('')
  return (
    <div className="flex w-80 max-w-full flex-col gap-2">
      <ReorderList
        items={items}
        getId={(i) => i.id}
        label={(i) => i.name}
        axis="y"
        handle="both"
        showMoveButtons
        testId="drag-list"
        aria-label={G.reorderableList}
        className="bg-surface-1 rounded-[var(--r-md)]"
        onMove={(id, to, kind) => {
          const from = items.findIndex((i) => i.id === id)
          const name = items[from]?.name ?? id
          setPast((p) => [...p, items])
          setItems(moveItem(items, from, to))
          setLast(`Last moved: ${name}`)
          setToast(kind === 'drag' ? `Moved ${name}` : '')
        }}
        renderItem={(item, ctx) => (
          <Row item={item} grip={ctx.grip} moves={ctx.moveButtons} />
        )}
      />
      <div className="flex items-center gap-3">
        <span className="t-small" data-testid="drag-last" aria-live="polite">
          {last}
        </span>
        <span
          className="t-small text-muted"
          data-testid="drag-steps"
          data-steps={past.length}
        >
          {past.length} {G.stepS}
        </span>
      </div>
      {toast && (
        <div
          className="bg-surface-2 t-small flex items-center gap-3 rounded-[var(--r-md)] p-2"
          role="status"
          data-testid="drag-toast"
        >
          <span>{toast}</span>
          <button
            type="button"
            className="ds-btn ds-tertiary"
            data-testid="drag-toast-undo"
            onClick={() => {
              const prev = past[past.length - 1]
              if (prev) {
                setItems(prev)
                setPast(past.slice(0, -1))
              }
              setToast('')
            }}
          >
            {G.undo}
          </button>
        </div>
      )}
      <button
        type="button"
        className="ds-btn ds-secondary self-start"
        data-testid="drag-undo"
        disabled={!past.length}
        onClick={() => {
          const prev = past[past.length - 1]
          if (!prev) return
          setItems(prev)
          setPast(past.slice(0, -1))
          setToast('')
        }}
      >
        {G.undoLastMove}
      </button>
    </div>
  )
}

/** A frozen picture of one drag state (no pointer needed). */
function Frozen({
  state,
  line,
}: {
  state: 'idle' | 'hold-pending' | 'lifted' | 'invalid'
  line?: boolean
}) {
  const names = ['Alpha', 'Bravo', 'Charlie']
  return (
    <ul
      role="list"
      className="rord bg-surface-1 relative w-64 rounded-[var(--r-md)]"
      data-axis="y"
      data-testid={`frozen-${state}`}
    >
      {names.map((n, i) => (
        <li
          key={n}
          className="rord-item"
          data-state={i === 1 ? state : 'idle'}
          style={
            i === 1 && (state === 'lifted' || state === 'invalid')
              ? {
                  transform: 'translateY(-6px) scale(1.02)',
                  boxShadow: 'var(--elev-3)',
                }
              : undefined
          }
        >
          <div className="p-3">{n}</div>
        </li>
      ))}
      {line && (
        <li
          role="presentation"
          className="rord-line"
          data-axis="y"
          data-testid="frozen-line"
          aria-hidden
          style={{ left: 0, top: 48, width: '100%' }}
        />
      )}
    </ul>
  )
}

function Grid() {
  const [items, setItems] = useState(GRID)
  const [rejected, setRejected] = useState('')
  return (
    <div className="flex w-full max-w-lg flex-col gap-2 [--rord-min:7rem]">
      <ReorderList
        items={items}
        getId={(i) => i.id}
        label={(i) => i.name}
        axis="grid"
        cols={COLS}
        span={(i) => (i.wide ? 2 : 1)}
        handle="both"
        showMoveButtons
        testId="drag-grid"
        aria-label={G.widgetGrid}
        fit={(_id, _slot, order) => gridFits(order, gridCols())}
        onReject={(id) => setRejected(`${id} went back`)}
        onMove={(id, to) => {
          const from = items.findIndex((i) => i.id === id)
          setItems(moveItem(items, from, to))
        }}
        renderItem={(item, ctx) => (
          <div
            className="flex flex-wrap items-center gap-x-1 p-2"
            data-wide={item.wide ? '' : undefined}
          >
            {ctx.grip}
            <span className="t-small flex-1 whitespace-nowrap">
              {item.name}
            </span>
            {ctx.moveButtons}
          </div>
        )}
      />
      <span
        className="t-small text-muted"
        data-testid="grid-note"
        aria-live="polite"
      >
        {rejected}
      </span>
    </div>
  )
}

function Ends() {
  return (
    <ReorderList
      items={LIST.slice(0, 3)}
      getId={(i) => i.id}
      label={(i) => i.name}
      axis="y"
      handle="grip"
      showMoveButtons
      testId="drag-ends"
      aria-label={G.endsList}
      className="bg-surface-1 w-72 rounded-[var(--r-md)]"
      onMove={() => {}}
      renderItem={(item, ctx) => (
        <Row item={item} grip={ctx.grip} moves={ctx.moveButtons} />
      )}
    />
  )
}

export default function DragSection() {
  return (
    <Section
      id="drag"
      title={G.dragToReorder}
      help="Drag by the grip, hold a row for 0.3 seconds, or press Alt with the arrow keys."
    >
      <Demo state="idle" label="List, idle (live: try it)">
        <LiveList />
      </Demo>
      <Cells>
        <Demo state="hold-pending" label="Hold pending (press ring)">
          <Frozen state="hold-pending" />
        </Demo>
        <Demo state="lifted" label="Lifted, drop-line shows the landing">
          <Frozen state="lifted" line />
        </Demo>
        <Demo
          state="invalid"
          label="Invalid slot (snaps to the nearest that fits)"
        >
          <Frozen state="invalid" />
        </Demo>
      </Cells>
      <Demo state="grid" label="Grid, live reflow with a wide item (live)">
        <Grid />
      </Demo>
      <Demo state="ends" label="▲ on the first and ▼ on the last are off">
        <Ends />
      </Demo>
    </Section>
  )
}
