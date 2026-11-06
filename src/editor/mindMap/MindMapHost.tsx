import { useContext } from 'react'
import { AppUiContext } from '../../app/appUi'
import { db } from '../../core/db'
import { imageRef } from '../../images/imageRef'
import { saveImage } from '../../images/imageService'
import { t } from '../../i18n/t'
import { MindMapView } from './MindMapView'

/** Just what the view needs from the editor and block (keeps types simple). */
export interface Host {
  isEditable: boolean
  updateBlock: (block: unknown, update: unknown) => unknown
  insertBlocks: (blocks: unknown[], ref: unknown, placement: 'after') => unknown
}

/** Connects the mind map view to the editor: saving, and "Save as picture". */
export function MindMapHost({
  block,
  editor,
}: {
  block: { props: { data: string; theme: string } }
  editor: Host
}) {
  const { toast } = useContext(AppUiContext)
  return (
    <MindMapView
      data={block.props.data}
      theme={block.props.theme}
      editable={editor.isEditable}
      onChange={(next) =>
        editor.updateBlock(block, {
          props: { data: next.data, theme: next.theme },
        })
      }
      onPicture={(png) => {
        void saveImage(db, png)
          .then((saved) => {
            editor.insertBlocks(
              [{ type: 'image', props: { url: imageRef(saved.id) } }],
              block,
              'after',
            )
            toast(t('mm.pictureAdded'))
          })
          .catch(() => toast(t('mm.pictureFailed')))
      }}
    />
  )
}
