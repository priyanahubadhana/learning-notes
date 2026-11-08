import { SideMenuExtension } from '@blocknote/core/extensions'
import {
  BlockColorsItem,
  DragHandleMenu,
  RemoveBlockItem,
  useBlockNoteEditor,
  useComponentsContext,
  useDictionary,
  usePortalElement,
  useExtensionState,
} from '@blocknote/react'
import { useContext } from 'react'
import { AppUiContext } from '../app/appUi'
import { t } from '../i18n/t'
import { openPictureEditor } from '../images/pictureEditorStore'
import { penSettings } from '../app/tools/main/inkSettings'
import { selectTool } from '../app/tools/main/selectTool'
import { copyAs } from './clipboard'
import { markLabels, markName } from '../revise/reviseMarks'
import { duplicateBlock } from './blockActions'
import { markWholeBlock } from './markActions'
import { canMakeCard, makeCard } from './cardActions'
import { AddToSummaryItem } from './summaryActions'
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

/** Block menu entries: Copy (every format), and "Copy as..." one format. */
function CopyItems() {
  const Components = useComponentsContext()!
  const portalElement = usePortalElement()
  const editor = useBlockNoteEditor() as unknown as Editor
  const { toast } = useContext(AppUiContext)
  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) => state?.block,
  }) as EditorBlock | undefined
  if (!block) return null
  const kinds = [
    ['markdown', 'copy.as.markdown'],
    ['rich', 'copy.as.rich'],
    ['plain', 'copy.as.plain'],
    ['html', 'copy.as.html'],
  ] as const
  return (
    <>
      <Components.Generic.Menu.Item
        className="bn-menu-item"
        onClick={() => void copyAs(editor, 'all', toast, [block])}
      >
        {t('copy.all')}
      </Components.Generic.Menu.Item>
      <Components.Generic.Menu.Root
        position="right"
        sub={true}
        portalElement={portalElement}
      >
        <Components.Generic.Menu.Trigger sub={true}>
          <Components.Generic.Menu.Item
            className="bn-menu-item"
            subTrigger={true}
          >
            {t('copy.as')}
          </Components.Generic.Menu.Item>
        </Components.Generic.Menu.Trigger>
        <Components.Generic.Menu.Dropdown
          sub={true}
          className="bn-menu-dropdown"
        >
          {kinds.map(([kind, key]) => (
            <Components.Generic.Menu.Item
              key={kind}
              className="bn-menu-item"
              onClick={() =>
                void import('./copyFormats').then((m) =>
                  m.copyBlocksAs(editor, kind, toast, [block as never]),
                )
              }
            >
              {t(key)}
            </Components.Generic.Menu.Item>
          ))}
        </Components.Generic.Menu.Dropdown>
      </Components.Generic.Menu.Root>
    </>
  )
}

/** Block menu entries: mark the whole line with a Revise label. */
function MarkLineItems() {
  const Components = useComponentsContext()!
  const editor = useBlockNoteEditor() as unknown as Editor
  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) => state?.block,
  }) as EditorBlock | undefined
  if (!block || !Array.isArray(block.content)) return null
  return (
    <>
      {markLabels().map((label) => (
        <Components.Generic.Menu.Item
          key={label.id}
          className="bn-menu-item"
          onClick={() => markWholeBlock(editor, block, label.id)}
        >
          {t('revise.markLine', { label: markName(label.id) })}
        </Components.Generic.Menu.Item>
      ))}
    </>
  )
}

/** Block menu entry for a picture: "Edit picture" (crop, turn, cut out). */
function EditPictureItem() {
  const Components = useComponentsContext()!
  const editor = useBlockNoteEditor() as unknown as Editor
  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) => state?.block,
  }) as EditorBlock | undefined
  if (!block || block.type !== 'image') return null
  return (
    <>
      <Components.Generic.Menu.Item
        className="bn-menu-item"
        onClick={() => openPictureEditor(editor as never, block.id)}
      >
        {t('pic.edit')}
      </Components.Generic.Menu.Item>
      <Components.Generic.Menu.Item
        className="bn-menu-item"
        onClick={drawOnPicture}
      >
        {t('pic.draw')}
      </Components.Generic.Menu.Item>
    </>
  )
}

/**
 * "Draw on picture": the Pen with the arrow shape ready. Ink anchors to the
 * block it is drawn over, so the marks stay with the picture.
 */
function drawOnPicture() {
  penSettings.update({ drawAs: 'arrow' })
  selectTool('pen')
}

/** The block menu: BlockNote's items plus "Make card", "Duplicate" and marks. */
export function AppDragHandleMenu() {
  const dict = useDictionary()
  return (
    <DragHandleMenu>
      <EditPictureItem />
      <MakeCardItem />
      <AddToSummaryItem />
      <DuplicateItem />
      <CopyItems />
      <MarkLineItems />
      <RemoveBlockItem>{dict.drag_handle.delete_menuitem}</RemoveBlockItem>
      <BlockColorsItem>{dict.drag_handle.colors_menuitem}</BlockColorsItem>
    </DragHandleMenu>
  )
}
