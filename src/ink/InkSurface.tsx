import { undoDepth } from 'prosemirror-history'
import { createPortal } from 'react-dom'
import {
  lazy,
  Suspense,
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
import { Icon, type IconName } from '../app/tools/icons'
import {
  activeTool,
  miniToolbarOpen,
  type ModeTool,
} from '../app/tools/main/mainTools'
import { PEN_COLOURS } from '../app/tools/main/inkSettings'
import { runTool } from '../app/tools/toolRegistry'
import { useLiveQuery } from 'dexie-react-hooks'
import type { LearningNotesDB } from '../core/db'
import { loadInk, saveInk } from '../core/inkService'
import { MAX_LABEL } from '../core/inkTypes'
import { addBlockToSummary } from '../core/summaryService'
import { selectBlocks } from '../editor/dragSelect'
import { selectTextRange, wordsInRegion } from '../editor/lassoWords'
import { lookThrough, posNear } from '../editor/tapSelect'
import { TextSelection } from 'prosemirror-state'
import { lassoRow, ROW_ACTIONS, splitMenu, type RowAction } from './lassoMenu'
import {
  earliestAt,
  recordingTimes,
  replayTarget,
  requestReplay,
  type ReplayTarget,
} from '../core/replay'
import { t } from '../i18n/t'
import { getPage, setPageInkBg } from '../pages/pageService'

// Convert to text uses the user's own AI (Phase P): a late-loaded chunk.
const ConvertInk = lazy(() =>
  import('../ai/ConvertInk').then((m) => ({ default: m.ConvertInk })),
)
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
        selectBlocks: (ids) => {
          const ed = editor as unknown as Editor
          if (selectBlocks(ed, ids[0], ids[ids.length - 1])) {
            miniToolbarOpen.set(true)
          }
        },
        blockKind: (id) => {
          const el = wrap.querySelector(
            `.bn-block[data-id="${CSS.escape(id)}"] > .bn-block-content`,
          )
          const type = el?.getAttribute('data-content-type') ?? ''
          return type === 'image' || type === 'picture' ? 'picture' : 'text'
        },
        blockBox: (id) => {
          // The words (or the picture) of the block, not the full-width block.
          const el = wrap.querySelector(
            `.bn-block[data-id="${CSS.escape(id)}"] > .bn-block-content`,
          )
          const inner =
            el?.querySelector('.bn-inline-content, img, video, audio') ?? el
          if (!inner) return null
          const r = inner.getBoundingClientRect()
          const w = wrap.getBoundingClientRect()
          if (r.width === 0) return null
          return { x: r.x - w.x, y: r.y - w.y, w: r.width, h: r.height }
        },
        wordsIn: (inside, box) => {
          const view = (editor as unknown as Editor).prosemirrorView
          return view ? wordsInRegion(view, inside, box) : null
        },
        selectText: (from, to) =>
          selectTextRange(editor as unknown as Editor, from, to),
        placeCaret: (x, y) => {
          // A finger (or mouse click) under the Lasso still starts typing.
          const view = (editor as unknown as Editor).prosemirrorView
          const dom = editor.domElement
          if (!view || !dom) return
          const pos = lookThrough(controller.pad, () => posNear(view, x, y))
          if (pos === null) return
          view.dispatch(
            view.state.tr.setSelection(
              TextSelection.create(view.state.doc, pos),
            ),
          )
          dom.setAttribute('inputmode', 'text')
          view.dom.focus({ preventScroll: true })
        },
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
  const [convertPng, setConvertPng] = useState<Blob | null>(null)
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
      {convertPng && (
        <Suspense fallback={null}>
          <ConvertInk
            db={db}
            pageId={pageId}
            controller={controller}
            editor={editor}
            png={convertPng}
            onClose={() => setConvertPng(null)}
          />
        </Suspense>
      )}
      {count > 0 && box && tool === 'lasso' && (
        <SelectionBox
          controller={controller}
          editor={editor}
          wrap={wrap}
          box={box}
          count={count}
          onPng={png}
          onConvert={() => {
            const style = getComputedStyle(document.body).backgroundColor
            void selectionPng(controller, style || '#ffffff').then(
              setConvertPng,
            )
          }}
          onReplay={replay ? () => requestReplay(replay) : undefined}
          onSummary={() => {
            // A drawing goes into the Summary by its name (a picture line
            // is for later): name it first.
            const label = controller.selectionLabel()
            if (!label) {
              toast(t('ink.sel.summaryNeedsName'))
              return
            }
            const id = controller.selection[0]
            void addBlockToSummary(db, `ink:${id}`, pageId, label).then((r) =>
              toast(
                t(
                  r.status === 'added'
                    ? 'summary.added'
                    : r.status === 'exists'
                      ? 'summary.exists'
                      : r.status === 'full'
                        ? 'summary.full'
                        : 'summary.nothing',
                ),
              ),
            )
          }}
          onCard={() => {
            // The drawing goes on the clipboard as a picture for the card's answer.
            void png('copy').then(() => {
              toast(t('ink.sel.cardHint'))
              runTool('card')
            })
          }}
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
  onConvert,
  onReplay,
  onSummary,
  onCard,
}: {
  controller: InkController
  editor: Editor
  wrap: HTMLElement
  box: { x: number; y: number; w: number; h: number }
  count: number
  onPng: (how: 'copy' | 'save') => void
  /** Lasso › Convert to text (the user's own AI). */
  onConvert: () => void
  /** Set when the drawing was written during a recording. */
  onReplay?: () => void
  /** Add to Summary for a drawing (its name) or the words in the loop. */
  onSummary: () => void
  /** Make card for a drawing alone. */
  onCard: () => void
}) {
  const { toast } = useContext(AppUiContext)
  const [colours, setColours] = useState(false)
  const [thickness, setThickness] = useState(false)
  const [labelling, setLabelling] = useState(false)
  const [more, setMore] = useState(false)
  const row = lassoRow.useValue()
  const grab =
    (
      how: 'scale' | 'rotate',
      corner?: { x: number; y: number },
      axis: 'x' | 'y' | 'both' = 'both',
    ) =>
    (e: ReactPointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      try {
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      } catch {
        // Not a real pointer (a test): window events still reach the engine.
      }
      controller.startTransform(how, e.nativeEvent, corner, axis)
    }
  // Eight handles: four corners keep the shape, four edges stretch one way.
  // The edge handles (44 px each) appear only when the box is long enough on
  // that side to leave its middle free for dragging.
  const corners: { x: number; y: number; axis: 'x' | 'y' | 'both' }[] = [
    { x: box.x, y: box.y, axis: 'both' },
    { x: box.x + box.w, y: box.y, axis: 'both' },
    { x: box.x, y: box.y + box.h, axis: 'both' },
    { x: box.x + box.w, y: box.y + box.h, axis: 'both' },
    ...(box.h >= EDGE_HANDLE_MIN
      ? [
          { x: box.x + box.w / 2, y: box.y, axis: 'y' as const },
          { x: box.x + box.w / 2, y: box.y + box.h, axis: 'y' as const },
        ]
      : []),
    ...(box.w >= EDGE_HANDLE_MIN
      ? [
          { x: box.x, y: box.y + box.h / 2, axis: 'x' as const },
          { x: box.x + box.w, y: box.y + box.h / 2, axis: 'x' as const },
        ]
      : []),
  ]
  // Above the box when there is room in the visible part of the page (the
  // overlay is clipped to it), else below.
  const vTop = controller.view().top
  const menuAbove = box.y - vTop > 120
  const turnAbove = box.y - vTop >= 44
  const turnY = turnAbove ? box.y - 34 : box.y + box.h + 34
  const mixed = controller.blockSel.length > 0
  const handle =
    'pointer-events-auto absolute grid size-11 -translate-x-1/2 -translate-y-1/2 touch-none place-items-center'
  const handles = (
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
          data-axis={c.axis}
          aria-label={t('ink.sel.scale')}
          onPointerDown={grab('scale', c, c.axis)}
          className={handle}
          style={{ left: c.x, top: c.y }}
        >
          <span
            className={
              c.axis === 'both'
                ? 'size-3.5 rounded-full border-2 border-accent bg-bg'
                : 'size-3 rounded-sm border-2 border-accent bg-bg'
            }
          />
        </button>
      ))}
      <div
        aria-hidden
        className="absolute w-px bg-accent"
        style={{
          left: box.x + box.w / 2,
          top: turnAbove ? box.y - 30 : box.y + box.h,
          height: 30,
        }}
      />
      <button
        type="button"
        tabIndex={-1}
        data-ink-handles
        data-handle="rotate"
        aria-label={t('ink.sel.rotate')}
        onPointerDown={grab('rotate')}
        className={handle}
        style={{ left: box.x + box.w / 2, top: turnY }}
      >
        <span className="grid size-6 place-items-center rounded-full border-2 border-accent bg-bg text-accent">
          <Icon name="rotate" size={14} />
        </span>
      </button>
    </>
  )
  // Drawings and page content in one loop: the mixed menu (the handles
  // move, resize and turn the ink only; the menu says so).
  if (mixed) {
    return (
      <>
        {handles}
        <MixedMenu
          controller={controller}
          editor={editor}
          wrap={wrap}
          box={box}
        />
      </>
    )
  }

  /** Every action of the drawing menu, in its fixed order. */
  const actions: Record<
    RowAction,
    { icon: IconName; label: string; run: () => void }
  > = {
    copy: {
      icon: 'copy',
      label: t('main.sel.copy'),
      run: () => {
        controller.copySelection()
        void onPng('copy')
      },
    },
    cut: {
      icon: 'scissors',
      label: t('main.sel.cut'),
      run: () => {
        controller.cutSelection()
        toast(t('ink.sel.cutDone'))
      },
    },
    duplicate: {
      icon: 'duplicate',
      label: t('ink.sel.duplicate'),
      run: () => controller.duplicateSelection(),
    },
    convert: {
      icon: 'type',
      label: t('ink.sel.convert'),
      run: onConvert,
    },
    colour: {
      icon: 'palette',
      label: t('ink.sel.colour'),
      run: () => {
        setThickness(false)
        setColours((v) => !v)
      },
    },
    delete: {
      icon: 'trash',
      label: t('ink.sel.delete'),
      run: () => controller.deleteSelection(),
    },
    thickness: {
      icon: 'sliders',
      label: t('ink.sel.thickness'),
      run: () => {
        setColours(false)
        setThickness((v) => !v)
      },
    },
    makeCard: { icon: 'cards', label: t('main.sel.makeCard'), run: onCard },
    summary: {
      icon: 'anchor',
      label: t('main.sel.summary'),
      run: onSummary,
    },
    label: {
      icon: 'pencil',
      label: t('ink.sel.label'),
      run: () => setLabelling((v) => !v),
    },
  }
  const split = splitMenu(ROW_ACTIONS, row)
  const button = (id: RowAction) => (
    <MenuButton
      key={id}
      id={id}
      icon={actions[id].icon}
      label={actions[id].label}
      onClick={actions[id].run}
    />
  )
  return (
    <>
      {handles}
      <div
        role="toolbar"
        aria-label={t('ink.sel.menu')}
        data-ink-handles
        data-ink-menu
        data-chrome
        className="pointer-events-auto absolute flex w-max max-w-[92vw] -translate-x-1/2 flex-wrap items-center gap-0.5 rounded-2xl border border-ink-soft bg-bg p-1 shadow-[0_2px_4px_rgba(0,0,0,0.08),0_10px_28px_rgba(0,0,0,0.2)]"
        style={{
          left: Math.min(
            Math.max(180, box.x + box.w / 2),
            Math.max(180, wrap.clientWidth - 180),
          ),
          // Below the box it must clear the turn handle when that is below too.
          top: menuAbove ? box.y - 112 : box.y + box.h + (turnAbove ? 20 : 64),
        }}
      >
        <span className="px-2 text-xs text-ink-soft">
          {t('ink.sel.count', { count })}
        </span>
        <MenuButton
          id="deselect"
          icon="close"
          label={t('main.sel.deselect')}
          onClick={() => controller.clearSelection()}
        />
        {split.row.map(button)}
        <MenuButton
          id="more"
          icon="more"
          label={t('ink.sel.more')}
          pressed={more}
          onClick={() => setMore((v) => !v)}
        />
        {more && (
          <div
            data-ink-more
            className="flex w-full flex-wrap items-center gap-0.5 border-t border-line pt-1"
          >
            {split.more.map(button)}
            {controller.canPaste() && (
              <MenuButton
                id="paste"
                icon="paste"
                label={t('ink.sel.paste')}
                onClick={() => controller.pasteClipboard()}
              />
            )}
            {onReplay && (
              <MenuButton
                id="replay"
                icon="music"
                label={t('ink.sel.replay')}
                onClick={onReplay}
              />
            )}
            <MenuButton
              id="copyPng"
              icon="image"
              label={t('ink.sel.copyPng')}
              onClick={() => onPng('copy')}
            />
            <MenuButton
              id="savePng"
              icon="screenshot"
              label={t('ink.sel.savePng')}
              onClick={() => onPng('save')}
            />
          </div>
        )}
        {labelling && (
          <LabelForm
            key={controller.selection.join(',')}
            initial={controller.selectionLabel()}
            onSave={(text) => {
              controller.labelSelection(text)
              setLabelling(false)
            }}
          />
        )}
        {thickness && (
          <div className="flex w-full flex-wrap gap-1 p-1">
            {THICKNESSES.map(([id, px]) => (
              <button
                key={id}
                type="button"
                data-ink-thickness={id}
                onClick={() => {
                  controller.thicknessSelection(px)
                  setThickness(false)
                }}
                className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-ink hover:bg-hover"
              >
                <span
                  className="block w-8 rounded-full bg-ink"
                  style={{ height: Math.max(2, px) }}
                />
                {t(`ink.sel.${id}`)}
              </button>
            ))}
          </div>
        )}
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

/** A side this long (px) gets a handle in its middle too. */
const EDGE_HANDLE_MIN = 110

/** Thickness choices: px on screen. */
const THICKNESSES = [
  ['thin', 1.5],
  ['medium', 3],
  ['thick', 6],
] as const

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
      data-chrome
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

/** The box that names the selected drawing (so Search can find it). */
function LabelForm({
  initial,
  onSave,
}: {
  initial: string
  onSave: (text: string) => void
}) {
  const [text, setText] = useState(initial)
  return (
    <form
      className="flex w-full items-center gap-1 p-1"
      onSubmit={(e) => {
        e.preventDefault()
        onSave(text)
      }}
    >
      <input
        value={text}
        maxLength={MAX_LABEL}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        placeholder={t('ink.label.placeholder')}
        aria-label={t('ink.label.name')}
        data-ink-label-input
        className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-sm text-ink"
      />
      <button
        type="submit"
        className="min-h-11 rounded-lg px-3 text-sm text-ink hover:bg-hover"
      >
        {t('ink.label.save')}
      </button>
    </form>
  )
}

function MenuButton({
  id,
  icon,
  label,
  onClick,
  pressed,
}: {
  id: string
  icon: Parameters<typeof Icon>[0]['name']
  label: string
  onClick: () => void
  pressed?: boolean
}) {
  return (
    <button
      type="button"
      data-ink-action={id}
      aria-label={label}
      aria-pressed={pressed}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="grid min-h-11 min-w-11 place-items-center rounded-xl text-ink-soft hover:bg-hover hover:text-ink aria-pressed:bg-hover aria-pressed:text-ink"
    >
      <Icon name={icon} />
    </button>
  )
}
