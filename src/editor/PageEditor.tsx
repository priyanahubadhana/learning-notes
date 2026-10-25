import '@blocknote/mantine/style.css'
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from '@blocknote/core'
import { BlockNoteView } from '@blocknote/mantine'
import { SuggestionMenuController, useCreateBlockNote } from '@blocknote/react'
import { useContext, useEffect, useState, type RefObject } from 'react'
import { runTask } from '../app/errors'
import { editorColorScheme } from '../app/theme'
import { ThemeContext } from '../app/themeContext'
import { listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import type { Block, Page } from '../core/types'
import { createPage } from '../pages/pageService'
import { codeBlockKeys } from './codeBlockKeys'
import { EditorContext } from './editorContext'
import { editorToDrafts, recordsToEditor } from './mapping'
import { createPageSync } from './pageSync'
import { editorBlockTypes, schema } from './schema'
import { buildSlashMenuItems } from './slashMenu'

interface PageEditorProps {
  db: LearningNotesDB
  pageId: string
  notebookId: string
  /** Opens an existing page (e.g. clicking a page link). */
  onOpenPage: (pageId: string) => void
  /** Opens a page just created here (e.g. "New sub-page" in the / menu). */
  onOpenNewPage: (page: Page) => void
  /** Filled with a function that focuses the editor (e.g. Enter in title). */
  focusRef?: RefObject<(() => void) | null>
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
  onOpenNewPage,
  focusRef,
  records,
}: PageEditorProps & { records: Block[] }) {
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
    if (!focusRef) return
    focusRef.current = () => editor.focus()
    return () => {
      focusRef.current = null
    }
  }, [editor, focusRef])

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

  return (
    <EditorContext value={{ db, openPage: onOpenPage }}>
      <BlockNoteView
        editor={editor}
        onChange={sync.changed}
        theme={editorColorScheme(theme)}
        slashMenu={false}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(
              buildSlashMenuItems(editor, newSubPage),
              query,
            )
          }
        />
      </BlockNoteView>
    </EditorContext>
  )
}
