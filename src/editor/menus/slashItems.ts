import type { IconName } from '../../app/tools/icons'
import type { Command, CommandGroup } from '../../design/parts/commandListLogic'
import { t, type MessageKey } from '../../i18n/t'

/** What the "/" menu gets from today's builder (`buildSlashMenuItems`). */
export interface SlashSource {
  /** BlockNote's own key ("bullet_list"); ours have none. */
  key?: string
  title: string
  aliases?: string[]
  onItemClick: () => void
}

export type SlashGroupId =
  'basic' | 'lists' | 'study' | 'media' | 'data' | 'page'

interface Def {
  id: string
  group: SlashGroupId
  icon: IconName
  label: MessageKey
}

const def = (
  id: string,
  group: SlashGroupId,
  icon: IconName,
  label: MessageKey,
): Def => ({ id, group, icon, label })

/** The full catalogue, in menu order. Six groups (PM-02). */
export const DEFS: readonly Def[] = [
  def('text', 'basic', 'paragraph', 'slashMenu.item.text'),
  def('heading', 'basic', 'heading1', 'slashMenu.item.heading'),
  def('heading2', 'basic', 'heading2', 'slashMenu.item.heading2'),
  def('heading3', 'basic', 'heading3', 'slashMenu.item.heading3'),
  def('code', 'basic', 'code', 'slashMenu.item.code'),
  def('divider', 'basic', 'minus', 'slashMenu.item.divider'),
  def('bullet', 'lists', 'list', 'slashMenu.item.bullet'),
  def('numbered', 'lists', 'numbered', 'slashMenu.item.numbered'),
  def('checklist', 'lists', 'checklist', 'slashMenu.item.checklist'),
  def('toggle', 'lists', 'chevronRight', 'slashMenu.item.toggle'),
  def('cardList', 'lists', 'inbox', 'slashMenu.item.cardList'),
  def('card', 'study', 'cards', 'slashMenu.item.card'),
  def('callout', 'study', 'lightbulb', 'slashMenu.item.callout'),
  def('quote', 'study', 'quote', 'slashMenu.item.quote'),
  def('mindMap', 'study', 'layers', 'slashMenu.item.mindMap'),
  def('math', 'study', 'type', 'slashMenu.item.math'),
  def('dayRecord', 'study', 'check', 'slashMenu.item.dayRecord'),
  def('picture', 'media', 'image', 'slashMenu.item.picture'),
  def('embed', 'media', 'play', 'slashMenu.item.embed'),
  def('video', 'media', 'play', 'slashMenu.item.video'),
  def('audio', 'media', 'music', 'slashMenu.item.audio'),
  def('file', 'media', 'paperclip', 'slashMenu.item.file'),
  def('camera', 'media', 'camera', 'slashMenu.item.camera'),
  def('table', 'data', 'table', 'slashMenu.item.table'),
  def('database', 'data', 'database', 'slashMenu.item.database'),
  def('template', 'page', 'clipboard', 'slashMenu.item.template'),
  def('saveTemplate', 'page', 'save', 'slashMenu.item.saveTemplate'),
  def('subpage', 'page', 'fileText', 'slashMenu.item.subpage'),
  def('link', 'page', 'link', 'slashMenu.item.link'),
]

const GROUP_LABEL: Record<SlashGroupId, MessageKey> = {
  basic: 'slashMenu.group.basic',
  lists: 'slashMenu.group.lists',
  study: 'slashMenu.group.study',
  media: 'slashMenu.group.media',
  data: 'slashMenu.group.data',
  page: 'slashMenu.group.page',
}

/** Beginner: 12 items in 3 groups (PM-01). */
export const BEGINNER: readonly {
  id: 'basic' | 'study' | 'insert'
  label: MessageKey
  items: readonly string[]
}[] = [
  {
    id: 'basic',
    label: 'slashMenu.group.basic',
    items: ['text', 'heading', 'bullet', 'numbered', 'checklist'],
  },
  {
    id: 'study',
    label: 'slashMenu.group.study',
    items: ['card', 'callout', 'quote'],
  },
  {
    id: 'insert',
    label: 'slashMenu.group.insert',
    items: ['picture', 'table', 'divider', 'link'],
  },
]

export const BEGINNER_COUNT = BEGINNER.reduce((n, g) => n + g.items.length, 0)

/** Inside a table cell only these fit (PM-05): a link is the one inline item. */
export const CELL_ITEMS: readonly string[] = ['link']

/** BlockNote's keys for its own blocks. */
const BY_KEY: Record<string, string> = {
  paragraph: 'text',
  heading: 'heading',
  heading_2: 'heading2',
  heading_3: 'heading3',
  bullet_list: 'bullet',
  numbered_list: 'numbered',
  check_list: 'checklist',
  toggle_list: 'toggle',
  quote: 'quote',
  code_block: 'code',
  image: 'picture',
  video: 'video',
  audio: 'audio',
  table: 'table',
  divider: 'divider',
}

