import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo } from 'react'
import { db } from '../../core/db'

/** Plays a stored video file (a NotebookLM video overview) right in the page. Only for video/mp4, video/webm and video/quicktime. */
const PLAYABLE = /^video\/(mp4|webm|quicktime|x-m4v)$/

export function InlineVideo({ id, name }: { id: string; name: string }) {
  const row = useLiveQuery(async () => {
    const r = await db.bookFiles.get(id)
    return r && r.deletedAt === null && PLAYABLE.test(r.mime)
      ? { data: r.data, mime: r.mime }
      : null
  }, [id])
  const url = useMemo(
    () =>
      row ? URL.createObjectURL(new Blob([row.data], { type: row.mime })) : '',
    [row],
  )
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url])
  if (!url) return null
  return (
    <video
      src={url}
      controls
      preload="metadata"
      aria-label={name}
      data-file-video
      className="w-full rounded-lg bg-black"
    />
  )
}
