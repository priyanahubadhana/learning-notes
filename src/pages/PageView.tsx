import { useLiveQuery } from 'dexie-react-hooks'
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { LearningNotesDB } from '../core/db'
import type { Page } from '../core/types'
import { PageEditor } from '../editor/PageEditor'
import { getNotebook } from '../notebooks/notebookService'
import { getPagePath } from './pageService'
import { createTitleSaver } from './titleSaver'

interface PageViewProps {
  db: LearningNotesDB
  page: Page
  /** Put the cursor in the title (for newly created pages). */
  autoFocusTitle: boolean
  onOpenPage: (pageId: string) => void
  /** Opens a page just created from inside this page. */
  onOpenNewPage: (page: Page) => void
}

/** An open page: breadcrumb, title and block editor. */
export function PageView({
  db,
  page,
  autoFocusTitle,
  onOpenPage,
  onOpenNewPage,
}: PageViewProps) {
  const path = useLiveQuery(() => getPagePath(db, page.id), [db, page.id]) ?? []
  const notebook = useLiveQuery(
    () => getNotebook(db, page.notebookId),
    [db, page.notebookId],
  )
  const focusEditor = useRef<(() => void) | null>(null)

  return (
    <div className="mx-auto max-w-[720px] px-14 pt-[72px] pb-[200px]">
      <nav
        aria-label="Breadcrumb"
        className="mb-7 flex min-h-5 flex-wrap items-center gap-1 text-xs leading-5 text-muted"
      >
        <span>{notebook?.title}</span>
        {path.map((p, i) => (
          <Fragment key={p.id}>
            <span>/</span>
            {i < path.length - 1 ? (
              <button
                type="button"
                onClick={() => onOpenPage(p.id)}
                className="leading-5 hover:text-ink"
              >
                {p.title || 'Untitled'}
              </button>
            ) : (
              <span>{p.title || 'Untitled'}</span>
            )}
          </Fragment>
        ))}
      </nav>
      <TitleInput
        key={page.id}
        db={db}
        pageId={page.id}
        savedTitle={page.title}
        autoFocus={autoFocusTitle}
        onEnter={() => focusEditor.current?.()}
      />
      <PageEditor
        db={db}
        pageId={page.id}
        notebookId={page.notebookId}
        onOpenPage={onOpenPage}
        onOpenNewPage={onOpenNewPage}
        focusRef={focusEditor}
      />
    </div>
  )
}

interface TitleInputProps {
  db: LearningNotesDB
  pageId: string
  /** The title as currently stored (updates live, e.g. sidebar rename). */
  savedTitle: string
  autoFocus: boolean
  onEnter: () => void
}

/** Big page title. Saves shortly after typing stops; Enter jumps to the editor. */
function TitleInput({
  db,
  pageId,
  savedTitle,
  autoFocus,
  onEnter,
}: TitleInputProps) {
  const [title, setTitle] = useState(savedTitle)
  const [focused, setFocused] = useState(false)
  const [lastSaved, setLastSaved] = useState(savedTitle)
  const ref = useRef<HTMLTextAreaElement>(null)
  const [saver] = useState(() => createTitleSaver(db, pageId))

  // Title renamed elsewhere (sidebar): show it, unless the user is typing here.
  if (savedTitle !== lastSaved) {
    setLastSaved(savedTitle)
    if (!focused) setTitle(savedTitle)
  }

  // Save any pending change when the page closes.
  useEffect(
    () => () => {
      void saver.flush()
    },
    [saver],
  )

  // Grow the textarea to fit long titles.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [title])

  return (
    <textarea
      ref={ref}
      rows={1}
      value={title}
      placeholder="Untitled"
      aria-label="Page title"
      autoFocus={autoFocus}
      onChange={(e) => {
        const value = e.target.value.replace(/\n/g, '')
        setTitle(value)
        saver.set(value)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onEnter()
        }
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false)
        void saver.flush()
      }}
      className="mb-[18px] block w-full resize-none overflow-hidden bg-transparent text-[40px] leading-[1.2] font-bold tracking-[-0.025em] outline-none placeholder:text-muted"
    />
  )
}
