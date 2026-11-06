import {
  createStarterDatabase,
  type StarterId,
} from '../databases/starterDatabases'
import '@blocknote/mantine/style.css'
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from '@blocknote/core'
import { SuggestionMenu } from '@blocknote/core/extensions'
import { useLiveQuery } from 'dexie-react-hooks'
import { BlockNoteView } from '@blocknote/mantine'
import {
  FormattingToolbarController,
  SideMenu,
  SideMenuController,
  SuggestionMenuController,
  useCreateBlockNote,
} from '@blocknote/react'
import {
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'
import { AppUiContext, TopStackSlotContext } from '../app/appUi'
import { nestedCardPlacement } from '../settings/builtinSettings'
import { useSyncedSetting } from '../settings/useSetting'
import { runTask } from '../app/errors'
import { editorColorScheme } from '../app/theme'
import { ThemeContext } from '../app/themeContext'
import { listBlocks } from '../core/blockService'
import { syncCardRecords } from '../recall/cardService'
import type { LearningNotesDB } from '../core/db'
import type { Block, Page } from '../core/types'
import { createPage } from '../pages/pageService'
import { tagMap } from '../tags/tagService'
import { t } from '../i18n/t'
import { DatabasePicker } from '../databases/DatabasePicker'
import { LinkPicker } from '../links/LinkPicker'
import { AppDragHandleMenu } from './CardMenu'
import { AppFormattingToolbar } from './SelectionToolbar'
import { DockedBar } from './DockedBar'
import { watchDragSelect } from './dragSelect'
import { penTransactionGuard, watchPenGuard } from './penGuard'
import {
  applyPageMode,
  editableIn,
  pageMode,
  pageModeFor,
  policyEnabled,
} from './editPolicy'
import { watchPenSelect } from './penSelect'
import { watchKeyboardPolicy } from './keyboardPolicy'
import { watchTapSelect } from './tapSelect'
import { watchHoldSelect } from './holdSelect'
import { activeTool, miniToolbarOpen } from '../app/tools/main/mainTools'
import { changeSet } from '../app/tools/toolbarState'
import { runHistory } from './historyActions'
import { InkSurface } from '../ink/InkSurface'
import { useBarLayout } from './useBarLayout'
import {
  copyAs,
  copyPageWithPictures,
  noteKeyForPaste,
  pasteHandler,
  pastePlainFromClipboard,
} from './clipboard'
import { focusEndLine } from './lineActions'
import { clearActiveEditor, setActiveEditor } from '../app/tools/toolRuntime'
import {
  useBarSettings,
  useKeyboardInset,
} from '../settings/deviceModeSettings'
import { codeBlockKeys } from './codeBlockKeys'
import type { NestedCardPlace } from './cardActions'
import { EditorContext, type EditorApi } from './editorContext'
import {
  BRACKET_TYPED,
  insertNoteLink,
  linkTrigger,
  linkTriggerAt,
} from './linkActions'
import {
  editorToDrafts,
  type NoteLinkProps,
  recordsToEditor,
  withoutIds,
} from './mapping'
import { getEditorDictionary } from '../i18n/languages'
import { imageRef, parseImageRef } from '../images/imageRef'
import { ImageError, imageObjectUrl, saveImage } from '../images/imageService'
import { shrinkImage } from '../images/shrinkImage'
import { readingLocked } from '../app/reading/readingState'
import { holdPageLock, type LockState, type PageLock } from './pageLock'
import { recoverStash } from './pendingStash'
import { createPageSync } from './pageSync'
import { revealBlock } from './revealBlock'
import { editorBlockTypes, schema } from './schema'
import { buildSlashMenuItems } from './slashMenu'
import { TAG_TRIGGER, tagMenuItems, tagMenuShouldOpen } from './tagActions'

interface PageEditorProps {
  db: LearningNotesDB
  pageId: string
  notebookId: string
  /** Opens an existing page (e.g. clicking a page link). */
  onOpenPage: (pageId: string) => void
  /** Reviews this page's cards (Card list button); unset on templates. */
  onReviewCards?: (includeSubpages: boolean) => void
  /** Opens a page just created here (e.g. "New sub-page" in the / menu). */
  onOpenNewPage: (page: Page) => void
  /** Shows everything with a tag (a tag in text is clicked). */
  onOpenTag?: (tagId: string) => void
  /** Opens a database on its own screen (a database block's "Open"). */
  onOpenDatabase?: (databaseId: string) => void
  /** "/ Save page as template" (left out of the menu when undefined). */
  onSaveAsTemplate?: () => void
  /** Filled with focus/flush controls for the page around the editor. */
  editorRef?: RefObject<EditorApi | null>
  /** Reading mode is on: the full-screen reader hides the bar and freezes the text. */
  reading?: { view: 'inPlace' | 'reader' }
}

/** Time for the window that lost the page to finish its last save. */
const TAKE_OVER_WAIT_MS = 400

/** Loads a page's blocks, then shows the editor for that page. */
export function PageEditor(props: PageEditorProps) {
  const { db, pageId } = props
  const [loaded, setLoaded] = useState<{
    pageId: string
    records: Block[]
    version: number
  }>()
  const [failed, setFailed] = useState<{ error: unknown }>()
  // Only one window edits a page (pageLock.ts).
  const [lock, setLock] = useState<{ pageId: string; state: LockState }>()
  const pageLock = useRef<PageLock>(null)
  const [taking, setTaking] = useState(false)
  // Raised after Edit here: reads what the other window saved.
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const held = holdPageLock(pageId, (state) => setLock({ pageId, state }))
    pageLock.current = held
    return () => held.release()
  }, [pageId])
  const editHere = () => {
    pageLock.current?.takeOver()
    setTaking(true)
    setTimeout(() => {
      setVersion((v) => v + 1)
      setTaking(false)
    }, TAKE_OVER_WAIT_MS)
  }

  useEffect(() => {
    let cancelled = false
    // Also adds any missing card records (e.g. older data saved before
    // blocks and cards were saved together); writes nothing otherwise.
    // Changes kept when the tab was last closed come back first.
    recoverStash(db, pageId)
      .then(() => syncCardRecords(db, pageId))
      .then(() => listBlocks(db, pageId))
      .then(
        (records) => {
          if (!cancelled) setLoaded({ pageId, records, version })
        },
        (error: unknown) => {
          if (!cancelled) setFailed({ error })
        },
      )
    return () => {
      cancelled = true
    }
  }, [db, pageId, version])

  if (failed) throw failed.error // shows the error screen (ErrorBoundary)
  // Wait until this page's blocks are loaded (not a previous page's).
  if (loaded?.pageId !== pageId || lock?.pageId !== pageId) return null
  const readOnly = lock.state === 'elsewhere' || taking
  return (
    <>
      {readOnly && (
        <div
          role="status"
          className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-soft px-3 py-2 text-sm"
        >
          <span>{t('editor.elsewhere')}</span>
          <button
            type="button"
            disabled={taking}
            onClick={editHere}
            className="min-h-9 rounded-md px-2.5 font-medium text-accent underline underline-offset-2 hover:bg-hover disabled:opacity-50"
          >
            {t('editor.editHere')}
          </button>
        </div>
      )}
      <LoadedPageEditor
        key={`${pageId}:${loaded.version}`}
        {...props}
        records={loaded.records}
        readOnly={readOnly}
      />
    </>
  )
}

