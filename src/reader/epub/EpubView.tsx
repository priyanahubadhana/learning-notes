import type { Annotation } from '../../core/types'
import { t } from '../../i18n/t'
import type { ReaderSelection } from '../BookReader'
import type { OutlineItem } from '../pdf/PdfView'

export interface EpubViewProps {
  data: ArrayBuffer
  startAt?: string
  annotations: readonly Annotation[]
  target?: { at: string; nonce: number; glow?: string } | null
  onOutline: (items: (OutlineItem & { at?: string })[]) => void
  onPosition: (pos: {
    progress: number
    locator: string
    label: string
  }) => void
  onSelection: (sel: ReaderSelection | null) => void
  onFailed: () => void
}

/** The EPUB reader (C3). */
export function EpubView(props: EpubViewProps) {
  void props
  return <p className="p-6 text-muted">{t('bookreader.failed')}</p>
}
