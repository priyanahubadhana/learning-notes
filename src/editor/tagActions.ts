import type { SuggestionMenuOptions } from '@blocknote/core/extensions'
import type { DefaultReactSuggestionItem } from '@blocknote/react'
import { runTask } from '../app/errors'
import { t } from '../i18n/t'
import { findTagChoices, findOrCreateTagPath } from '../tags/tagService'
import type { LearningNotesDB } from '../core/db'
import { TAG, type TagRefProps } from './mapping'
import type { AppSchema } from './schema'

/**
 * Typing "#" opens the tag menu (BlockNote's suggestion menu, the typed
 * name stays in the text as its search). Picking a tag replaces "#name"
 * with a tag chip. "C#" (no space before) never opens it; "#1" opens it but
 * offers no "Create", and a space or Esc closes it, so both stay text.
 */

type Editor = AppSchema['BlockNoteEditor']
/** The editor transaction BlockNote passes to `shouldOpen`. */
type Transaction = Parameters<
  NonNullable<SuggestionMenuOptions['shouldOpen']>
>[0]

export const TAG_TRIGGER = '#'

/** Most tags listed in the menu. */
const MENU_SIZE = 8

/**
 * Whether "#" typed now should open the tag menu: at the start of a line
 * or after a space, outside code blocks.
 */
export function tagMenuShouldOpen(tr: Transaction): boolean {
  const { $from, empty } = tr.selection
  if (!empty || !$from.parent.isTextblock) return false
  if ($from.parent.type.spec.code) return false // a code block
  const offset = $from.parentOffset
  if (offset === 0) return true
  const before = $from.parent.textBetween(offset - 1, offset, undefined, '￼')
  return /\s/u.test(before)
}

/** Inserts a tag chip (and a space after it) at the cursor. */
export function insertTag(editor: Editor, tag: TagRefProps): void {
  editor.insertInlineContent([{ type: TAG, props: { ...tag } }, ' '])
}

/**
 * The tag menu's items for the text typed after "#": matching tags, then
 * "Create #…" when no tag has that name. A space in the text closes the
 * menu (`close`), as tags have no spaces.
 */
export async function tagMenuItems(
  db: LearningNotesDB,
  editor: Editor,
  query: string,
  close: () => void,
): Promise<DefaultReactSuggestionItem[]> {
  if (/\s/u.test(query)) {
    close()
    return []
  }
  const { options, create } = await findTagChoices(db, query, {
    limit: MENU_SIZE,
    allowNumbers: false,
  })
  const group = t('tags.menu')
  const items: DefaultReactSuggestionItem[] = options.map((o) => ({
    title: `#${o.path}`,
    group,
    onItemClick: () => insertTag(editor, { tagId: o.tagId, label: o.path }),
  }))
  if (create) {
    items.push({
      title: t('tags.create', { name: create }),
      group,
      onItemClick: () =>
        runTask(
          findOrCreateTagPath(db, create).then((tag) =>
            insertTag(editor, { tagId: tag.id, label: create }),
          ),
        ),
    })
  }
  return items
}
