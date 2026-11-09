/* The React Compiler lint cannot see that the refs here (a drag in progress,
   an animation frame, the newest action) are only read from events and frames. */
/* eslint-disable react-hooks/refs */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../i18n/t'
import type { MessageKey } from '../i18n/t'
import { setContextActive } from '../app/tools/context/contextStore'
import { db } from '../core/db'
import { placePicture } from '../images/placePicture'
import { openPictureChooser } from '../images/pictureChooserStore'
import { openPictureEditor } from '../images/pictureEditorStore'
import { onPictureSelect, takePictureSelect } from '../images/pictureSelect'
import { ghostSpot, holdPagination, trackBlock } from '../paper/paginateHold'
import { pictureControl, type PictureAction } from './pictureControl'
import {
  CORNERS,
  badWidthIds,
  clampWidth,
  goodWidth,
  presetWidth,
  resizedWidth,
  startWidth,
  tween,
  type Corner,
  type SizePreset,
} from './pictureResize'

/** What the handles need from the editor. */
interface Host {
  domElement?: HTMLElement
  document?: { id: string; type: string; props?: unknown }[]
  onChange?: (cb: () => void) => (() => void) | void
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
    holder: HTMLElement
    release: () => void
  } | null>(null)
  // The width the next frame should show (live drag), and its frame.
  const wanted = useRef<{ w: number; frame: number }>({ w: 0, frame: 0 })
  const anim = useRef(0)
  const [ghost, setGhost] = useState<{ top: number } | null>(null)
  // The newest actions, for the strip (it outlives a render).
  const latest = useRef<(a: PictureAction) => void>(() => undefined)
  const blockId = img?.closest('[data-id]')?.getAttribute('data-id') ?? ''
  const block = blockId ? editor.getBlock(blockId) : undefined
  const align = ((block?.props.textAlignment as string) ?? 'left') as
    'left' | 'center' | 'right'
  const caption = String(block?.props.caption ?? '')

  // A tap on a picture picks it; a tap anywhere else lets go of it.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element | null
      if (
        target?.closest?.(
          '[data-picture-handles],[data-ctx-bar],[data-ctx-strip]',
        )
      )
        return
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

  // A picture just pasted or placed is selected at once (its strip shows).
  useEffect(() => {
    let tries = 0
    const pick = () => {
      const id = takePictureSelect()
      if (!id) return
      const look = () => {
        const found = editor.domElement?.querySelector<HTMLImageElement>(
          `[data-id="${id}"] img.bn-visual-media`,
        )
        if (found) {
          setImg(found)
          setHandles(true)
        } else if (tries++ < 60) requestAnimationFrame(look)
      }
      look()
    }
    return onPictureSelect(pick)
  }, [editor])

  // Repair on load: a saved width that is 0, negative or NaN shows the
  // picture at its natural size again.
  useEffect(() => {
    const repair = () => {
      for (const id of badWidthIds(editor.document ?? []))
        editor.updateBlock(id, { props: { previewWidth: undefined } })
    }
    repair()
    const off = editor.onChange?.(repair)
    return () => {
      if (typeof off === 'function') off()
    }
  }, [editor])

  // The bar offers the Picture strip while a picture is selected.
  useEffect(() => {
    setContextActive('picture', img !== null)
    return () => setContextActive('picture', false)
  }, [img])
  useEffect(() => {
    if (!img) return pictureControl.set(null)
    pictureControl.set({
      run: (a) => latest.current(a),
      align,
      handles,
      caption,
      setCaption: (text) =>
        void editor.updateBlock(blockId, {
          props: { caption: text.slice(0, 500) },
        }),
    })
    return () => pictureControl.set(null)
  }, [img, align, handles, caption, blockId, editor])

  /** The room a picture may take (the page's width). */
  function roomNow(): number {
    return editor.domElement?.firstElementChild?.clientWidth ?? 4000
  }

  /** Puts a drag back as it was (cancel, background, lost pointer). */
  function cancelDrag() {
    const d = drag.current
    if (!d) return
    drag.current = null
    cancelAnimationFrame(wanted.current.frame)
    wanted.current.frame = 0
    d.holder.style.width = ''
    d.holder.style.willChange = ''
    d.release()
    setGhost(null)
  }

  // Following the app to the background ends a drag that never got its lift.
  useEffect(() => {
    const stop = () => {
      if (document.visibilityState === 'hidden') cancelDrag()
    }
    document.addEventListener('visibilitychange', stop)
    window.addEventListener('pagehide', cancelDrag)
    return () => {
      document.removeEventListener('visibilitychange', stop)
      window.removeEventListener('pagehide', cancelDrag)
      cancelDrag()
    }
  }, [])

  // Follow the picture while the page scrolls, reflows or the picture changes.
  useEffect(() => {
    if (!img) return
    let frame = 0
    let lost = 0
    const id = img.closest('[data-id]')?.getAttribute('data-id')
    const follow = () => {
      if (!img.isConnected) {
        // Saving a new width draws the block again: pick the new picture up.
        const again = id
          ? editor.domElement?.querySelector<HTMLImageElement>(
              `[data-id="${id}"] img.bn-visual-media`,
            )
          : null
        if (again) return setImg(again)
        // The picture may still be loading after the block was redrawn:
        // wait a little before letting go of it.
        if (++lost > 150) return setImg(null)
        frame = requestAnimationFrame(follow)
        return
      }
      lost = 0
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

  const start = (corner: Corner) => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    cancelDrag() // a stale drag (no lift ever came) is dropped
    cancelAnimationFrame(anim.current)
    // Everything is measured fresh now, never from an earlier gesture.
    const now = img.closest<HTMLElement>('.bn-file-block-content-wrapper')
    if (!now || !img.isConnected) return
    const width = startWidth(
      now.getBoundingClientRect().width,
      now.clientWidth,
      img.getBoundingClientRect().width,
      img.naturalWidth,
    )
    if (width === null) return // cannot be measured: no drag, nothing saved
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      // Not a real pointer (a test): window events still reach us.
    }
    now.style.willChange = 'width'
    drag.current = {
      corner,
      x: e.clientX,
      y: e.clientY,
      width,
      holder: now,
      release: holdPagination(),
    }
  }
  const widthFor = (e: React.PointerEvent): number | null => {
    const d = drag.current
    if (!d) return null
    const centred = editor.getBlock(blockId)?.props.textAlignment === 'center'
    return resizedWidth(
      d.width,
      d.corner,
      e.clientX - d.x,
      e.clientY - d.y,
      roomNow(),
      centred,
    )
  }
  // Every frame: one write of the width (no layout read in between), and the
  // ghost that says where the picture will land.
  const paint = () => {
    wanted.current.frame = 0
    const d = drag.current
    if (!d) return
    d.holder.style.width = `${wanted.current.w}px`
    const r = img.getBoundingClientRect()
    const spot = ghostSpot(r.bottom, r.height)
    setGhost((old) => (old?.top === spot?.top ? old : spot))
  }
  const move = (e: React.PointerEvent) => {
    const w = widthFor(e)
    if (w === null) return
    wanted.current.w = w
    if (!wanted.current.frame)
      wanted.current.frame = requestAnimationFrame(paint)
  }
  const end = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const w = widthFor(e)
    cancelAnimationFrame(wanted.current.frame)
    wanted.current.frame = 0
    drag.current = null
    d.holder.style.willChange = ''
    setGhost(null)
    if (e.type === 'pointercancel' || w === null || !goodWidth(w) || !blockId) {
      d.holder.style.width = ''
      d.release()
      return
    }
    // One write, one Undo; then the sheet rule runs once and the move shows.
    d.holder.style.width = `${w}px`
    trackBlock(blockId)
    editor.updateBlock(blockId, { props: { previewWidth: w } })
    d.release()
  }

  /** Size presets: a 180 ms glide, then one saved width (instant when motion is reduced). */
  const sizeTo = (preset: SizePreset) => {
    const target =
      holder ?? img.closest<HTMLElement>('.bn-file-block-content-wrapper')
    if (!target || !blockId) return
    const from = startWidth(
      target.getBoundingClientRect().width,
      img.getBoundingClientRect().width,
    )
    if (from === null) return
    const to = presetWidth(preset, from, roomNow(), img.naturalWidth)
    const done = () => {
      trackBlock(blockId)
      editor.updateBlock(blockId, {
        props: { previewWidth: clampWidth(to, roomNow()) },
      })
    }
    cancelAnimationFrame(anim.current)
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (calm || Math.abs(to - from) < 1) return done()
    const release = holdPagination()
    let t0 = 0
    const tick = (now: number) => {
      t0 ||= now
      const p = (now - t0) / 180
      target.style.width = `${tween(from, to, p)}px`
      if (p < 1) anim.current = requestAnimationFrame(tick)
      else {
        done()
        release()
      }
    }
    anim.current = requestAnimationFrame(tick)
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
  latest.current = (a) => {
    if (a === 'copy' || a === 'cut' || a === 'duplicate' || a === 'delete')
      return void run(a)
    if (a === 'smaller' || a === 'bigger' || a === 'fit' || a === 'natural')
      return sizeTo(a)
    if (a === 'handles') return setHandles((h) => !h)
    if (a === 'deselect') return setImg(null)
    if (a === 'cropRotate') return openPictureEditor(editor as never, blockId)
    if (a === 'replace')
      return openPictureChooser({
        owner: editor,
        blockId,
        onPick: (file) => void placePicture(db, editor as never, file, blockId),
      })
    const side =
      a === 'alignLeft' ? 'left' : a === 'alignRight' ? 'right' : 'center'
    editor.updateBlock(blockId, { props: { textAlignment: side } })
  }
  const actions: [string, MessageKey, () => void][] = [
    ['copy', 'pic.act.copy', () => void run('copy')],
    ['cut', 'pic.act.cut', () => void run('cut')],
    ['duplicate', 'pic.act.duplicate', () => void run('duplicate')],
    ['delete', 'pic.act.delete', () => void run('delete')],
    ['smaller', 'pic.s.smaller', () => sizeTo('smaller')],
    ['bigger', 'pic.s.bigger', () => sizeTo('bigger')],
    ['resize', 'pic.act.resize', () => setHandles((h) => !h)],
    ['deselect', 'pic.act.deselect', () => setImg(null)],
  ]
  const barTop = box.top > 72 ? box.top - 62 : box.bottom + 8
  const barLeft = Math.max(
    8,
    Math.min(box.left, window.innerWidth - 8 - actions.length * 62),
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
      {ghost && (
        <div
          data-picture-ghost
          role="status"
          aria-label={t('pic.s.hint')}
          className="pointer-events-none fixed z-[var(--z-popup)] rounded-lg border-2 border-dashed border-accent bg-accent/10"
          style={{
            left: box.left,
            top: ghost.top,
            width: box.width,
            height: box.height,
          }}
        />
      )}
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
            onLostPointerCapture={() => cancelDrag()}
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
