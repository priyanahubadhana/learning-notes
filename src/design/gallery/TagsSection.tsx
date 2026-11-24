import { useState } from 'react'
import { CardTrigger } from '../parts/Card'
import { TagPickerLazy } from '../parts/TagPicker/TagPickerLazy'
import type { TagItem } from '../parts/TagPicker/tagSearch'
import { Cells, Demo, Section } from './Bits'
import { G } from './galleryText'

const TAGS: TagItem[] = [
  { id: 'life', name: 'Life', parentId: null, count: 12 },
  { id: 'habits', name: 'Habits', parentId: 'life', count: 8 },
  { id: 'habit', name: 'habit', parentId: 'life', count: 5 },
  { id: 'health', name: 'Health', parentId: null, count: 9 },
  { id: 'sleep', name: 'Sleep', parentId: 'health', count: 3 },
  { id: 'reading', name: 'Reading', parentId: null, count: 7 },
  { id: 'ideas', name: 'Ideas', parentId: null, count: 4 },
]
const noop = () => {}

/** Filter mode with its own ticked list, match and include-sub state. */
function Filter({
  query,
  phone,
  scope,
  start = [],
}: {
  query?: string
  phone?: boolean
  scope?: string[]
  start?: string[]
}) {
  const [value, setValue] = useState<string[]>(start)
  const [match, setMatch] = useState<'any' | 'all'>('any')
  const [sub, setSub] = useState(false)
  return (
    <TagPickerLazy
      mode="filter"
      tags={TAGS}
      pinned={['habits', 'reading']}
      recent={['sleep', 'ideas']}
      scope={scope ? new Set(scope) : undefined}
      value={value}
      onChange={setValue}
      match={match}
      onMatch={setMatch}
      includeSub={sub}
      onIncludeSub={setSub}
      onCreate={noop}
      onClose={noop}
      placement="static"
      phone={phone}
      initialQuery={query}
    />
  )
}

/** Assign mode over three items; a tap saves at once and Undo reverts the tap. */
function Assign() {
  const [items, setItems] = useState<string[][]>([
    ['habits'],
    ['habits', 'reading'],
    ['sleep'],
  ])
  const [past, setPast] = useState<string[][][]>([])
  return (
    <div className="flex flex-col gap-2">
      <TagPickerLazy
        mode="assign"
        tags={TAGS}
        itemTags={items}
        pinned={['habits', 'reading', 'sleep']}
        onToggle={(id, on) => {
          setPast((p) => [...p, items])
          setItems(
            items.map((t) =>
              on
                ? t.includes(id)
                  ? t
                  : [...t, id]
                : t.filter((x) => x !== id),
            ),
          )
        }}
        onClose={noop}
        placement="static"
      />
      <div className="flex items-center gap-3" data-testid="assign-bar">
        <span className="t-small" data-testid="assign-steps">
          {past.length} {G.changeS}
        </span>
        <button
          type="button"
          className="ds-btn ds-secondary"
          data-testid="assign-undo"
          disabled={!past.length}
          onClick={() => {
            const last = past[past.length - 1]
            if (!last) return
            setItems(last)
            setPast(past.slice(0, -1))
          }}
        >
          {G.undo}
        </button>
      </div>
    </div>
  )
}

/** Create mode: a new name, a near duplicate, and the library empty. */
function Create({ empty }: { empty?: boolean }) {
  const [made, setMade] = useState('')
  return (
    <div className="flex flex-col gap-2">
      <TagPickerLazy
        mode="assign"
        tags={empty ? [] : TAGS}
        itemTags={[[]]}
        initialQuery={empty ? undefined : 'habbit'}
        onCreate={(name) => setMade(name)}
        onToggle={noop}
        onClose={noop}
        placement="static"
      />
      <span className="t-small" data-testid="created-name">
        {made ? `Created #${made}` : ''}
      </span>
    </div>
  )
}

/** A real anchored picker, and `#` on a list opens it too (SP-14, SP-19). */
function Live() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [value, setValue] = useState<string[]>([])
  const list = (
    <div
      tabIndex={0}
      role="group"
      aria-label={G.aListPressToTag}
      data-testid="tag-hash-list"
      className="bg-surface-1 t-small w-64 rounded-[var(--r-md)] p-3"
      onKeyDown={(e) => {
        if (e.key === '#') {
          e.preventDefault()
          setAnchor(e.currentTarget)
        }
      }}
    >
      {G.aListFocusItAndPress}
    </div>
  )
  return (
    <div className="flex flex-col gap-3">
      <CardTrigger
        open={!!anchor}
        label="Filter by tag"
        testId="tags-live-trigger"
        onClick={(el) => setAnchor(anchor ? null : el)}
      >
        {G.tags}
      </CardTrigger>
      {list}
      {anchor && (
        <TagPickerLazy
          mode="filter"
          tags={TAGS}
          pinned={['habits']}
          recent={['sleep']}
          value={value}
          onChange={setValue}
          anchor={anchor}
          onCreate={noop}
          onClose={() => setAnchor(null)}
        />
      )}
    </div>
  )
}

export default function TagsSection() {
  return (
    <Section
      id="tags"
      title={G.tagPicker}
      help="Search first, pinned, recent, browse, tri-state, create with a duplicate warning."
    >
      <Demo
        state="live"
        label="Live: open from the button, or press # on the list"
      >
        <Live />
      </Demo>
      <Cells>
        <Demo state="filter-before" label="Filter, before typing">
          <Filter />
        </Demo>
        <Demo state="filter-results" label="Filter, results for “hab”">
          <Filter query="hab" />
        </Demo>
        <Demo state="filter-dimmed" label="Filter, two ticked, others dimmed">
          <Filter
            query="h"
            start={['habits', 'health']}
            scope={['habits', 'health']}
          />
        </Demo>
        <Demo state="assign" label="Assign to 3 items (tri-state)">
          <Assign />
        </Demo>
        <Demo state="create-duplicate" label="Create, with a duplicate warning">
          <Create />
        </Demo>
        <Demo state="empty-library" label="Empty library">
          <Create empty />
        </Demo>
        <Demo state="phone-sheet" label="Phone sheet">
          <Filter phone />
        </Demo>
      </Cells>
    </Section>
  )
}
