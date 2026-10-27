import { useEffect, useState } from 'react'
import { db } from '../core/db'
import { parseImageRef } from './imageRef'
import { imageObjectUrl } from './imageService'

/**
 * A picture reference ("lnimg:…") as something an <img> can show: its
 * object URL once loaded, null while loading or when missing. Plain web
 * addresses are returned as they are.
 */
export function useImageUrl(source: string | null): string | null {
  const id = source ? parseImageRef(source) : null
  const [loaded, setLoaded] = useState<{ id: string; url: string | null }>()
  useEffect(() => {
    if (!id) return
    let current = true
    imageObjectUrl(db, id).then(
      (url) => current && setLoaded({ id, url }),
      () => current && setLoaded({ id, url: null }),
    )
    return () => {
      current = false
    }
  }, [id])
  if (!source) return null
  if (!id) return source
  return loaded?.id === id ? loaded.url : null
}
