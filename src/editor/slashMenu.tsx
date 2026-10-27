import { insertOrUpdateBlockForSlashMenu } from '@blocknote/core'
import {
  getDefaultReactSlashMenuItems,
  type DefaultReactSuggestionItem,
} from '@blocknote/react'
import { cardSlashItem, type NestedCardPlace } from './cardActions'
import { t } from '../i18n/t'
import type { AppSchema } from './schema'

type Editor = AppSchema['BlockNoteEditor']

/** Extra search words for BlockNote's default items, by item title. */
const EXTRA_ALIASES: Record<string, string[]> = {
  'Check List': ['todo', 'to-do', 'task', 'checkbox'],
}

/** App actions the "/" menu can trigger. */
export interface SlashMenuActions {
  onNewSubPage: () => void
  /** Opens the link picker (same as typing "[["). */
  onLinkPage: () => void
  onInsertTemplate: () => void
  /** "/database": asks which database, then inserts it. */
  onInsertDatabase: () => void
  /** Left out of the menu when undefined (e.g. on template pages). */
  onSaveAsTemplate?: () => void
  /** "/card" inside a card's answer: where the new card goes. */
  onPlaceNestedCard?: () =>
    NestedCardPlace | null | Promise<NestedCardPlace | null>
}

/**
 * Items for the "/" menu: BlockNote's defaults for our block types (it only
 * offers types in our schema), plus Callout, Card, template actions and
 * "New sub-page".
 */
export function buildSlashMenuItems(
  editor: Editor,
  {
    onNewSubPage,
    onLinkPage,
    onInsertTemplate,
    onInsertDatabase,
    onSaveAsTemplate,
    onPlaceNestedCard,
  }: SlashMenuActions,
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
  items.push(cardSlashItem(editor, onPlaceNestedCard))
  items.push({
    title: t('cardList.slash.title'),
    subtext: t('cardList.slash.subtext'),
    aliases: ['cards', 'list', 'flashcards', 'deck'],
    group: t('card.slash.group'),
    icon: <span aria-hidden>🗂</span>,
    onItemClick: () =>
      insertOrUpdateBlockForSlashMenu(editor, { type: 'cardList' }),
  })

  items.push({
    title: t('databaseBlock.slash.title'),
    subtext: t('databaseBlock.slash.subtext'),
    aliases: ['database', 'table', 'board', 'list', 'tracker'],
    group: 'Databases',
    icon: <span aria-hidden>◫</span>,
    onItemClick: onInsertDatabase,
  })
  items.push({
    title: 'Insert template…',
    subtext: 'Add a template’s blocks here',
    aliases: ['template', 'insert'],
    group: 'Templates',
    icon: <span aria-hidden>📋</span>,
    onItemClick: onInsertTemplate,
  })
  if (onSaveAsTemplate) {
    items.push({
      title: 'Save page as template',
      subtext: 'Reuse this page’s layout for new pages',
      aliases: ['template', 'save'],
      group: 'Templates',
      icon: <span aria-hidden>💾</span>,
      onItemClick: onSaveAsTemplate,
    })
  }
  items.push({
    title: 'New sub-page',
    subtext: 'Create a page inside this one and link to it',
    aliases: ['page', 'subpage', 'sub-page'],
    group: 'Pages',
    icon: <span aria-hidden>📄</span>,
    onItemClick: onNewSubPage,
  })
  items.push({
    title: t('links.slash.title'),
    subtext: t('links.slash.subtext'),
    aliases: ['link', 'page', 'heading', '[['],
    group: 'Pages',
    icon: <span aria-hidden>🔗</span>,
    onItemClick: onLinkPage,
  })
  return items
}
