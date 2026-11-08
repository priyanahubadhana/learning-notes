import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../i18n/t'
import type { MessageKey } from '../i18n/t'
import { CORNERS, resizedWidth, type Corner } from './pictureResize'

/** What the handles need from the editor. */
interface Host {
  domElement?: HTMLElement
  getBlock: (id: string) => { props: Record<string, unknown> } | undefined
  updateBlock: (id: string, update: unknown) => unknown
  removeBlocks?: (ids: string[]) => unknown
  insertBlocks?: (blocks: never[], ref: string, placement: 'after') => unknown
}

const LABEL: Record<Corner, MessageKey> = {
  nw: 'pic.resize.nw',
  ne: 'pic.resize.ne',
  sw: 'pic.resize.sw',
  se: 'pic.resize.se',
}

/**
 * Picture resize (G3): tap or click a picture and four corner handles appear
 * (44 px to grab, for a finger, the Pencil or a mouse). Dragging a corner
 * changes the picture's width live; letting go saves it in the block
 * (`previewWidth`), so it is the same after a reload. The height follows.
 */
export function PictureHandles({ editor }: { editor: Host }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [box, setBox] = useState<DOMRect | null>(null)
  // "Resize" in the action bar shows or hides the corner handles.
  const [handles, setHandles] = useState(true)
  const drag = useRef<{
    corner: Corner
    x: number
    y: number
    width: number
  } | null>(null)

  // A tap on a picture picks it; a tap anywhere else lets go of it.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element | null
      if (target?.closest?.('[data-picture-handles]')) return
      const picture = target?.closest?.('img.bn-visual-media') ?? null
      const next =
        picture instanceof HTMLImageElement &&
        editor.domElement?.contains(picture)
          ? picture
          : null
      setImg((old) => {
        if (old !== next) setHandles(true)
        return next
      })
    }
    window.addEventListener('pointerdown', onDown, true)
    return () => window.removeEventListener('pointerdown', onDown, true)
  }, [editor])

  // Follow the picture while the page scrolls, reflows or the picture changes.
  useEffect(() => {
    if (!img) return
    let frame = 0
    const id = img.closest('[data-id]')?.getAttribute('data-id')
    const follow = () => {
      if (!img.isConnected) {
        // Saving a new width draws the block again: pick the new picture up.
        const again = id
          ? editor.domElement?.querySelector<HTMLImageElement>(
              `[data-id="${id}"] img.bn-visual-media`,
            )
          : null
        return setImg(again ?? null)
      }
      const r = img.getBoundingClientRect()
      setBox((old) =>
        old &&
        old.left === r.left &&
        old.top === r.top &&
        old.width === r.width &&
        old.height === r.height
          ? old
          : r,
      )
      frame = requestAnimationFrame(follow)
    }
    follow()
    return () => cancelAnimationFrame(frame)
  }, [img, editor])

  if (!img || !box || box.width === 0) return null

  const holder = img.closest<HTMLElement>('.bn-file-block-content-wrapper')
  const blockId = img.closest('[data-id]')?.getAttribute('data-id') ?? ''

  const start = (corner: Corner) => (e: React.PointerEvent) => {
    if (!holder) return
    e.preventDefault()
    e.stopPropagation()
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      // Not a real pointer (a test): window events still reach us.
    }
    drag.current = {
      corner,
      x: e.clientX,
      y: e.clientY,
      width: holder.clientWidth,
    }
  }
  const widthFor = (e: React.PointerEvent): number | null => {
    const d = drag.current
    if (!d || !holder) return null
    const room = editor.domElement?.firstElementChild?.clientWidth ?? 4000
    const centred = editor.getBlock(blockId)?.props.textAlignment === 'center'
    return resizedWidth(
      d.width,
      d.corner,
      e.clientX - d.x,
      e.clientY - d.y,
      room,
      centred,
    )
  }
  const move = (e: React.PointerEvent) => {
    const w = widthFor(e)
    if (w !== null && holder) holder.style.width = `${w}px`
  }
  const end = (e: React.PointerEvent) => {
    const w = widthFor(e)
    drag.current = null
    if (w !== null && blockId) {
      editor.updateBlock(blockId, { props: { previewWidth: w } })
    }
  }

  const run = async (action: 'copy' | 'cut' | 'duplicate' | 'delete') => {
    const block = blockId ? editor.getBlock(blockId) : undefined
    if (action === 'copy' || action === 'cut') {
      try {
        const blob = await (await fetch(img.src)).blob()
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type || 'image/png']: blob }),
        ])
      } catch {
        if (action === 'cut') return // never remove what could not be copied
      }
    }
    if (action === 'duplicate' && block) {
      editor.insertBlocks?.(
        [{ type: 'image', props: { ...block.props } } as never],
        blockId,
        'after',
      )
    }
    if (action === 'cut' || action === 'delete') {
      editor.removeBlocks?.([blockId])
    }
    if (action !== 'copy' && action !== 'duplicate') setImg(null)
  }
  const actions: [string, MessageKey, () => void][] = [
    ['copy', 'pic.act.copy', () => void run('copy')],
    ['cut', 'pic.act.cut', () => void run('cut')],
    ['duplicate', 'pic.act.duplicate', () => void run('duplicate')],
    ['delete', 'pic.act.delete', () => void run('delete')],
    ['resize', 'pic.act.resize', () => setHandles((h) => !h)],
    ['deselect', 'pic.act.deselect', () => setImg(null)],
  ]
  const barTop = box.top > 72 ? box.top - 62 : box.bottom + 8
  const barLeft = Math.max(
    8,
    Math.min(box.left, window.innerWidth - 8 - 6 * 62),
  )

  const spot = (c: Corner) => ({
    left: c.endsWith('e') ? box.right : box.left,
    top: c.startsWith('s') ? box.bottom : box.top,
  })
  return createPortal(
    <div data-chrome data-picture-handles className="contents">
      <div
        role="toolbar"
        data-picture-actions
        aria-label={t('pic.act.label')}
        onPointerDown={(e) => e.stopPropagation()}
        className="fixed z-[var(--z-popup)] flex gap-0.5 rounded-2xl border border-ink-soft bg-bg p-1 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_10px_28px_rgba(0,0,0,0.2)]"
        style={{ left: barLeft, top: barTop }}
      >
        {actions.map(([id, key, onClick]) => (
          <button
            key={id}
            type="button"
            data-picture-action={id}
            aria-pressed={id === 'resize' ? handles : undefined}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            className="min-h-11 rounded-xl px-2.5 text-[13px] text-ink hover:bg-hover aria-pressed:bg-hover aria-pressed:text-accent"
          >
            {t(key)}
          </button>
        ))}
      </div>
      {handles &&
        CORNERS.map((c) => (
          <button
            key={c}
            type="button"
            tabIndex={-1}
            data-picture-handle={c}
            aria-label={t(LABEL[c])}
            onPointerDown={start(c)}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            className="fixed z-[var(--z-popup)] grid size-11 -translate-x-1/2 -translate-y-1/2 touch-none place-items-center"
            style={spot(c)}
          >
            <span className="size-3.5 rounded-full border-2 border-accent bg-bg" />
          </button>
        ))}
    </div>,
    document.body,
  )
}
