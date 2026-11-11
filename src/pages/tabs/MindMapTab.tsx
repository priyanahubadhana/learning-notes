import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useEffect, useRef } from 'react'
import { AppUiContext } from '../../app/appUi'
import { runTask } from '../../app/errors'
import { addBlocks } from '../../core/blockBulk'
import { listBlocks } from '../../core/blockService'
import type { LearningNotesDB } from '../../core/db'
import type { Page } from '../../core/types'
import { MindMapView } from '../../editor/mindMap/MindMapView'
import { fromOutline, serializeMindMap } from '../../editor/mindMap/model'
import { imageRef } from '../../images/imageRef'
import { saveImage } from '../../images/imageService'
import { t } from '../../i18n/t'
import { headingsOutline } from './mindMapFromHeadings'

/**
 * The page's Mind map tab: every mind map block of the page (made by hand, by
 * a skill, or brought in from NotebookLM), or a button that builds one from
 * the page's headings. Editing here edits the same block; the notes editor is
 * reloaded when the tab is left so it shows the change.
 */
export default function MindMapTab({
  db,
  page,
  editable,
  onEdited,
}: {
  db: LearningNotesDB
  page: Page
  editable: boolean
  onEdited: () => void
}) {
  const { toast } = useContext(AppUiContext)
  const dirty = useRef(false)
  const reload = useRef(onEdited)
  useEffect(() => {
    reload.current = onEdited
  })
  useEffect(
    () => () => {
      if (dirty.current) reload.current()
    },
    [],
  )
  const maps = useLiveQuery(
    async () =>
      (await listBlocks(db, page.id)).filter(
        (b) => b.type === 'mindMap' && typeof b.content.data === 'string',
      ),
    [db, page.id],
  )
  if (!maps) return null

  const make = async () => {
    const outline = await headingsOutline(db, page.id, page.title)
    if (!outline) return toast(t('tabs.mindMap.noHeadings'))
    const map = fromOutline(outline, page.title)
    await addBlocks(
      db,
      page.id,
      [
        {
          type: 'mindMap',
          content: { data: serializeMindMap(map), theme: 'calm' },
        },
      ],
      { source: 'import' },
    )
    dirty.current = true
  }

  if (maps.length === 0) {
    return (
      <div className="grid gap-3">
        <p className="text-sm text-muted">{t('tabs.mindMap.empty')}</p>
        {editable && (
          <div>
            <button
              type="button"
              onClick={() => runTask(make())}
              className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90"
            >
              {t('tabs.mindMap.fromHeadings')}
            </button>
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="grid gap-6" data-mindmap-tab>
      {maps.map((b) => (
        <MindMapView
          key={b.id}
          data={String(b.content.data)}
          theme={String(b.content.theme ?? 'calm')}
          editable={editable}
          onChange={(next) => {
            dirty.current = true
            void db.blocks.update(b.id, {
              content: { ...b.content, data: next.data, theme: next.theme },
              updatedAt: Date.now(),
            })
          }}
          onPicture={(png) => {
            void saveImage(db, png)
              .then((saved) =>
                addBlocks(db, page.id, [
                  {
                    type: 'image',
                    content: { url: imageRef(saved.id), caption: '' },
                  },
                ]),
              )
              .then(() => {
                dirty.current = true
                toast(t('mm.pictureAdded'))
              })
              .catch(() => toast(t('mm.pictureFailed')))
          }}
        />
      ))}
    </div>
  )
}
