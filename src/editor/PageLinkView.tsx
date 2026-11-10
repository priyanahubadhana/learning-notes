import { useLiveQuery } from 'dexie-react-hooks'
import { useContext } from 'react'
import { getPage } from '../pages/pageService'
import { EditorContext } from './editorContext'

/**
 * Body of a page link block: shows the linked page's current title (live)
 * and opens it on click. Hidden while the linked page is deleted.
 */
export function PageLinkView({ pageId }: { pageId: string }) {
  const app = useContext(EditorContext)
  // undefined = loading, null = missing/deleted
  const page = useLiveQuery(
    async () =>
      app && pageId ? ((await getPage(app.db, pageId)) ?? null) : null,
    [app, pageId],
  )
  if (page === undefined) return <div className="h-[1.6em]" />

  // Linked page is deleted: hide the whole block (CSS in index.css), but keep
  // it saved, so the link comes back if the page is restored.
  if (page === null) return <span data-hidden-page-link hidden />

  return (
    <button
      data-ui
      type="button"
      contentEditable={false}
      onClick={() => app?.openPage(page.id)}
      className="cursor-pointer py-0.5 text-left select-none"
    >
      📄{' '}
      <span className="underline decoration-line underline-offset-4 hover:decoration-muted">
        {page.title || 'Untitled'}
      </span>
    </button>
  )
}
