import { undoDepth } from 'prosemirror-history'
import { createPortal } from 'react-dom'
import {
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { AppUiContext } from '../app/appUi'
import { downloadFile } from '../app/download'
import { ThemeContext } from '../app/themeContext'
import { Icon } from '../app/tools/icons'
import { activeTool, type ModeTool } from '../app/tools/main/mainTools'
import { PEN_COLOURS } from '../app/tools/main/inkSettings'
import { useLiveQuery } from 'dexie-react-hooks'
import type { LearningNotesDB } from '../core/db'
import { loadInk, saveInk } from '../core/inkService'
import {
  earliestAt,
  recordingTimes,
  replayTarget,
  requestReplay,
  type ReplayTarget,
} from '../core/replay'
import { t } from '../i18n/t'
import { getPage, setPageInkBg } from '../pages/pageService'
import { InkController, type TextEditor } from './controller'
import { readActiveLayer, writeActiveLayer } from './activeLayer'
import { InkDoc } from './inkDoc'
import { InkHistory } from './inkHistory'
import { bumpInk, registerInk } from './inkRuntime'
import { saveToHighlightsPage } from './saveToNotes'
import { copyPng, selectionPng } from './screenshot'
import { MixedMenu } from './MixedMenu'
import { MagnifierView } from './MagnifierView'
import { RulerView } from './RulerView'
import type { Editor } from '../editor/barActions'
import { watchPaperStep } from './paperGrid'

/**
 * The ink of one open page: loads it, runs the engine over the editor
 * (`wrap` is the element the editor sits in), and shows the menu and
 * handles of a selection. Nothing is drawn while the page is frozen
 * (read-only, Reading mode); the saved ink still shows.
 */

interface Props {
  db: LearningNotesDB
  pageId: string
  notebookId: string
  /** The element that holds the editor; the ink goes into its `.bn-container`. */
  host: HTMLElement | null
  editor: TextEditor & {
    prosemirrorView?: { state: unknown }
    onChange: (cb: () => void) => (() => void) | void
    domElement?: HTMLElement
  }
  frozen: boolean
  mode: 'computer' | 'touch' | 'pencil'
}

interface Live {
  controller: InkController
}

export function InkSurface({
  db,
  pageId,
  notebookId,
  host,
  editor,
  frozen,
  mode,
}: Props) {
  // The editor draws its container a moment after mounting: wait for it.
  const [wrap, setWrap] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (!host) return
    let frame = 0
    let tries = 0
    const look = () => {
      const el = host.querySelector<HTMLElement>('.bn-container')
      if (el) setWrap(el)
      else if (tries++ < 120) frame = requestAnimationFrame(look)
    }
    look()
    return () => cancelAnimationFrame(frame)
  }, [host])
  const { toast } = useContext(AppUiContext)
  const theme = useContext(ThemeContext)
  const [live, setLive] = useState<Live | null>(null)
  // The newest values, read by the engine without restarting it.
  const latest = useRef({ frozen, mode, theme, toast })
  useEffect(() => {
    latest.current = { frozen, mode, theme, toast }
    live?.controller.syncPad()
  })

  const page = useLiveQuery(() => getPage(db, pageId), [db, pageId])
  const paper = page?.inkBg
  useEffect(() => {
    if (!wrap) return
    if (paper) wrap.setAttribute('data-ink-paper', paper)
    else wrap.removeAttribute('data-ink-paper')
    return () => wrap.removeAttribute('data-ink-paper')
  }, [wrap, paper])
  // The paper's spacing follows the text's line height.
  useEffect(() => {
    if (!wrap || !paper) return
    return watchPaperStep(wrap)
  }, [wrap, paper])
  const paperRef = useRef(paper)
  useEffect(() => {
    paperRef.current = paper
  })

  useEffect(() => {
    if (!wrap) return
    let cancelled = false
    let stop = () => {}
    void loadInk(db, pageId).then((data) => {
      if (cancelled) return
      const doc = new InkDoc({
        pageId,
        data,
        save: (layers, chunks) => saveInk(db, layers, chunks),
      })
      const history = new InkHistory()
      doc.chooseLayer(
        readActiveLayer(
          pageId,
          doc.layers.map((l) => l.id),
        ),
      )
      doc.onChoose = (id) => writeActiveLayer(pageId, id)
      const controller = new InkController({
        wrap,
        editorEl: () => editor.domElement ?? wrap.querySelector('.bn-editor'),
        editor,
        doc,
        history,
        tool: () => activeTool.get(),
        deviceMode: () => latest.current.mode,
        frozen: () => latest.current.frozen,
        night: () => latest.current.theme === 'night',
        toast: (m, action) => latest.current.toast(m, action),
        textDepth: () => {
          const state = editor.prosemirrorView?.state as never
          return state ? undoDepth(state) : 0
        },
        layerName: (n) => t('ink.layer.default', { n }),
        saveToNotes: (text) => {
          void saveToHighlightsPage(
            db,
            notebookId,
            pageId,
            t('ink.page.highlights'),
            text,
          ).then((id) => id && latest.current.toast(t('ink.hl.saved')))
        },
        setTool: (tool: ModeTool) => activeTool.set(tool),
        textSize: () => 100,
      })
      controller.lockedMessage = t('ink.locked')
      controller.layerMessage = (reason, name) =>
        t(reason === 'locked' ? 'ink.layer.isLocked' : 'ink.layer.isHidden', {
          name,
        })
      controller.layerActionLabel = (reason) =>
        t(
          reason === 'locked'
            ? 'ink.layers.unlockAction'
            : 'ink.layers.showAction',
        )
      controller.mount()
      const offDoc = doc.subscribe(bumpInk)
      const offCtl = controller.subscribe(bumpInk)
      const offTool = activeTool.subscribe(() => {
        controller.syncPad()
        if (activeTool.get() !== 'lasso') controller.clearSelection()
      })
      const offText = editor.onChange(() => controller.noteTextChange())
      const offReg = registerInk({
        editor,
        controller,
        doc,
        history,
        saveText: (text) => {
          void saveToHighlightsPage(
            db,
            notebookId,
            pageId,
            t('ink.page.highlights'),
            text,
          ).then((id) => id && latest.current.toast(t('ink.hl.saved')))
        },
        setPaper: (p) => void setPageInkBg(db, pageId, p),
        paper: () => paperRef.current,
      })
      const flush = () => void doc.flush()
      const onHide = () => {
        if (document.visibilityState === 'hidden') flush()
      }
      document.addEventListener('visibilitychange', onHide)
      window.addEventListener('pagehide', flush)
      stop = () => {
        document.removeEventListener('visibilitychange', onHide)
        window.removeEventListener('pagehide', flush)
        offDoc()
        offCtl()
        offTool()
        if (typeof offText === 'function') offText()
        offReg()
        controller.destroy()
        void doc.dispose()
      }
      setLive({ controller })
    })
    return () => {
      cancelled = true
      stop()
      setLive(null)
    }
    // The engine is made once per page; changing values come from `latest`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, pageId, wrap, editor])

  if (!live || !wrap) return null
  // Inside the overlay, so it is laid exactly over the editor.
  return createPortal(
    <InkUi
      db={db}
      pageId={pageId}
      controller={live.controller}
      paper={paper}
      editor={editor as unknown as Editor}
      wrap={wrap}
    />,
    live.controller.overlay,
  )
}

// ---- The region, the keyboard door and the selection ----

function InkUi({
  db,
  pageId,
  controller,
  paper,
  editor,
  wrap,
}: {
  db: LearningNotesDB
  pageId: string
  controller: InkController
  paper: string | undefined
  editor: Editor
  wrap: HTMLElement
}) {
  const version = useSyncExternalStore(
    (fn) => controller.subscribe(fn),
    () => controller.version,
  )
  void version
  void paper
  const { toast } = useContext(AppUiContext)
  const count = controller.selectionCount()
  const strokes = controller.strokeTotal()
  const box = controller.selectionRect()
  const [status, setStatus] = useState('')
  const tool = activeTool.useValue()

  // Strokes written while a recording ran can play it from that moment.
  const [found, setFound] = useState<{
    at: number
    target: ReplayTarget | null
  } | null>(null)
  const pickedAt =
    tool === 'lasso'
      ? earliestAt(controller.selected().map((p) => p.stroke.at))
      : 0
  useEffect(() => {
    if (pickedAt === 0) return
    let stale = false
    void recordingTimes(db, pageId).then((rows) => {
      if (!stale)
        setFound({ at: pickedAt, target: replayTarget(rows, pickedAt) })
    })
    return () => {
      stale = true
    }
  }, [db, pageId, pickedAt])
  const replay = found && found.at === pickedAt ? found.target : null

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      if (tool !== 'lasso') activeTool.set('lasso')
      const at = controller.step(1)
      if (at) setStatus(t('ink.region.selected', { at }))
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (tool !== 'lasso') activeTool.set('lasso')
      const at = controller.step(-1)
      if (at) setStatus(t('ink.region.selected', { at }))
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      controller.deleteSelection()
      setStatus('')
    } else if (e.key === 'Escape') {
      controller.clearSelection()
      setStatus('')
    }
  }

  const png = async (how: 'copy' | 'save') => {
    const style = getComputedStyle(document.body).backgroundColor
    const blob = await selectionPng(controller, style || '#ffffff')
    if (!blob) return
    if (how === 'copy') {
      toast(
        (await copyPng(blob)) ? t('ink.sel.copied') : t('ink.sel.copyFailed'),
      )
    } else {
      downloadFile('drawing.png', blob, 'image/png')
      toast(t('ink.sel.saved'))
    }
  }

  return (
    <div
      role="group"
      aria-label={t('ink.region', { n: strokes })}
      data-ink-ui
      className="pointer-events-none absolute inset-0 z-[6]"
    >
      {strokes > 0 && (
        <button
          type="button"
          data-ink-keys
          onKeyDown={onKey}
          onClick={() => {
            if (tool !== 'lasso') activeTool.set('lasso')
            const at = controller.step(1)
            if (at) setStatus(t('ink.region.selected', { at }))
          }}
          className="pointer-events-auto sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded-lg focus:border focus:border-ink-soft focus:bg-bg focus:px-3 focus:py-2 focus:text-sm"
        >
          {t('ink.region.step')}
        </button>
      )}
      <span aria-live="polite" className="sr-only">
        {status}
      </span>
      <HiddenLayerChip controller={controller} />
      <RulerView controller={controller} wrap={wrap} />
      <MagnifierView controller={controller} wrap={wrap} />
      {count > 0 && box && tool === 'lasso' && (
        <SelectionBox
          controller={controller}
          editor={editor}
          wrap={wrap}
          box={box}
          count={count}
          onPng={png}
          onReplay={replay ? () => requestReplay(replay) : undefined}
        />
      )}
    </div>
  )
}

