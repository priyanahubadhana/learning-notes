import { useState } from 'react'
import { ArrangeSheet, type ArrangeRow } from '../parts/ArrangeSheet'
import { Cells, Demo, Section } from './Bits'
import { G } from './galleryText'

const noop = () => {}
const DEFAULT: ArrangeRow[] = [
  'Pen',
  'Text',
  'Highlighter',
  'Eraser',
  'Lasso',
  'Shapes',
].map((l) => ({ id: l.toLowerCase(), label: l, preview: l[0] }))

function Sheet({
  id,
  start = DEFAULT,
  max,
  phone,
  lifted,
  withReset,
}: {
  id: string
  start?: ArrangeRow[]
  max?: number
  phone?: boolean
  lifted?: string
  withReset?: boolean
}) {
  const [rows, setRows] = useState(start)
  const [said, setSaid] = useState('')
  const [added, setAdded] = useState(0)
  return (
    <div
      data-testid={id}
      className={phone ? 'w-[390px] max-w-full' : 'w-96 max-w-full'}
    >
      <ArrangeSheet
        title={G.organiseTheRow}
        mode="inline"
        phone={phone}
        rows={rows}
        max={max}
        frozenLifted={lifted}
        onChange={setRows}
        onAdd={() => {
          setAdded(added + 1)
          setRows([
            ...rows,
            { id: `new${added}`, label: `Favourite ${added + 1}` },
          ])
        }}
        addLabel="Add favourite"
        onReset={
          withReset
            ? () => {
                setRows(DEFAULT)
                setSaid('Back to the default')
              }
            : undefined
        }
        isDefault={
          rows.map((r) => r.id).join() === DEFAULT.map((r) => r.id).join()
        }
        onDone={noop}
      />
      <span className="t-small" data-testid={`${id}-said`} aria-live="polite">
        {said}
      </span>
    </div>
  )
}

function Floating() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [rows, setRows] = useState(DEFAULT)
  return (
    <div>
      <button
        type="button"
        className="ds-btn ds-secondary"
        data-popup-trigger=""
        data-testid="arrange-open"
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        {G.openTheSheet}
      </button>
      {anchor && (
        <ArrangeSheet
          title={G.organiseTheRow}
          rows={rows}
          anchor={anchor}
          onChange={setRows}
          onDone={() => setAnchor(null)}
        />
      )}
    </div>
  )
}

export default function ArrangeSection() {
  return (
    <Section
      id="arrange"
      title={G.arrangeSheet}
      help="Big rows with a grip, ▲▼ and a menu. Removing a row shows an Undo bar."
    >
      <Cells>
        <Demo
          state="default"
          label="Default (live: remove a row to see the Undo bar)"
        >
          <Sheet id="arr-default" withReset />
        </Demo>
        <Demo state="lifted" label="Lifted row (frozen)">
          <Sheet id="arr-lifted" lifted="text" />
        </Demo>
        <Demo state="removed" label="Removed + Undo bar (remove a row here)">
          <Sheet id="arr-removed" />
        </Demo>
        <Demo state="empty" label="Empty">
          <Sheet id="arr-empty" start={[]} />
        </Demo>
        <Demo state="max" label="At the most (Add is off)">
          <Sheet id="arr-max" max={6} />
        </Demo>
        <Demo state="phone" label="Phone, full height">
          <Sheet id="arr-phone" phone />
        </Demo>
        <Demo state="floating" label="Floating (opens over the page)">
          <Floating />
        </Demo>
      </Cells>
    </Section>
  )
}