function LoadedPageEditor({
  db,
  pageId,
  notebookId,
  onOpenPage,
  onReviewCards,
  onOpenNewPage,
  onOpenTag,
  onOpenDatabase,
  onSaveAsTemplate,
  editorRef,
  reading,
  records,
  readOnly,
}: PageEditorProps & { records: Block[]; readOnly: boolean }) {
  const { chooseTemplate, toast, choose } = useContext(AppUiContext)
  // Blocks go in as the editor's starting content, so loading is not an edit.
  const [initialContent] = useState(() => {
    const blocks = recordsToEditor(records, editorBlockTypes)
    return blocks.length > 0 ? blocks : undefined // BlockNote rejects []
  })
  const editor = useCreateBlockNote({
    schema,
    initialContent,
    extensions: [codeBlockKeys, linkTrigger, penTransactionGuard],
    // Pasted web pages are cleaned; Ctrl/Cmd+Shift+V pastes plain text.
    pasteHandler: pasteHandler as never,
    // The editor's own menus in the chosen language (English if none).
    dictionary: getEditorDictionary() as undefined,
    // Pictures chosen in the editor are kept in the app (images/).
    uploadFile: async (file) => {
      try {
        return imageRef((await saveImage(db, file, shrinkImage)).id)
      } catch (error) {
        if (error instanceof ImageError) toast(error.message)
        throw error
      }
    },
    resolveFileUrl: async (url) => {
      const id = parseImageRef(url)
      return id ? ((await imageObjectUrl(db, id)) ?? '') : url
    },
  })
  const theme = useContext(ThemeContext)
  // Touch and Pencil: a docked bar instead of the floating toolbar.
  const bar = useBarSettings()
  const keyboardInset = useKeyboardInset()
  const layout = useBarLayout()
  // Reading: the reader (and "Lock to reading") stop editing; the reader
  // also hides the bar. In place the bar stays, with the Read tools.
  const lockedToReading = readingLocked.useValue()
  const inReader = reading?.view === 'reader'
  const frozen = readOnly || inReader || (!!reading && lockedToReading)
  const tool = activeTool.useValue()
  const policyOn = policyEnabled.useValue()
  const wanted = pageModeFor({ tool, frozen, reading: false })
  const mode = !policyOn && wanted === 'ink' ? 'edit' : wanted
  const docked = bar.placement !== 'floating' && !readOnly && !inReader
  const barSlot = useContext(TopStackSlotContext)
  // The element ink is laid over (the editor sits in it).
  const [inkWrap, setInkWrap] = useState<HTMLElement | null>(null)
  const [sync] = useState(() =>
    createPageSync(db, pageId, records, () => editorToDrafts(editor.document)),
  )

  useEffect(() => {
    if (!editorRef) return
    editorRef.current = {
      focus: () => editor.focus(),
      flush: sync.flush,
      copyPage: (kind) => {
        if (kind === 'pictures') void copyPageWithPictures(editor, toast)
        else void copyAs(editor, kind, toast, editor.document)
      },
      pastePlain: () => void pastePlainFromClipboard(editor, toast),
    }
    return () => {
      editorRef.current = null
    }
  }, [editor, editorRef, sync, toast])

  // Remember Ctrl/Cmd+Shift+V: the paste that follows is plain text.
  useEffect(() => {
    window.addEventListener('keydown', noteKeyForPaste, true)
    return () => window.removeEventListener('keydown', noteKeyForPaste, true)
  }, [])

  // The page moved to another window: finish saving what was typed here.
  useEffect(() => {
    if (readOnly) void sync.flush()
  }, [readOnly, sync])

  useEffect(() => {
    // Save right away when leaving the page or hiding the tab.
    // When a tab is closed, the browser may stop the page before the
    // database write finishes; so the unsaved changes are also kept in
    // localStorage (synchronous) and brought back at the next start.
    const flush = () => {
      sync.stash()
      void sync.flush()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('beforeunload', flush)
      void sync.leave() // saves, then keeps a history copy
      sync.dispose()
    }
  }, [sync])

  // Tags in memory, so the # menu keeps up with fast typing.
  const tags = useLiveQuery(() => tagMap(db), [db])

  /** "/ New sub-page": create it, link it here, save, then open it. */
  const newSubPage = () =>
    runTask(
      (async () => {
        const page = await createPage(db, notebookId, pageId)
        insertOrUpdateBlockForSlashMenu(editor, {
          type: 'pageLink',
          props: { pageId: page.id },
        })
        await sync.flush() // link is saved before this page closes
        onOpenNewPage(page)
      })(),
    )

  /** The open link picker: where it opens, and the "[[" it replaces. */
  const [linking, setLinking] = useState<{
    at: DOMRect | undefined
    triggerPos: number | null
  } | null>(null)
  const openLinkPicker = (triggerPos: number | null) =>
    setLinking({ at: editor.getSelectionBoundingBox(), triggerPos })
  // "[" typed in this editor: open the picker if it made "[[".
  useEffect(() => {
    const onBracket = (e: Event) => {
      if (!editor.domElement?.contains(e.target as Node)) return
      const triggerPos = linkTriggerAt(editor)
      if (triggerPos === null) return
      setLinking({ at: editor.getSelectionBoundingBox(), triggerPos })
    }
    document.addEventListener(BRACKET_TYPED, onBracket)
    return () => document.removeEventListener(BRACKET_TYPED, onBracket)
  }, [editor])
  const closeLinkPicker = (link?: NoteLinkProps) => {
    const triggerPos = linking?.triggerPos ?? null
    setLinking(null)
    editor.focus()
    if (link) insertNoteLink(editor, link, triggerPos)
  }

  /** "/ Insert template…": copy a template's blocks in at the cursor. */
  const insertTemplate = () =>
    runTask(
      (async () => {
        const templateId = await chooseTemplate('insert')
        if (!templateId) return
        const records = (await listBlocks(db, templateId)).filter(
          (b) => b.type !== 'pageLink',
        )
        const blocks = withoutIds(recordsToEditor(records, editorBlockTypes))
        if (blocks.length === 0) return

        const current = editor.getTextCursorPosition().block
        const emptyLine =
          current.type === 'paragraph' &&
          Array.isArray(current.content) &&
          current.content.length === 0
        if (emptyLine) editor.replaceBlocks([current], blocks)
        else editor.insertBlocks(blocks, current, 'after')
        toast(t('editor.templateInserted'))
      })(),
    )

  /**
   * "/card" inside an answer: the setting decides at once (read ahead, so
   * the card goes in like any other), or we ask.
   */
  const nestedPreference = useSyncedSetting(db, nestedCardPlacement)
  const placeNestedCard = ():
    NestedCardPlace | Promise<NestedCardPlace | null> => {
    const preference = nestedPreference ?? nestedCardPlacement.defaultValue
    if (preference !== 'ask') return preference
    return askNestedCard()
  }
  const askNestedCard = async (): Promise<NestedCardPlace | null> => {
    const answer = await choose({
      title: t('nestedCard.title'),
      message: t('nestedCard.message'),
      options: [
        { value: 'inside', label: t('nestedCard.inside') },
        { value: 'nextLine', label: t('nestedCard.nextLine'), primary: true },
      ],
      settingId: nestedCardPlacement.id,
    })
    return answer === 'inside' || answer === 'nextLine' ? answer : null
  }

  /** "/database": the open picker (resolves to the choice). */
  const [databasePicker, setDatabasePicker] = useState<{
    workspaceId: string
    resolve: (value: string | null) => void
  } | null>(null)
  /** "/database": pick (or start) a database and put it in the note. */
  const insertDatabase = () =>
    runTask(
      (async () => {
        const notebook = await db.notebooks.get(notebookId)
        if (!notebook) return
        const picked = await new Promise<string | null>((resolve) =>
          setDatabasePicker({ workspaceId: notebook.workspaceId, resolve }),
        )
        setDatabasePicker(null)
        if (!picked) return
        let databaseId = picked.slice(3)
        if (picked.startsWith('new:')) {
          const created = await createStarterDatabase(
            db,
            notebook.workspaceId,
            notebook.kind ? null : notebook.id,
            picked.slice(4) as StarterId,
          )
          databaseId = created.id
        }
        const current = editor.getTextCursorPosition().block
        const emptyLine =
          current.type === 'paragraph' &&
          Array.isArray(current.content) &&
          current.content.length === 0
        const block = { type: 'database' as const, props: { databaseId } }
        const inserted = emptyLine
          ? editor.replaceBlocks([current], [block]).insertedBlocks
          : editor.insertBlocks([block], current, 'after')
        // The cursor goes to a fresh line below, so no text toolbar opens
        // over the database.
        const below = editor.insertBlocks(
          [{ type: 'paragraph' }],
          inserted[inserted.length - 1],
          'after',
        )
        editor.setTextCursorPosition(below[0], 'start')
      })(),
    )

  /** "/ Save page as template": save latest edits first. */
  const saveAsTemplate = onSaveAsTemplate
    ? () =>
        runTask(
          (async () => {
            await sync.flush()
            onSaveAsTemplate()
          })(),
        )
    : undefined

  // The newest toast function, without restarting the pen watchers.
  const toastRef = useRef(toast)
  useEffect(() => {
    toastRef.current = toast
  })

  // A pen or mouse drag across pictures selects whole blocks, pictures included.
  useEffect(() => {
    let stop = () => {}
    const begin = () => {
      const stopDrag = watchDragSelect(editor)
      const stopPen = watchPenSelect(editor)
      const stopKeys = watchKeyboardPolicy(editor)
      // After a tap or hold selection the Lasso context takes over, with a mini toolbar.
      const afterSelect = () => {
        if (activeTool.get() !== 'read') {
          activeTool.set('lasso')
          changeSet('draw', 'user')
        }
        miniToolbarOpen.set(true)
      }
      const stopTap = watchTapSelect(editor, afterSelect)
      const stopHold = watchHoldSelect(editor, afterSelect)
      // The Pencil must never delete text by itself (iPadOS Scribble).
      const stopGuard = watchPenGuard(editor, () =>
        toastRef.current(t('pen.guard.removed'), {
          label: t('mode.undo'),
          onSelect: () => runHistory(editor, 'undo'),
        }),
      )
      stop = () => {
        stopDrag()
        stopPen()
        stopKeys()
        stopTap()
        stopHold()
        stopGuard()
      }
    }
    if (editor.domElement) {
      begin()
      return () => stop()
    }
    const off = editor.onMount(begin)
    return () => {
      off?.()
      stop()
    }
  }, [editor])

  // The control panel, ribbon and bar run editing tools on this editor.
  useEffect(() => {
    setActiveEditor(editor as never, {
      insertDatabase,
      insertTemplate,
      saveAsTemplate,
      linkPage: () => openLinkPicker(null),
    })
  })
  useEffect(() => () => clearActiveEditor(editor as never), [editor])

  // One place decides what the page may do (see editPolicy.ts): ink tools make
  // it non-editable and inert so Scribble has nothing to write in.
  useEffect(() => {
    const content = (editor.domElement as HTMLElement | undefined) ?? null
    content?.setAttribute('data-page-content', '')
    applyPageMode(mode, {
      editor,
      content,
      title: null,
    })
  }, [editor, mode])
  useEffect(() => () => pageMode.set('edit'), [])

  /** Card list rows: open the card's page if needed, then scroll to it. */
  const openBlock = (targetPageId: string, blockId: string) => {
    if (targetPageId !== pageId) onOpenPage(targetPageId)
    revealBlock(blockId)
  }

  return (
    <EditorContext
      value={{
        db,
        pageId,
        openPage: onOpenPage,
        openBlock,
        reviewCards: onReviewCards,
        openTag: onOpenTag,
        openDatabase: onOpenDatabase,
      }}
    >
      <div ref={setInkWrap} data-ink-wrap className="contents">
        <BlockNoteView
          editor={editor}
          editable={editableIn(mode)}
          onChange={sync.changed}
          theme={editorColorScheme(theme)}
          slashMenu={false}
          sideMenu={false}
          formattingToolbar={false}
          // The Card answer label is drawn by CSS (index.css) from this text.
          style={
            {
              '--card-answer-label': JSON.stringify(t('card.answer')),
            } as CSSProperties
          }
        >
          {docked && <DockedBar slot={barSlot} />}
          {/* Computer keeps the toolbar over selected text as an extra. */}
          {(!docked || bar.mode === 'computer') && (
            <FormattingToolbarController
              formattingToolbar={AppFormattingToolbar}
            />
          )}
          <SideMenuController
            sideMenu={(props) => (
              <SideMenu {...props} dragHandleMenu={AppDragHandleMenu} />
            )}
          />
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) =>
              filterSuggestionItems(
                buildSlashMenuItems(editor, {
                  onNewSubPage: newSubPage,
                  onLinkPage: () => openLinkPicker(null),
                  onInsertTemplate: insertTemplate,
                  onInsertDatabase: insertDatabase,
                  onSaveAsTemplate: saveAsTemplate,
                  onPlaceNestedCard: placeNestedCard,
                }),
                query,
              )
            }
          />
          <SuggestionMenuController
            triggerCharacter={TAG_TRIGGER}
            shouldOpen={tagMenuShouldOpen}
            getItems={(query) =>
              tagMenuItems(
                db,
                editor,
                query,
                () => editor.getExtension(SuggestionMenu)?.closeMenu(),
                tags,
              )
            }
          />
        </BlockNoteView>
        <InkSurface
          db={db}
          pageId={pageId}
          notebookId={notebookId}
          host={inkWrap}
          editor={editor as never}
          frozen={frozen}
          mode={bar.mode}
        />
      </div>
      {bar.mode !== 'computer' && !frozen && (
        <button
          type="button"
          onClick={() => focusEndLine(editor)}
          className="mt-2 flex min-h-24 w-full cursor-text items-start rounded-lg px-1 py-2 text-left text-sm text-muted/70"
        >
          {t('bar.tapBelow')}
        </button>
      )}
      {docked && (layout.short === 'bottom' || layout.ribbon === 'bottom') && (
        // Room under the last line, so the fixed bars never cover text.
        <div
          aria-hidden
          style={{
            height: `calc(var(--dock-bottom, ${bar.buttonPx + 24}px) + ${keyboardInset}px)`,
          }}
        />
      )}
      {databasePicker && (
        <DatabasePicker
          db={db}
          workspaceId={databasePicker.workspaceId}
          onDone={databasePicker.resolve}
        />
      )}
      {linking && (
        <LinkPicker
          db={db}
          at={linking.at}
          onPick={closeLinkPicker}
          onClose={() => closeLinkPicker()}
        />
      )}
    </EditorContext>
  )
}
