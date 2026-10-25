import { SideMenuExtension } from '@blocknote/core/extensions'
import {
  BlockColorsItem,
  DragHandleMenu,
  RemoveBlockItem,
  useBlockNoteEditor,
  useComponentsContext,
  useDictionary,
  useExtensionState,
} from '@blocknote/react'
import { t } from '../i18n/t'
import { duplicateBlock } from './blockActions'
import { canMakeCard, makeCard } from './cardActions'
import type { EditorBlock } from './mapping'
import type { AppSchema } from './schema'

type Editor = AppSchema['BlockNoteEditor']

/** Block menu (⋮⋮ handle) entry: "Make card". */
function MakeCardItem() {
  const Components = useComponentsContext()!
  const editor = useBlockNoteEditor() as unknown as Editor
  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) => state?.block,
  }) as EditorBlock | undefined
  if (!block || !canMakeCard(block)) return null
  return (
    <Components.Generic.Menu.Item
      className="bn-menu-item"
      onClick={() => makeCard(editor, block)}
    >
      {t('card.make')}
    </Components.Generic.Menu.Item>
  )
}

/** Block menu entry: "Duplicate" (the block and everything nested in it). */
function DuplicateItem() {
  const Components = useComponentsContext()!
  const editor = useBlockNoteEditor() as unknown as Editor
  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) => state?.block,
  }) as EditorBlock | undefined
  if (!block) return null
  return (
    <Components.Generic.Menu.Item
      className="bn-menu-item"
      onClick={() => duplicateBlock(editor, block)}
    >
      {t('block.duplicate')}
    </Components.Generic.Menu.Item>
  )
}

/** The block menu: BlockNote's items plus "Make card" and "Duplicate". */
export function AppDragHandleMenu() {
  const dict = useDictionary()
  return (
    <DragHandleMenu>
      <MakeCardItem />
      <DuplicateItem />
      <RemoveBlockItem>{dict.drag_handle.delete_menuitem}</RemoveBlockItem>
      <BlockColorsItem>{dict.drag_handle.colors_menuitem}</BlockColorsItem>
    </DragHandleMenu>
  )
}
