import { Tip } from '../help/Help'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { runTask } from '../app/errors'
import { MenuPopover } from '../app/ui'
import type { LearningNotesDB } from '../core/db'
import { t } from '../i18n/t'
import { TagChip } from './TagChip'
import { TagPicker } from './TagPicker'
import { addPageTag, removePageTag, tagMap, tagPathIn } from './tagService'

/** Chips shown before "+N more". */
const MAX_SHOWN = 8

/**
 * A page's tags, under its title: one chip per tag (current names, live),
 * "+N more" for long lists, and "+ Add tag". A chip opens a small menu
 * (show everything tagged, remove from this page).
 */
export function PageTags({
  db,
  pageId,
  tagIds,
  onOpenTag,
}: {
  db: LearningNotesDB
  pageId: string
  tagIds: readonly string[]
  onOpenTag?: (tagId: string) => void
}) {
  const tags = useLiveQuery(() => tagMap(db), [db])
  const [showAll, setShowAll] = useState(false)
  const [picking, setPicking] = useState<DOMRect | null>(null)
  const [menu, setMenu] = useState<{ tagId: string; at: DOMRect } | null>(null)
  if (!tags) return <div className="mb-[18px] min-h-7" />

  // Deleted tags are left out (their ids may linger on old pages).
  const live = tagIds.filter((id) => tags.has(id))
  const shown = showAll ? live : live.slice(0, MAX_SHOWN)

  return (
    <div
      role="group"
      aria-label={t('tags.pageTags')}
      className="mb-[18px] flex min-h-7 flex-wrap items-center gap-1.5 text-[15px]"
    >
      {shown.map((id) => {
        const path = tagPathIn(tags, id)
        return (
          <Tip key={id} id="page.tagChip" touchInfo={false}>
            <TagChip
              names={path.map((p) => p.name)}
              color={path.at(-1)?.color}
              className="min-h-7"
              onClick={(e) =>
                setMenu({
                  tagId: id,
                  at: e.currentTarget.getBoundingClientRect(),
                })
              }
            />
          </Tip>
        )
      })}
      {live.length > MAX_SHOWN && (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="min-h-7 rounded-full px-2 text-[12.5px] text-muted hover:text-ink"
        >
          {showAll
            ? t('tags.showLess')
            : t('tags.more', { count: live.length - MAX_SHOWN })}
        </button>
      )}
      <Tip id="page.addTag">
        <button
          type="button"
          onClick={(e) => setPicking(e.currentTarget.getBoundingClientRect())}
          className="min-h-7 rounded-full border border-dashed border-line px-2.5 text-[12.5px] text-muted hover:border-muted hover:text-ink"
        >
          {t('tags.add')}
        </button>
      </Tip>
      {picking && (
        <TagPicker
          db={db}
          at={picking}
          exclude={live}
          onPick={(tagId) => {
            setPicking(null)
            runTask(addPageTag(db, pageId, tagId))
          }}
          onClose={() => setPicking(null)}
        />
      )}
      {menu && (
        <MenuPopover
          anchor={menu.at}
          onClose={() => setMenu(null)}
          items={[
            ...(onOpenTag
              ? [
                  {
                    label: t('tags.showTagged'),
                    icon: '🔍',
                    onSelect: () => onOpenTag(menu.tagId),
                  },
                ]
              : []),
            {
              label: t('tags.removeFromPage'),
              icon: '✕',
              onSelect: () => runTask(removePageTag(db, pageId, menu.tagId)),
            },
          ]}
        />
      )}
    </div>
  )
}
