import { afterEach, describe, expect, it } from 'vitest'
import {
  buildList,
  filterGroups,
  pushRecent,
} from '../../design/parts/commandListLogic'
import { t } from '../../i18n/t'
import {
  BEGINNER_COUNT,
  beginnerGroups,
  buildSlashEntries,
  cellGroups,
  fullGroups,
  type SlashSource,
} from './slashItems'
import {
  readSlashRecent,
  SLASH_RECENT_KEY,
  writeSlashRecent,
} from './slashRecent'

const noop = () => {}
const bn = (
  key: string,
  title: string,
  aliases: string[] = [],
): SlashSource => ({
  key,
  title,
  aliases,
  onItemClick: noop,
})
const own = (
  titleKey: Parameters<typeof t>[0],
  aliases: string[] = [],
): SlashSource => ({
  title: t(titleKey),
  aliases,
  onItemClick: noop,
})

/** What today's builder offers (BlockNote defaults plus ours). */
const source: SlashSource[] = [
  bn('heading', 'Heading 1', ['h', 'heading1', 'h1']),
  bn('heading_2', 'Heading 2'),
  bn('heading_3', 'Heading 3'),
  bn('quote', 'Quote', ['blockquote', 'bq']),
  bn('toggle_list', 'Toggle List'),
  bn('numbered_list', 'Numbered List', ['ol']),
  bn('bullet_list', 'Bullet List', ['ul']),
  bn('check_list', 'Check List', ['todo', 'task']),
  bn('paragraph', 'Paragraph', ['p']),
  bn('code_block', 'Code Block'),
  bn('table', 'Table'),
  bn('image', 'Image'),
  bn('divider', 'Divider'),
  bn('emoji', 'Emoji'),
  own('slash.callout.title', ['callout']),
  own('card.slash.title', ['card']),
  own('cardList.slash.title'),
  own('mm.slash.title'),
  own('math.slash.title'),
  own('dayRecord.slash.title'),
  own('embed.slash.title'),
  own('file.slash.title'),
  own('camera.slash.title'),
  own('databaseBlock.slash.title'),
  own('slash.insertTemplate.title'),
  own('slash.saveTemplate.title'),
  own('slash.subpage.title'),
  own('links.slash.title', ['link']),
]

const entries = buildSlashEntries(source)
const ids = (gs: { items: { id: string }[] }[]) =>
  gs.map((g) => g.items.map((i) => i.id))

describe('slash menu items', () => {
  it('Beginner shows 12 items in 3 groups, then the rest behind Show all (PM-01, PM-09)', () => {
    const groups = beginnerGroups(entries)
    expect(groups.slice(0, 3).map((g) => g.id)).toEqual([
      'basic',
      'study',
      'insert',
    ])
    expect(ids(groups.slice(0, 3))).toEqual([
      ['text', 'heading', 'bullet', 'numbered', 'checklist'],
      ['card', 'callout', 'quote'],
      ['picture', 'table', 'divider', 'link'],
    ])
    const list = buildList({
      groups,
      query: '',
      recent: [],
      showAll: false,
      limit: BEGINNER_COUNT,
    })
    expect(list.rows.filter((r) => r.kind === 'item')).toHaveLength(12)
    expect(list.rows.at(-1)?.kind).toBe('showAll')
  })

  it('Professional and Show all use 6 groups with every item (PM-02)', () => {
    const groups = fullGroups(entries)
    expect(groups.map((g) => g.id)).toEqual([
      'basic',
      'lists',
      'study',
      'media',
      'data',
      'page',
    ])
    const all = groups.flatMap((g) => g.items.map((i) => i.id))
    for (const id of [
      'cardList',
      'mindMap',
      'math',
      'dayRecord',
      'embed',
      'file',
      'camera',
      'database',
      'template',
      'saveTemplate',
      'subpage',
      'link',
    ])
      expect(all).toContain(id)
    // An item the catalogue does not know stays available.
    expect(all).toContain('x-emoji')
    expect(new Set(all).size).toBe(all.length)
  })

  it('filters by name and alias as you type; the first match leads (PM-03)', () => {
    const groups = fullGroups(entries)
    expect(ids(filterGroups(groups, 'todo')).flat()).toEqual(['checklist'])
    expect(ids(filterGroups(groups, 'head')).flat()[0]).toBe('heading')
    expect(ids(filterGroups(groups, 'zzzz'))).toEqual([])
  })

  it('puts the last 3 used on top as Recent (PM-04)', () => {
    let recent: string[] = []
    for (const id of ['table', 'quote', 'card', 'quote', 'link'])
      recent = pushRecent(recent, id)
    expect(recent).toEqual(['link', 'quote', 'card'])
    const list = buildList({
      groups: fullGroups(entries),
      query: '',
      recent,
      showAll: true,
    })
    const top = list.rows
      .filter((r) => r.kind === 'item' && r.recent)
      .map((r) => r.kind === 'item' && r.item.id)
    expect(top).toEqual(['link', 'quote', 'card'])
  })

  it('in a table cell only the items that fit show (PM-05)', () => {
    expect(ids(cellGroups(entries))).toEqual([['link']])
  })
})

describe('slash recent storage', () => {
  const store = new Map<string, string>()
  const fake = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  }
  afterEach(() => {
    store.clear()
    delete (globalThis as { localStorage?: unknown }).localStorage
  })

  it('keeps 3 and survives broken storage', () => {
    ;(globalThis as { localStorage?: unknown }).localStorage = fake
    writeSlashRecent(['a', 'b', 'c', 'd'])
    expect(readSlashRecent()).toEqual(['a', 'b', 'c'])
    store.set(SLASH_RECENT_KEY, '{not json')
    expect(readSlashRecent()).toEqual([])
    ;(globalThis as { localStorage?: unknown }).localStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(readSlashRecent()).toEqual([])
    expect(() => writeSlashRecent(['a'])).not.toThrow()
  })
})
