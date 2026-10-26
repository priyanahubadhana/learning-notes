import { useLiveQuery } from 'dexie-react-hooks'
import { useContext } from 'react'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import { t } from '../i18n/t'
import { resolveLink } from '../links/linkService'
import { restorePage } from '../trash/trashService'
import { EditorContext } from './editorContext'
import type { NoteLinkProps } from './mapping'

/**
 * A link inside text ("[["): shows the linked page's current title (live),
 * plus the heading/card when it points to one, and opens it on click. A
 * page in the Trash shows struck through and offers Restore.
 */
export function NoteLinkView({ pageId, blockId, label }: NoteLinkProps) {
  const app = useContext(EditorContext)
  const { toast } = useContext(AppUiContext)
  const link = useLiveQuery(
    async () => (app ? resolveLink(app.db, { pageId, blockId }) : undefined),
    [app, pageId, blockId],
  )

  if (!link || link.state === 'gone') {
    // Loading, or erased for good: the text it had when linked.
    return (
      <span
        className={link ? 'note-link note-link-gone' : 'note-link'}
        title={link ? t('links.gone') : undefined}
      >
        {label}
      </span>
    )
  }

  const title = link.title || t('review.untitled')
  // Opens the heading/card, or the page (also when the target is deleted).
  const openTarget = () => {
    if (blockId) app?.openBlock(pageId, blockId)
    else app?.openPage(pageId)
  }
  const open = () => {
    if (!app) return
    if (link.state === 'live') return openTarget()
    toast(t('search.trashed', { name: title }), {
      label: t('search.restore'),
      onSelect: () =>
        runTask(
          (async () => {
            await restorePage(app.db, pageId)
            openTarget()
          })(),
        ),
    })
  }

  return (
    <span
      role="link"
      tabIndex={-1}
      onClick={open}
      className={
        link.state === 'trash' ? 'note-link note-link-gone' : 'note-link'
      }
      title={link.state === 'trash' ? t('links.inTrash') : undefined}
    >
      {title}
      {link.anchor !== null && (
        <span className="note-link-anchor"> › {link.anchor}</span>
      )}
    </span>
  )
}
