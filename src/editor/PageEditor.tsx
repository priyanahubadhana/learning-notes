import '@blocknote/mantine/style.css'
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from '@blocknote/core'
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
import type { LearningNotesDB } from '../core/db'
import type { Block, Page } from '../core/types'
import { createPage } from '../pages/pageService'
import { t } from '../i18n/t'
import { AppDragHandleMenu } from './CardMenu'
import { AppFormattingToolbar } from './SelectionToolbar'
import { codeBlockKeys } from './codeBlockKeys'
import type { NestedCardPlace } from './cardActions'
import { EditorContext, type EditorApi } from './editorContext'
import { editorToDrafts, recordsToEditor, withoutIds } from './mapping'
import { createPageSync } from './pageSync'
import { revealBlock } from './revealBlock'
import { editorBlockTypes, schema } from './schema'
import { buildSlashMenuItems } from './slashMenu'

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
    listBlocks(db, pageId).then(
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
    extensions: [codeBlockKeys],
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
    // LIMITATION: when a tab is closed, the browser may stop the page before
    // the database write finishes, so edits from the last moment (under the
    // ~0.5 s debounce) can be lost. Hiding/switching tabs is reliable.
    const flush = () => void sync.flush()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
      flush()
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
        toast('Template inserted')
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
                onInsertTemplate: insertTemplate,
                onSaveAsTemplate: saveAsTemplate,
                onPlaceNestedCard: placeNestedCard,
              }),
              query,
            )
          }
        />
      </BlockNoteView>
    </EditorContext>
  )
}
