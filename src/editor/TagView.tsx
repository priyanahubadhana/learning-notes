import { useLiveQuery } from 'dexie-react-hooks'
import { useContext } from 'react'
import { t } from '../i18n/t'
import { TagChip } from '../tags/TagChip'
import { getTagPath } from '../tags/tagService'
import { EditorContext } from './editorContext'
import type { TagRefProps } from './mapping'

/**
 * A tag inside text ("#"): shows the tag's current name and parents
 * (live, so a rename shows at once). A deleted tag shows its old name,
 * faint.
 */
export function TagView({ tagId, label }: TagRefProps) {
  const app = useContext(EditorContext)
  const path = useLiveQuery(
    async () => (app ? getTagPath(app.db, tagId) : undefined),
    [app, tagId],
  )
  if (!path || path.length === 0) {
    return (
      <span
        className={path ? 'tag-chip tag-chip-gone' : 'tag-chip'}
        title={path ? t('tags.gone') : undefined}
      >
        #{label}
      </span>
    )
  }
  const tag = path.at(-1)!
  return (
    <TagChip
      names={path.map((p) => p.name)}
      color={tag.color}
      onClick={app?.openTag ? () => app.openTag?.(tagId) : undefined}
      title={app?.openTag ? t('tags.openHint') : undefined}
    />
  )
}
