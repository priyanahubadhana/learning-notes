import { useMemo, useState } from 'react'
import { TabRow } from '../parts/TabRow'
import { memoryTabSetStore } from '../parts/tabSets'
import type { TabDef } from '../parts/useTabSet'
import { Demo, Section } from './Bits'
import { G } from './galleryText'

const NAMES = [
  'Overview',
  'Notes',
  'Cards',
  'Tasks',
  'Calendar',
  'Files',
  'Links',
  'Ideas',
  'Reading',
  'Habits',
  'Goals',
  'Journal',
  'Archive',
  'Trash',
  'Shared',
  'Recent',
]
const CATALOG: TabDef[] = NAMES.map((n) => ({ id: n.toLowerCase(), label: n }))
const PRO_CATALOG: TabDef[] = [
  ...CATALOG.slice(0, 3),
  { id: 'advanced', label: 'Advanced', pro: 'gal.advancedTab' },
]

function Row({
  id,
  catalog,
  defaults,
  unlocked,
  variant,
}: {
  id: string
  catalog: TabDef[]
  defaults: string[]
  unlocked?: (id: string) => boolean
  variant?: 'underline' | 'pill'
}) {
  const store = useMemo(() => memoryTabSetStore(), [])
  const [value, setValue] = useState(defaults[0])
  return (
    <div data-testid={id} className="w-full max-w-xl">
      <TabRow
        setKey={id}
        store={store}
        catalog={catalog}
        defaults={defaults}
        value={value}
        onPick={setValue}
        unlocked={unlocked}
        variant={variant}
        sources={() => [
          { id: 'f1', label: 'Saved filter: due soon' },
          { id: 's1', label: 'Shelf: to read' },
        ]}
      />
      <span className="t-small text-muted" data-testid={`${id}-picked`}>
        {value}
      </span>
    </div>
  )
}

function ProRow() {
  const [pro, setPro] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={pro}
        className={`ds-btn self-start ${pro ? 'ds-primary' : 'ds-secondary'}`}
        data-testid="tabs-pro-switch"
        onClick={() => setPro(!pro)}
      >
        {G.showProUnlocked}
      </button>
      <Row
        id="tabs-pro"
        catalog={PRO_CATALOG}
        defaults={['overview', 'notes', 'cards', 'advanced']}
        unlocked={(u) => (u === 'gal.advancedTab' ? pro : true)}
      />
    </div>
  )
}

export default function TabsSection() {
  return (
    <Section
      id="tabs"
      title={G.tabRow}
      help="One line that scrolls sideways. The + adds a tab, creates your own, or edits the row."
    >
      <Demo state="three" label="3 tabs">
        <Row
          id="tabs-three"
          catalog={CATALOG}
          defaults={['overview', 'notes', 'cards']}
        />
      </Demo>
      <Demo
        state="twelve"
        label="12 tabs, overflowing with a track (press + to add a 13th)"
      >
        <Row
          id="tabs-twelve"
          catalog={CATALOG}
          defaults={NAMES.slice(0, 12).map((n) => n.toLowerCase())}
        />
      </Demo>
      <Demo state="pill" label="Pill variant">
        <Row
          id="tabs-pill"
          catalog={CATALOG}
          defaults={['overview', 'notes', 'cards']}
          variant="pill"
        />
      </Demo>
      <Demo state="pro" label="A Professional tab, hidden until it is unlocked">
        <ProRow />
      </Demo>
    </Section>
  )
}