/** BlockNote blocks outside the catalogue still get their own icon (G3). */
const EXTRA_ICON: Record<string, IconName> = {
  heading_4: 'heading4',
  heading_5: 'heading5',
  heading_6: 'heading6',
  toggle_heading: 'toggleHeading',
  toggle_heading_2: 'toggleHeading',
  toggle_heading_3: 'toggleHeading',
}

/** Our own items have no key: they are found by their (translated) title. */
const OWN_TITLES: readonly (readonly [MessageKey, string])[] = [
  ['card.slash.title', 'card'],
  ['cardList.slash.title', 'cardList'],
  ['slash.callout.title', 'callout'],
  ['mm.slash.title', 'mindMap'],
  ['math.slash.title', 'math'],
  ['dayRecord.slash.title', 'dayRecord'],
  ['embed.slash.title', 'embed'],
  ['file.slash.title', 'file'],
  ['camera.slash.title', 'camera'],
  ['databaseBlock.slash.title', 'database'],
  ['slash.insertTemplate.title', 'template'],
  ['slash.saveTemplate.title', 'saveTemplate'],
  ['slash.subpage.title', 'subpage'],
  ['links.slash.title', 'link'],
]

export interface SlashEntry {
  id: string
  group: SlashGroupId
  command: Command
  run(): void
}

/**
 * Today's items as catalogue entries, in catalogue order. An item BlockNote
 * offers that the catalogue does not know stays in "Basic" (nothing is lost).
 */
export function buildSlashEntries(
  source: readonly SlashSource[],
): SlashEntry[] {
  const byTitle = new Map(OWN_TITLES.map(([k, id]) => [t(k), id]))
  const defOf = new Map(DEFS.map((d) => [d.id, d]))
  const found = new Map<string, SlashEntry>()
  const extras: SlashEntry[] = []
  for (const s of source) {
    const id = (s.key && BY_KEY[s.key]) || byTitle.get(s.title)
    const d = id ? defOf.get(id) : undefined
    if (d) {
      if (found.has(d.id)) continue
      found.set(d.id, {
        id: d.id,
        group: d.group,
        run: s.onItemClick,
        command: {
          id: d.id,
          label: t(d.label),
          aliases: s.aliases,
          icon: d.icon,
        },
      })
    } else {
      const extraId = `x-${s.key ?? s.title}`
      extras.push({
        id: extraId,
        group: 'basic',
        run: s.onItemClick,
        command: {
          id: extraId,
          label: s.title,
          aliases: s.aliases,
          icon: (s.key && EXTRA_ICON[s.key]) || 'plus',
        },
      })
    }
  }
  const ordered = DEFS.flatMap((d) => found.get(d.id) ?? [])
  // Extras go at the end of their group, Basic.
  const lastBasic = ordered.reduce(
    (at, e, i) => (e.group === 'basic' ? i : at),
    -1,
  )
  ordered.splice(lastBasic + 1, 0, ...extras)
  return ordered
}

/** The six groups, empty ones left out (PM-02, Professional and "Show all"). */
export function fullGroups(entries: readonly SlashEntry[]): CommandGroup[] {
  return (Object.keys(GROUP_LABEL) as SlashGroupId[])
    .map((g) => ({
      id: g,
      label: t(GROUP_LABEL[g]),
      items: entries.filter((e) => e.group === g).map((e) => e.command),
    }))
    .filter((g) => g.items.length > 0)
}

/**
 * Beginner's first view: the 12 items in 3 groups, then every other item in a
 * last "More" group that the list cuts off behind "Show all" (PM-01, PM-09).
 */
export function beginnerGroups(entries: readonly SlashEntry[]): CommandGroup[] {
  const byId = new Map(entries.map((e) => [e.id, e.command]))
  const used = new Set<string>()
  const out: CommandGroup[] = []
  for (const g of BEGINNER) {
    const items = g.items.flatMap((id) => byId.get(id) ?? [])
    items.forEach((c) => used.add(c.id))
    if (items.length) out.push({ id: g.id, label: t(g.label), items })
  }
  const rest = entries.filter((e) => !used.has(e.id)).map((e) => e.command)
  if (rest.length)
    out.push({ id: 'more', label: t('slashMenu.group.more'), items: rest })
  return out
}

/** Table cell: only the items that fit (PM-05). */
export function cellGroups(entries: readonly SlashEntry[]): CommandGroup[] {
  const items = CELL_ITEMS.flatMap(
    (id) => entries.find((e) => e.id === id)?.command ?? [],
  )
  return items.length ? [{ id: 'page', label: t(GROUP_LABEL.page), items }] : []
}
