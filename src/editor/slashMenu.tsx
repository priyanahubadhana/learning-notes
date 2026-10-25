import { insertOrUpdateBlockForSlashMenu } from '@blocknote/core'
import {
  getDefaultReactSlashMenuItems,
  type DefaultReactSuggestionItem,
} from '@blocknote/react'
import type { AppSchema } from './schema'

type Editor = AppSchema['BlockNoteEditor']

/** Extra search words for BlockNote's default items, by item title. */
const EXTRA_ALIASES: Record<string, string[]> = {
  'Check List': ['todo', 'to-do', 'task', 'checkbox'],
}

/**
 * Items for the "/" menu: BlockNote's defaults for our block types (it only
 * offers types in our schema), plus Callout and "New sub-page".
 */
export function buildSlashMenuItems(
  editor: Editor,
  onNewSubPage: () => void,
): DefaultReactSuggestionItem[] {
  const items = getDefaultReactSlashMenuItems(editor).map((item) => {
    const extra = EXTRA_ALIASES[item.title]
    return extra
      ? { ...item, aliases: [...(item.aliases ?? []), ...extra] }
      : item
  })

  // Callout goes right after Quote, in the same group.
  const quoteIndex = items.findIndex((item) => item.title === 'Quote')
  const callout: DefaultReactSuggestionItem = {
    title: 'Callout',
    subtext: 'Highlighted note with an emoji',
    aliases: ['callout', 'note', 'tip', 'info', 'highlight'],
    group: items[quoteIndex]?.group ?? 'Basic blocks',
    icon: <span aria-hidden>💡</span>,
    onItemClick: () =>
      insertOrUpdateBlockForSlashMenu(editor, { type: 'callout' }),
  }
  items.splice(quoteIndex === -1 ? items.length : quoteIndex + 1, 0, callout)

  items.push({
    title: 'New sub-page',
    subtext: 'Create a page inside this one and link to it',
    aliases: ['page', 'subpage', 'sub-page', 'link'],
    group: 'Pages',
    icon: <span aria-hidden>📄</span>,
    onItemClick: onNewSubPage,
  })
  return items
}
