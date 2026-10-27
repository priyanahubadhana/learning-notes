import { listDatabases } from '../databases/databaseService'
import {
  createStarterDatabase,
  starterTitle,
  STARTER_IDS,
  type StarterId,
} from '../databases/starterDatabases'
import '@blocknote/mantine/style.css'
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from '@blocknote/core'
import { SuggestionMenu } from '@blocknote/core/extensions'
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
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'
import { AppUiContext } from '../app/appUi'
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
import { t } from '../i18n/t'
import { LinkPicker } from '../links/LinkPicker'
import { AppDragHandleMenu } from './CardMenu'
import { AppFormattingToolbar } from './SelectionToolbar'
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
}

/** Loads a page's blocks, then shows the editor for that page. */
export function PageEditor(props: PageEditorProps) {
  const { db, pageId } = props
  const [loaded, setLoaded] = useState<{ pageId: string; records: Block[] }>()

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
          if (!cancelled) setLoaded({ pageId, records })
        },
        (error: unknown) => console.error('Could not load page', error),
      )
    return () => {
      cancelled = true
    }
  }, [db, pageId])

  // Wait until this page's blocks are loaded (not a previous page's).
  if (loaded?.pageId !== pageId) return null
  return <LoadedPageEditor key={pageId} {...props} records={loaded.records} />
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
  records,
}: PageEditorProps & { records: Block[] }) {
  const { chooseTemplate, toast, choose } = useContext(AppUiContext)
  // Blocks go in as the editor's starting content, so loading is not an edit.
  const [initialContent] = useState(() => {
    const blocks = recordsToEditor(records, editorBlockTypes)
    return blocks.length > 0 ? blocks : undefined // BlockNote rejects []
  })
  const editor = useCreateBlockNote({
    schema,
    initialContent,
    extensions: [codeBlockKeys, linkTrigger],
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
  const [sync] = useState(() =>
    createPageSync(db, pageId, records, () => editorToDrafts(editor.document)),
  )

  useEffect(() => {
    if (!editorRef) return
    editorRef.current = { focus: () => editor.focus(), flush: sync.flush }
    return () => {
      editorRef.current = null
    }
  }, [editor, editorRef, sync])

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

  /** "/database": pick (or start) a database and put it in the note. */
  const insertDatabase = () =>
    runTask(
      (async () => {
        const [notebook, databases] = await Promise.all([
          db.notebooks.get(notebookId),
          listDatabases(db, (await db.notebooks.get(notebookId))!.workspaceId),
        ])
        if (!notebook) return
        const picked = await choose({
          title: t('databaseBlock.choose.title'),
          message: t('databaseBlock.choose.message'),
          options: [
            ...databases
              .slice(0, 6)
              .map((d) => ({ value: `db:${d.id}`, label: d.title })),
            ...STARTER_IDS.map((id) => ({
              value: `new:${id}`,
              label: t('databaseBlock.new', { name: starterTitle(id) }),
            })),
          ],
        })
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
      <BlockNoteView
        editor={editor}
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
        <FormattingToolbarController formattingToolbar={AppFormattingToolbar} />
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
            tagMenuItems(db, editor, query, () =>
              editor.getExtension(SuggestionMenu)?.closeMenu(),
            )
          }
        />
      </BlockNoteView>
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
