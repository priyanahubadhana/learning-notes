import { closeHistory } from 'prosemirror-history'
import { useContext } from 'react'
import { AppUiContext } from '../app/appUi'
import { downloadFile } from '../app/download'
import { Icon, type IconName } from '../app/tools/icons'
import { runTool } from '../app/tools/toolRegistry'
import type { Editor } from '../editor/barActions'
import { selectBlocks } from '../editor/dragSelect'
import { penState } from '../editor/penGuard'
import { t } from '../i18n/t'
import type { InkController } from './controller'
import { blocksText } from './blocksText'
import { copyPng, selectionPng } from './screenshot'

/**
 * The menu of a mixed Lasso selection (drawings and page content in one
 * loop): Copy (words and picture), Cut, Delete (one Undo), Screenshot, Make
 * card, and the cross. Move, scale and rotate are dimmed: they work on
 * drawings only. The actions work on the blocks by their ids, so they do not
 * depend on where the text cursor is.
 */

export function MixedMenu({
  controller,
  editor,
  wrap,
  box,
}: {
  controller: InkController
  editor: Editor
  wrap: HTMLElement
  box: { x: number; y: number; w: number; h: number }
}) {
  const { toast } = useContext(AppUiContext)
  const ids = controller.blockSel
  const paper = () => getComputedStyle(document.body).backgroundColor || '#fff'
  const text = () => blocksText(editor, ids)

  const copy = async (): Promise<boolean> => {
    const png = await selectionPng(controller, paper(), wrap)
    const plain = new Blob([text()], { type: 'text/plain' })
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': plain,
          ...(png ? { 'image/png': png } : {}),
        }),
      ])
      return true
    } catch {
      // Some browsers take one kind at a time: the picture, else the words.
      if (png && (await copyPng(png))) return true
      try {
        await navigator.clipboard.writeText(text())
        return true
      } catch {
        return false
      }
    }
  }
  const remove = () => {
    // The person pressed Delete: the Pencil guard must not hold it back.
    penState.down = false
    penState.upAt = -1e9
    const view = editor.prosemirrorView
    // Its own history step, so the Undo that follows takes both parts.
    if (view) view.dispatch(closeHistory(view.state.tr))
    controller.deleteMixed(() => editor.removeBlocks([...ids]))
  }
  const makeCard = () => {
    if (ids.length > 0) selectBlocks(editor, ids[0], ids[ids.length - 1])
    runTool('card')
  }
  const items: {
    id: string
    icon: IconName
    label: string
    run: () => void
  }[] = [
    {
      id: 'copy',
      icon: 'copy',
      label: t('main.sel.copy'),
      run: () =>
        void copy().then((ok) =>
          toast(ok ? t('ink.sel.copied') : t('ink.sel.copyFailed')),
        ),
    },
    {
      id: 'cut',
      icon: 'scissors',
      label: t('main.sel.cut'),
      run: () =>
        void copy().then((ok) => {
          if (ok) remove()
          else toast(t('ink.sel.copyFailed'))
        }),
    },
    {
      id: 'delete',
      icon: 'trash',
      label: t('main.sel.delete'),
      run: remove,
    },
    {
      id: 'screenshot',
      icon: 'screenshot',
      label: t('main.sel.screenshot'),
      run: () =>
        void selectionPng(controller, paper(), wrap).then((blob) => {
          if (!blob) return
          downloadFile('selection.png', blob, 'image/png')
          toast(t('ink.sel.saved'))
        }),
    },
    {
      id: 'makeCard',
      icon: 'cards',
      label: t('main.sel.makeCard'),
      run: makeCard,
    },
    {
      id: 'deselect',
      icon: 'close',
      label: t('main.sel.deselect'),
      run: () => controller.clearSelection(),
    },
  ]
  const menuAbove = box.y - controller.view().top > 120
  return (
    <div
      role="toolbar"
      aria-label={t('ink.mixed.label')}
      data-ink-handles
      data-ink-menu="mixed"
      data-chrome
      className="pointer-events-auto absolute flex w-max max-w-[92vw] -translate-x-1/2 flex-wrap items-center gap-0.5 rounded-2xl border border-ink-soft bg-bg p-1 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_10px_28px_rgba(0,0,0,0.2)]"
      style={{
        left: Math.min(
          Math.max(180, box.x + box.w / 2),
          Math.max(180, wrap.clientWidth - 180),
        ),
        top: menuAbove ? box.y - 64 : box.y + box.h + 20,
      }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          data-ink-action={item.id}
          aria-label={item.label}
          onMouseDown={(e) => e.preventDefault()}
          onClick={item.run}
          className="grid min-h-11 min-w-11 place-items-center rounded-xl text-ink-soft hover:bg-hover hover:text-ink"
        >
          <Icon name={item.icon} />
        </button>
      ))}
      {/* Typed text flows with the page: dragging and the handles move the ink only. */}
      <p data-ink-move-note className="w-full px-2 pb-1 text-xs text-ink-soft">
        {t('ink.mixed.moveNote')}
      </p>
    </div>
  )
}
