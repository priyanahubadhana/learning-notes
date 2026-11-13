import { useContext, useMemo, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import { runTask } from '../../app/errors'
import type { LearningNotesDB } from '../../core/db'
import type { Page, Tag } from '../../core/types'
import { TagPickerLazy } from '../../design/parts/TagPicker/TagPickerLazy'
import { t } from '../../i18n/t'
import {
  addPageTag,
  findOrCreateTagPath,
  removePageTag,
  tagPathIn,
} from '../../tags/tagService'
import { joinTagPath } from '../../tags/tagNames'
import { setPrefs, type LibraryPrefs } from './libraryPrefs'
import { useTagItems } from './tagItems'

async function createTag(
  db: LearningNotesDB,
  tags: readonly Tag[],
  name: string,
  parentId: string | null,
): Promise<Tag> {
  const map = new Map(tags.map((x) => [x.id, x]))
  const parents = parentId ? tagPathIn(map, parentId).map((x) => x.name) : []
  return findOrCreateTagPath(db, joinTagPath([...parents, name]))
}

/** The universal Tag picker in filter mode (Library chip and More). */
export function TagFilterPicker({
  db,
  pages,
  shown,
  prefs,
  anchor,
  onClose,
}: {
  db: LearningNotesDB
  pages: readonly Page[]
  /** The pages now in the results: tags on others are dimmed. */
  shown: readonly Page[]
  prefs: LibraryPrefs
  anchor: HTMLElement | null
  onClose: () => void
}) {
  const { tags, items } = useTagItems(db, pages)
  const scope = useMemo(
    () => new Set(shown.flatMap((p) => p.tagIds ?? [])),
    [shown],
  )
  return (
    <TagPickerLazy
      mode="filter"
      tags={items}
      anchor={anchor}
      scope={scope.size ? scope : undefined}
      value={prefs.tagIds}
      onChange={(ids) => setPrefs({ tagIds: ids })}
      match={prefs.tagMatch}
      onMatch={(m) => setPrefs({ tagMatch: m })}
      includeSub={prefs.tagSub}
      onIncludeSub={(on) => setPrefs({ tagSub: on })}
      onCreate={(name, parentId) =>
        runTask(
          createTag(db, tags, name, parentId).then((made) =>
            setPrefs({ tagIds: [...prefs.tagIds, made.id] }),
          ),
        )
      }
      onClose={onClose}
    />
  )
}

/** The universal Tag picker in assign mode for one or many books (with Undo). */
export function TagAssignPicker({
  db,
  pages,
  all,
  anchor,
  onClose,
}: {
  db: LearningNotesDB
  pages: readonly Page[]
  all: readonly Page[]
  anchor: HTMLElement | null
  onClose: () => void
}) {
  const { toast } = useContext(AppUiContext)
  const { tags, items } = useTagItems(db, all)
  const [own, setOwn] = useState(() => pages.map((p) => p.tagIds ?? []))
  const apply = async (tagId: string, on: boolean) => {
    for (const p of pages)
      await (on ? addPageTag(db, p.id, tagId) : removePageTag(db, p.id, tagId))
    setOwn(
      pages.map((_, i) =>
        on
          ? [...new Set([...own[i], tagId])]
          : own[i].filter((x) => x !== tagId),
      ),
    )
  }
  return (
    <TagPickerLazy
      mode="assign"
      tags={items}
      itemTags={own}
      anchor={anchor}
      onToggle={(tagId, on) => {
        runTask(apply(tagId, on))
        toast(t('lib2.tagsSaved'), {
          label: t('annot.undo'),
          onSelect: () => runTask(apply(tagId, !on)),
        })
      }}
      onCreate={(name, parentId) =>
        runTask(
          createTag(db, tags, name, parentId).then((made) =>
            apply(made.id, true),
          ),
        )
      }
      onClose={onClose}
    />
  )
}
