import {
  SuggestionMenu,
  type SuggestionMenuOptions,
} from '@blocknote/core/extensions'
import type { DefaultReactSuggestionItem } from '@blocknote/react'
import { runTask } from '../app/errors'
import { t } from '../i18n/t'
import {
  findOrCreateTagPath,
  findTagChoices,
  tagChoicesIn,
} from '../tags/tagService'
import type { LearningNotesDB } from '../core/db'
import type { Tag } from '../core/types'
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
 * What is typed after "#" right now. The menu's list can lag behind typing
 * by a moment; the editor's own state never does.
 */
const typedNow = (editor: Editor, fallback: string): string =>
  editor.getExtension(SuggestionMenu)?.store.state?.query ?? fallback

/**
 * Makes a tag from text typed after "#" (the menu has removed that text
 * already): an existing tag of that name, a new one, or, for something that
 * cannot be a tag, the text is put back, so nothing typed is ever lost.
 */
export async function tagFromTyped(
  db: LearningNotesDB,
  editor: Editor,
  typed: string,
): Promise<void> {
  const { options, create } = /\s/u.test(typed)
    ? { options: [], create: null }
    : await findTagChoices(db, typed, {
        limit: MENU_SIZE,
        allowNumbers: false,
      })
  if (create) {
    const tag = await findOrCreateTagPath(db, create)
    insertTag(editor, { tagId: tag.id, label: create })
    return
  }
  const same = options.find((o) => o.path.toLowerCase() === typed.toLowerCase())
  if (same) insertTag(editor, { tagId: same.tagId, label: same.path })
  else editor.insertInlineContent(`#${typed}`)
}

/**
 * The tag menu's items for the text typed after "#": matching tags, then
 * "Create #…" when no tag has that name. A space in the text closes the
 * menu (`close`), as tags have no spaces. `known`: the tags, if in memory,
 * so the list keeps up with fast typing. An item picked while its list is
 * behind the typing follows the typing, not the old list.
 */
export async function tagMenuItems(
  db: LearningNotesDB,
  editor: Editor,
  query: string,
  close: () => void,
  known?: ReadonlyMap<string, Tag>,
): Promise<DefaultReactSuggestionItem[]> {
  if (/\s/u.test(query)) {
    close()
    return []
  }
  const choiceOptions = { limit: MENU_SIZE, allowNumbers: false }
  const { options, create } = known
    ? tagChoicesIn(known, query, choiceOptions)
    : await findTagChoices(db, query, choiceOptions)
  const pick = (exact: () => void) => () => {
    const typed = typedNow(editor, query)
    if (typed === query) exact()
    else runTask(tagFromTyped(db, editor, typed))
  }
  const group = t('tags.menu')
  const items: DefaultReactSuggestionItem[] = options.map((o) => ({
    title: `#${o.path}`,
    group,
    onItemClick: pick(() =>
      insertTag(editor, { tagId: o.tagId, label: o.path }),
    ),
  }))
  if (create) {
    items.push({
      title: t('tags.create', { name: create }),
      group,
      onItemClick: pick(() =>
        runTask(
          findOrCreateTagPath(db, create).then((tag) =>
            insertTag(editor, { tagId: tag.id, label: create }),
          ),
        ),
      ),
    })
  }
  return items
}
