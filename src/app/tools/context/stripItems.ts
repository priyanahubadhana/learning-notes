import { t, type MessageKey } from '../../../i18n/t'
import {
  pictureControl,
  type PictureAction,
} from '../../../editor/pictureControl'
import { inkApi } from '../../../ink/inkRuntime'
import { currentRunner } from '../toolRuntime'
import { findTool, runTool, toolLabel } from '../toolRegistry'
import { contextTabOn, type ContextKind } from './contextStore'
import { ribbonExpanded, ribbonOpen } from '../toolbarState'

/** One button of a strip. */
export interface StripItem {
  id: string
  label: string
  run: () => void
  pressed?: boolean
}

interface Block {
  id: string
  type: string
  props?: Record<string, unknown>
}
interface BlockEditor {
  getTextCursorPosition: () => { block: Block }
  insertBlocks: (b: unknown[], ref: string, p: 'after') => unknown
  removeBlocks: (ids: string[]) => unknown
}

/** The page block holding the caret (a video, a table), or null. */
function cursorBlock(): { editor: BlockEditor; block: Block } | null {
  const editor = currentRunner().editor as unknown as BlockEditor | null
  if (!editor) return null
  try {
    return { editor, block: editor.getTextCursorPosition().block }
  } catch {
    return null
  }
}

function blockOps(): StripItem[] {
  return [
    {
      id: 'duplicate',
      label: t('ctx.duplicate'),
      run: () => {
        const c = cursorBlock()
        if (!c) return
        const { id: _id, ...rest } = c.block
        void _id
        c.editor.insertBlocks([rest], c.block.id, 'after')
      },
    },
    {
      id: 'delete',
      label: t('ctx.delete'),
      run: () => {
        const c = cursorBlock()
        if (c) c.editor.removeBlocks([c.block.id])
      },
    },
  ]
}

/** The buttons of each strip, in order, grouped. The first group is the "top actions". */
export function stripGroups(kind: ContextKind): StripItem[][] {
  if (kind === 'picture') {
    const c = pictureControl.get()
    if (!c) return []
    const go = (a: PictureAction) => () => c.run(a)
    const item = (id: PictureAction, key: MessageKey, pressed?: boolean) => ({
      id,
      label: t(key),
      run: go(id),
      pressed,
    })
    return [
      [
        item('smaller', 'pic.s.smaller'),
        item('bigger', 'pic.s.bigger'),
        item('fit', 'pic.s.fit'),
        item('natural', 'pic.s.natural'),
        item('handles', 'pic.act.resize', c.handles),
      ],
      [item('cropRotate', 'pic.s.crop'), item('replace', 'pic.s.replace')],
      [
        item('alignLeft', 'pic.s.left', c.align === 'left'),
        item('alignCenter', 'pic.s.center', c.align === 'center'),
        item('alignRight', 'pic.s.right', c.align === 'right'),
      ],
      [
        item('copy', 'ctx.copy'),
        item('cut', 'ctx.cut'),
        item('duplicate', 'ctx.duplicate'),
        item('delete', 'ctx.delete'),
        item('deselect', 'ctx.deselect'),
      ],
    ]
  }
  if (kind === 'video') {
    const url = String(cursorBlock()?.block.props?.url ?? '')
    return [
      [
        {
          id: 'open',
          label: t('ctx.video.open'),
          run: () => {
            if (/^https?:\/\//i.test(url))
              window.open(url, '_blank', 'noopener,noreferrer')
          },
        },
        {
          id: 'copyLink',
          label: t('ctx.video.copy'),
          run: () => void navigator.clipboard?.writeText(url).catch(() => {}),
        },
      ],
      blockOps(),
    ]
  }
  if (kind === 'table') {
    return [[...tools(['copyMarkdown']), ...blockOps()]]
  }
  if (kind === 'ink') {
    const c = inkApi()?.controller
    if (!c) return []
    return [
      [
        { id: 'copy', label: t('ctx.copy'), run: () => void c.copySelection() },
        { id: 'cut', label: t('ctx.cut'), run: () => void c.cutSelection() },
        {
          id: 'duplicate',
          label: t('ctx.duplicate'),
          run: () => c.duplicateSelection(),
        },
        {
          id: 'delete',
          label: t('ctx.delete'),
          run: () => c.deleteSelection(),
        },
        {
          id: 'deselect',
          label: t('ctx.deselect'),
          run: () => c.clearSelection(),
        },
      ],
    ]
  }
  return [tools(['bold', 'italic', 'underline', 'color', 'link'])]
}

function tools(ids: string[]): StripItem[] {
  return ids.flatMap((id) => {
    const tool = findTool(id)
    return tool ? [{ id, label: toolLabel(tool), run: () => runTool(id) }] : []
  })
}

const TAB_KEY: Record<ContextKind, MessageKey> = {
  picture: 'ctx.tab.picture',
  video: 'ctx.tab.video',
  table: 'ctx.tab.table',
  ink: 'ctx.tab.ink',
  text: 'ctx.tab.text',
}
export const contextTabLabel = (kind: ContextKind): string => t(TAB_KEY[kind])

/** Opens the full tool bar on the context tab. */
export function openFullOnContext(): void {
  contextTabOn.set(true)
  ribbonExpanded.set(true)
  ribbonOpen.set(true)
}
