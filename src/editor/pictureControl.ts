import { memStore } from '../app/tools/store'

export type PictureAction =
  | 'copy'
  | 'cut'
  | 'duplicate'
  | 'delete'
  | 'smaller'
  | 'bigger'
  | 'fit'
  | 'natural'
  | 'cropRotate'
  | 'replace'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'handles'
  | 'deselect'

/** What the Picture strip can do with the selected picture. */
export interface PictureControl {
  run: (action: PictureAction) => void
  align: 'left' | 'center' | 'right'
  handles: boolean
  caption: string
  setCaption: (text: string) => void
}

/** The selected picture's controls (null when no picture is selected). */
export const pictureControl = memStore<PictureControl | null>(null)
