import { useState } from 'react'
import type { Rect } from '../../app/overlay'
import { CommandList } from '../parts/CommandList'
import type { CommandGroup } from '../parts/commandListLogic'
import { ContextStrip, type StripItem } from '../parts/ContextStrip'
import { tm } from '../parts/textMenus'
import { Cells, Demo, Section } from './Bits'

const T = {
  title: 'Context strip and Command list',
  help: 'The strip over a selection, and the searchable list behind its ⋯. Placed above, else below, else beside.',
  nothing: 'Nothing picked yet',
  picked: 'Picked: ',
  strip: 'Strip (iPad, PC)',
  phone: 'Strip on a phone: 4 items and ⋯',
  picker: 'Paste ▾ open',
  list: 'Command list (type, arrows, Enter)',
  filtered: 'Typed "col"',
  empty: 'Nothing matches',
  open: 'Open the strip at: ',
  live: 'Open for real',
  selection: 'Selected thing',
  colourItem: 'Colour',
  ink: 'Ink',
  red: 'Red',
  blue: 'Blue',
} as const

const ITEMS: StripItem[] = [
  {
    id: 'paste',
    icon: 'paste',
    label: tm('parts.menus.paste'),
    menuTitle: tm('parts.menus.pasteAs'),
    menu: [
      {
        id: 'keep',
        label: tm('parts.menus.pasteKeep'),
        hint: tm('parts.menus.pasteKeepHint'),
      },
      {
        id: 'plain',
        label: tm('parts.menus.pastePlain'),
        hint: tm('parts.menus.pastePlainHint'),
      },
      {
        id: 'match',
        label: tm('parts.menus.pasteMatch'),
        hint: tm('parts.menus.pasteMatchHint'),
      },
      {
        id: 'table',
        label: tm('parts.menus.pasteTable'),
        hint: tm('parts.menus.pasteTableHint'),
      },
    ],
  },
  {
    id: 'colour',
    icon: 'palette',
    label: T.colourItem,
    menu: [
      { id: 'ink', label: T.ink },
      { id: 'red', label: T.red },
      { id: 'blue', label: T.blue },
    ],
  },
  { id: 'copy', icon: 'copy', label: tm('parts.menus.copy') },
  { id: 'cut', icon: 'scissors', label: tm('parts.menus.cut') },
  { id: 'duplicate', icon: 'duplicate', label: tm('parts.menus.duplicate') },
  {
    id: 'delete',
    icon: 'trash',
    label: tm('parts.menus.delete'),
    danger: true,
  },
]

const GROUPS: CommandGroup[] = [
  {
    id: 'format',
    label: 'Format',
    items: [
      {
        id: 'bold',
        label: 'Bold',
        icon: 'bold',
        shortcut: 'Ctrl B',
        aliases: ['strong'],
      },
      {
        id: 'italic',
        label: 'Italic',
        icon: 'italic',
        shortcut: 'Ctrl I',
        aliases: ['slant'],
      },
      {
        id: 'colour',
        label: 'Colour',
        icon: 'palette',
        aliases: ['color', 'paint'],
      },
      {
        id: 'turn',
        label: 'Turn into',
        icon: 'type',
        aliases: ['convert', 'heading'],
      },
      {
        id: 'highlight',
        label: 'Highlight',
        icon: 'highlighter',
        aliases: ['marker'],
      },
    ],
  },
  {
    id: 'insert',
    label: 'Insert',
    items: [
      { id: 'table', label: 'Table', icon: 'table', aliases: ['grid'] },
      {
        id: 'picture',
        label: 'Picture',
        icon: 'image',
        aliases: ['image', 'photo'],
      },
      { id: 'link', label: 'Link', icon: 'link', aliases: ['url'] },
      {
        id: 'divider',
        label: 'Divider',
        icon: 'minus',
        aliases: ['line', 'rule'],
      },
      { id: 'code', label: 'Code block', icon: 'code', aliases: ['snippet'] },
    ],
  },
  {
    id: 'page',
    label: 'This note',
    items: [
      {
        id: 'fav',
        label: 'Add to favourites',
        icon: 'star',
        aliases: ['star', 'bookmark'],
      },
      { id: 'comment', label: 'Comment', icon: 'quote', aliases: ['note'] },
    ],
  },
]

const POSITIONS = [
  'top-left',
  'top',
  'top-right',
  'left',
  'middle',
  'right',
  'bottom-left',
  'bottom',
  'bottom-right',
  'tall',
] as const
type Pos = (typeof POSITIONS)[number]

