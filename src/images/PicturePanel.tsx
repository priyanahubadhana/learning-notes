import {
  FilePanel,
  useBlockNoteEditor,
  type FilePanelProps,
} from '@blocknote/react'
import { FilePanelExtension } from '@blocknote/core/extensions'
import { useContext, useEffect } from 'react'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import { db } from '../core/db'
import { openPictureChooser } from './pictureChooserStore'
import { placePicture, type PictureHost } from './placePicture'

/**
 * BlockNote's "Add image" panel is replaced by the same chooser as
 * Insert › Picture (Photos, Files, Camera, Paste); its upload/link tabs gave
 * the owner an empty block on iPad. Other media (video, audio) keep the
 * original panel.
 */
export function PicturePanel(props: FilePanelProps) {
  const editor = useBlockNoteEditor()
  const { toast } = useContext(AppUiContext)
  const isImage =
    (editor.getBlock(props.blockId) as { type?: string } | undefined)?.type ===
    'image'

  useEffect(() => {
    if (!isImage) return
    editor.getExtension(FilePanelExtension)?.closeMenu()
    openPictureChooser({
      owner: editor,
      blockId: props.blockId,
      onPick: (file, place) =>
        runTask(
          placePicture(
            db,
            editor as unknown as PictureHost,
            file,
            props.blockId,
            undefined,
            place,
          ).then((message) => message && toast(message)),
        ),
    })
  }, [isImage, editor, props.blockId, toast])

  return isImage ? null : <FilePanel {...props} />
}
