import { useContext, useEffect, useState } from 'react'
import { AppUiContext } from '../app/appUi'
import { db } from '../core/db'
import { t } from '../i18n/t'
import { CropSheet, type SheetResult } from './CropSheet'
import { renderEdit } from './editImage'
import { imageRef } from './imageRef'
import { originalOf, saveEditedImage } from './imageService'
import {
  blockImageId,
  closePictureEditor as close,
  usePictureRequest,
  type PictureRequest as Request,
} from './pictureEditorStore'

/** Runs the editor sheet for the requested picture (render once per page). */
export function PictureEditorHost() {
  const request = usePictureRequest()
  if (!request) return null
  return <Session key={request.blockId} request={request} />
}

function Session({ request }: { request: Request }) {
  const { editor, blockId } = request
  const { toast } = useContext(AppUiContext)
  const imageId = blockImageId(editor, blockId)
  const [loaded, setLoaded] = useState<{
    bitmap: ImageBitmap
    original: string | null
  } | null>(null)

  useEffect(() => {
    if (!imageId) {
      toast(t('pic.notEditable'))
      close()
      return
    }
    let live = true
    void (async () => {
      try {
        const row = await db.images.get(imageId)
        if (!row || row.deletedAt !== null) throw new Error('missing')
        const bitmap = await createImageBitmap(
          new Blob([row.data], { type: row.type }),
        )
        const original = await originalOf(db, imageId)
        if (live) setLoaded({ bitmap, original })
        else bitmap.close()
      } catch {
        if (live) {
          toast(t('pic.failed'))
          close()
        }
      }
    })()
    return () => {
      live = false
    }
  }, [imageId, toast])

  if (!imageId || !loaded) return null

  const done = async (result: SheetResult | null) => {
    try {
      if (result?.action === 'restore' && loaded.original) {
        editor.updateBlock(blockId, {
          props: { url: imageRef(loaded.original) },
        })
        toast(t('pic.restored'))
      } else if (result && result.action !== 'restore') {
        const out = await renderEdit(loaded.bitmap, result.edit)
        const saved = await saveEditedImage(db, imageId, {
          data: await out.blob.arrayBuffer(),
          type: out.blob.type || 'image/webp',
          width: out.width,
          height: out.height,
        })
        if (result.action === 'save') {
          editor.updateBlock(blockId, { props: { url: imageRef(saved.id) } })
          toast(t('pic.saved'))
        } else {
          editor.insertBlocks(
            [{ type: 'image', props: { url: imageRef(saved.id) } }],
            blockId,
            'after',
          )
          toast(t('pic.cutOutDone'))
        }
      }
    } catch {
      toast(t('pic.failed'))
    } finally {
      loaded.bitmap.close()
      close()
    }
  }

  return (
    <CropSheet
      bitmap={loaded.bitmap}
      canRestore={!!loaded.original}
      onDone={(r) => void done(r)}
    />
  )
}