/** The pretend selection for each spot: tucked against the screen edge. */
function selectionAt(pos: Pos, vw: number, vh: number): Rect {
  const w = 140
  const h = 40
  const e = 2
  const cx = (vw - w) / 2
  const cy = (vh - h) / 2
  switch (pos) {
    case 'top-left':
      return { left: e, top: e, width: w, height: h }
    case 'top':
      return { left: cx, top: e, width: w, height: h }
    case 'top-right':
      return { left: vw - w - e, top: e, width: w, height: h }
    case 'left':
      return { left: e, top: cy, width: w, height: h }
    case 'right':
      return { left: vw - w - e, top: cy, width: w, height: h }
    case 'bottom-left':
      return { left: e, top: vh - h - e, width: w, height: h }
    case 'bottom':
      return { left: cx, top: vh - h - e, width: w, height: h }
    case 'bottom-right':
      return { left: vw - w - e, top: vh - h - e, width: w, height: h }
    case 'tall':
      return {
        left: 24,
        top: e,
        width: Math.min(300, vw / 3),
        height: vh - 2 * e,
      }
    default:
      return { left: cx, top: cy, width: w, height: h }
  }
}

export default function MenusSection() {
  const [did, setDid] = useState<string>(T.nothing)
  const [at, setAt] = useState<Pos | null>(null)
  const act = (id: string, sub?: string) =>
    setDid(T.picked + (sub ? `${id} / ${sub}` : id))
  const rect = at
    ? selectionAt(at, window.innerWidth, window.innerHeight)
    : null

  return (
    <Section id="menus" title={T.title} help={T.help}>
      <p className="t-small" data-testid="menus-did" aria-live="polite">
        {did}
      </p>
      <Cells>
        <Demo state="strip" label={T.strip}>
          <ContextStrip
            mode="inline"
            testId="strip-demo"
            items={ITEMS}
            commands={GROUPS}
            onAction={act}
            onClose={() => {}}
          />
        </Demo>
        <Demo state="strip-phone" label={T.phone}>
          <ContextStrip
            mode="inline"
            phone
            testId="strip-phone-demo"
            items={ITEMS}
            commands={GROUPS}
            onAction={act}
            onClose={() => {}}
          />
        </Demo>
        <Demo state="strip-picker" label={T.picker}>
          <ContextStrip
            mode="inline"
            testId="strip-picker-demo"
            items={ITEMS}
            initialPicker="paste"
            onAction={act}
            onClose={() => {}}
          />
        </Demo>
      </Cells>
      <Cells>
        <Demo state="list" label={T.list}>
          <CommandList
            mode="inline"
            testId="list-demo"
            groups={GROUPS}
            onPick={(id) => setDid(T.picked + id)}
            onClose={() => {}}
          />
        </Demo>
        <Demo state="list-filtered" label={T.filtered}>
          <CommandList
            mode="inline"
            testId="list-filtered-demo"
            groups={GROUPS}
            initialQuery="col"
            onPick={(id) => setDid(T.picked + id)}
            onClose={() => {}}
          />
        </Demo>
        <Demo state="list-empty" label={T.empty}>
          <CommandList
            mode="inline"
            testId="list-empty-demo"
            groups={GROUPS}
            initialQuery="zzz"
            onPick={(id) => setDid(T.picked + id)}
            onClose={() => {}}
          />
        </Demo>
      </Cells>
      <Demo state="live" label={T.live}>
        <p className="t-small text-muted mb-2">{T.open}</p>
        <div className="flex flex-wrap gap-2">
          {POSITIONS.map((p) => (
            <button
              key={p}
              type="button"
              className="ds-btn ds-ghost"
              data-testid={`menus-at-${p}`}
              onClick={() => setAt(p)}
            >
              {p}
            </button>
          ))}
        </div>
        {at && rect && (
          <>
            <div
              aria-hidden="true"
              data-testid="menus-selection"
              style={{
                position: 'fixed',
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
                border: '2px dashed var(--color-accent)',
                borderRadius: 8,
                boxSizing: 'border-box',
                pointerEvents: 'none',
              }}
            />
            <ContextStrip
              key={at}
              items={ITEMS}
              commands={GROUPS}
              target={() =>
                selectionAt(at, window.innerWidth, window.innerHeight)
              }
              onAction={act}
              onClose={() => setAt(null)}
            />
          </>
        )}
      </Demo>
    </Section>
  )
}