function SelectionBox({
  controller,
  editor,
  wrap,
  box,
  count,
  onPng,
  onReplay,
}: {
  controller: InkController
  editor: Editor
  wrap: HTMLElement
  box: { x: number; y: number; w: number; h: number }
  count: number
  onPng: (how: 'copy' | 'save') => void
  /** Set when the drawing was written during a recording. */
  onReplay?: () => void
}) {
  const [colours, setColours] = useState(false)
  const grab =
    (how: 'scale' | 'rotate', corner?: { x: number; y: number }) =>
    (e: ReactPointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      try {
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      } catch {
        // Not a real pointer (a test): window events still reach the engine.
      }
      controller.startTransform(how, e.nativeEvent, corner)
    }
  const corners = [
    { x: box.x, y: box.y },
    { x: box.x + box.w, y: box.y },
    { x: box.x, y: box.y + box.h },
    { x: box.x + box.w, y: box.y + box.h },
  ]
  const menuAbove = box.y > 70
  // Drawings and page content in one loop: the mixed menu, no handles.
  if (controller.blockSel.length > 0) {
    return (
      <>
        <div
          data-ink-box
          aria-hidden
          className="absolute rounded-sm border border-dashed border-accent"
          style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
        />
        <MixedMenu
          controller={controller}
          editor={editor}
          wrap={wrap}
          box={box}
        />
      </>
    )
  }
  const handle =
    'pointer-events-auto absolute grid size-11 -translate-x-1/2 -translate-y-1/2 touch-none place-items-center'
  return (
    <>
      <div
        data-ink-box
        aria-hidden
        className="absolute rounded-sm border border-dashed border-accent"
        style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
      />
      {corners.map((c, i) => (
        <button
          key={i}
          type="button"
          tabIndex={-1}
          data-ink-handles
          data-handle="scale"
          aria-label={t('ink.sel.scale')}
          title={t('ink.sel.scale')}
          onPointerDown={grab('scale', c)}
          className={handle}
          style={{ left: c.x, top: c.y }}
        >
          <span className="size-3.5 rounded-full border-2 border-accent bg-bg" />
        </button>
      ))}
      <div
        aria-hidden
        className="absolute w-px bg-accent"
        style={{ left: box.x + box.w / 2, top: box.y - 30, height: 30 }}
      />
      <button
        type="button"
        tabIndex={-1}
        data-ink-handles
        data-handle="rotate"
        aria-label={t('ink.sel.rotate')}
        title={t('ink.sel.rotate')}
        onPointerDown={grab('rotate')}
        className={handle}
        style={{ left: box.x + box.w / 2, top: box.y - 34 }}
      >
        <span className="grid size-6 place-items-center rounded-full border-2 border-accent bg-bg text-accent">
          <Icon name="rotate" size={14} />
        </span>
      </button>
      <div
        role="toolbar"
        aria-label={t('ink.sel.menu')}
        data-ink-handles
        data-ink-menu
        title={t('ink.sel.hint')}
        className="pointer-events-auto absolute flex w-max max-w-[92vw] -translate-x-1/2 flex-wrap items-center gap-0.5 rounded-2xl border border-ink-soft bg-bg p-1 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_10px_28px_rgba(0,0,0,0.2)]"
        style={{
          left: Math.max(150, box.x + box.w / 2),
          top: menuAbove ? box.y - 112 : box.y + box.h + 20,
        }}
      >
        <span className="px-2 text-xs text-ink-soft">
          {t('ink.sel.count', { count })}
        </span>
        {onReplay && (
          <MenuButton
            id="replay"
            icon="music"
            label={t('ink.sel.replay')}
            onClick={onReplay}
          />
        )}
        <MenuButton
          id="duplicate"
          icon="duplicate"
          label={t('ink.sel.duplicate')}
          onClick={() => controller.duplicateSelection()}
        />
        <MenuButton
          id="colour"
          icon="palette"
          label={t('ink.sel.colour')}
          onClick={() => setColours((v) => !v)}
        />
        <MenuButton
          id="copyPng"
          icon="copy"
          label={t('ink.sel.copyPng')}
          onClick={() => onPng('copy')}
        />
        <MenuButton
          id="savePng"
          icon="screenshot"
          label={t('ink.sel.savePng')}
          onClick={() => onPng('save')}
        />
        <MenuButton
          id="delete"
          icon="trash"
          label={t('ink.sel.delete')}
          onClick={() => controller.deleteSelection()}
        />
        {colours && (
          <div className="flex w-full flex-wrap gap-1 p-1">
            {PEN_COLOURS.map((c) => (
              <button
                key={c.id}
                type="button"
                data-ink-colour={c.id}
                aria-label={c.id}
                onClick={() => {
                  controller.colourSelection(c.hex)
                  setColours(false)
                }}
                className="size-9 rounded-full border border-ink-soft"
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

/**
 * A layer that is hidden but has drawings shows a small chip at the page's top
 * right: "Layer 2 hidden · Show" (one tap shows it).
 */
function HiddenLayerChip({ controller }: { controller: InkController }) {
  const hidden = controller.hiddenLayersWithInk()
  if (hidden.length === 0) return null
  return (
    <div
      className="pointer-events-none absolute end-2 top-2 flex flex-col items-end gap-1"
      data-hidden-layers
    >
      {hidden.map((layer) => (
        <button
          key={layer.id}
          type="button"
          data-hidden-layer={layer.id}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => controller.showLayer(layer)}
          className="pointer-events-auto min-h-11 rounded-full border border-ink-soft bg-bg px-3 text-xs text-ink-soft shadow hover:bg-hover hover:text-ink"
        >
          {t('ink.layers.hiddenBadge', { name: layer.name })} ·{' '}
          <span className="font-semibold text-accent">
            {t('ink.layers.showAction')}
          </span>
        </button>
      ))}
    </div>
  )
}

function MenuButton({
  id,
  icon,
  label,
  onClick,
}: {
  id: string
  icon: Parameters<typeof Icon>[0]['name']
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      data-ink-action={id}
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="grid min-h-11 min-w-11 place-items-center rounded-xl text-ink-soft hover:bg-hover hover:text-ink"
    >
      <Icon name={icon} />
    </button>
  )
}
