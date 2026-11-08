import { createPortal } from 'react-dom'
import { useContext, useEffect, useRef, useState } from 'react'
import { AppUiContext } from '../app/appUi'
import { ThemeContext } from '../app/themeContext'
import { activeTool } from '../app/tools/main/mainTools'
import type { LearningNotesDB } from '../core/db'
import { loadInk, saveInk } from '../core/inkService'
import { t } from '../i18n/t'
import { useBarSettings } from '../settings/deviceModeSettings'
import type { Editor } from '../editor/barActions'
import { readActiveLayer, writeActiveLayer } from './activeLayer'
import { InkController, type TextEditor } from './controller'
import { InkDoc } from './inkDoc'
import { InkHistory } from './inkHistory'
import { bumpInk, registerInk } from './inkRuntime'
import { InkUi } from './InkSurface'
import type { BookSurface } from './layout'

/**
 * C2b: the shared ink engine over a book page (PDF pages or EPUB paragraphs).
 * Same engine, layers, tools, Lasso and saving as a note: ink is kept as
 * `inkLayers` / `inkChunks` rows of the book page, one chunk set per block
 * (`pdf:<page>` or `epub:<section>:<n>`), so it scales with zoom, follows its
 * paragraph when the text reflows, and is backed up and synced like any ink.
 *
 * There is no text editor here: a stand-in with no-op methods takes its place.
 * `on` says whether the person is drawing; when off the pad lets every touch
 * through (selecting text, scrolling) and the saved ink is only shown.
 */

/** The editor the engine expects, doing nothing (the book has no text editor). */
const NO_EDITOR = {
  transact: <T,>(fn: (tr: never) => T) => fn(undefined as never),
  addStyles: () => {},
  onChange: () => () => {},
} as unknown as TextEditor & {
  onChange: (cb: () => void) => (() => void) | void
}

interface Props {
  db: LearningNotesDB
  /** The book page's id (the ink's `pageId`). */
  pageId: string
  /** The element the ink is laid over (it holds the book's blocks). */
  wrap: HTMLElement | null
  surface: BookSurface
  /** Drawing now (the reader's Pen is on). */
  on: boolean
  /** Text size in per cent at the time of drawing (EPUB), else 100. */
  textSize?: number
}

export function BookInk({
  db,
  pageId,
  wrap,
  surface,
  on,
  textSize = 100,
}: Props) {
  const { toast } = useContext(AppUiContext)
  const theme = useContext(ThemeContext)
  const { mode } = useBarSettings()
  const [live, setLive] = useState<InkController | null>(null)
  const latest = useRef({ on, theme, toast, textSize, mode })
  useEffect(() => {
    latest.current = { on, theme, toast, textSize, mode }
    live?.syncPad()
  })
  const surfaceRef = useRef(surface)
  useEffect(() => {
    surfaceRef.current = surface
  })

  useEffect(() => {
    if (!wrap) return
    let cancelled = false
    let stop = () => {}
    void loadInk(db, pageId).then((all) => {
      if (cancelled) return
      const doc = new InkDoc({
        pageId,
        data: all,
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
        editorEl: () => null,
        editor: NO_EDITOR,
        doc,
        history,
        tool: () => (latest.current.on ? activeTool.get() : 'read'),
        deviceMode: () => latest.current.mode,
        frozen: () => !latest.current.on,
        night: () => latest.current.theme === 'night',
        toast: (m, action) => latest.current.toast(m, action),
        textDepth: () => 0,
        layerName: (n) => t('ink.layer.default', { n }),
        saveToNotes: () => {},
        setTool: (tool) => activeTool.set(tool),
        textSize: () => latest.current.textSize,
        growRoom: false,
        selectBlocks: () => {},
        blockKind: () => 'text',
        blockBox: () => null,
        wordsIn: () => null,
        selectText: () => {},
        placeCaret: () => {},
        // The surface is read through a ref, so the engine is made once.
        book: {
          blocks: (w) => surfaceRef.current.blocks(w),
          unit: (w) => surfaceRef.current.unit(w),
          watch: (cb) => surfaceRef.current.watch?.(cb) ?? (() => {}),
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
      const offReg = registerInk({
        editor: NO_EDITOR,
        controller,
        doc,
        history,
        saveText: () => {},
        setPaper: () => {},
        paper: () => undefined,
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
        offReg()
        controller.destroy()
        void doc.dispose()
      }
      setLive(controller)
    })
    return () => {
      cancelled = true
      stop()
      setLive(null)
    }
  }, [db, pageId, wrap])

  if (!live || !wrap) return null
  return createPortal(
    <InkUi
      db={db}
      pageId={pageId}
      controller={live}
      paper={undefined}
      editor={NO_EDITOR as unknown as Editor}
      wrap={wrap}
    />,
    live.overlay,
  )
}
