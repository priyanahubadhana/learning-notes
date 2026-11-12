import { useEffect, useState } from 'react'
import { db } from '../core/db'
import { useFlag } from '../app/flags'
import { parseImageRef } from './imageRef'
import { imageObjectUrl } from './imageService'
import { isApproved, isRemoteUrl } from './remoteImages'

/**
 * A picture reference ("lnimg:…") as something an <img> can show: its
 * object URL once loaded, null while loading or when missing. Plain web
 * addresses are returned as they are, except with `security.m1` on: a web
 * address the person has not allowed gives null (nothing is fetched; show a
 * RemotePictureCard instead).
 */
export function useImageUrl(source: string | null): string | null {
  const m1 = useFlag('security.m1')
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
  if (!id)
    return m1 && isRemoteUrl(source) && !isApproved(source) ? null : source
  return loaded?.id === id ? loaded.url : null
}
