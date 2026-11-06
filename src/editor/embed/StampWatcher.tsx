import { useEffect } from 'react'
import { hasStamps, takeStamp } from './embedClock'

/** The bit of the editor this needs. */
interface StampEditor {
  onChange: (callback: () => void) => unknown
  document: readonly Node[]
  updateBlock: (block: unknown, update: unknown) => unknown
}

interface Node {
  type: string
  props?: Record<string, unknown>
  children?: readonly Node[]
}

/**
 * Gives a picture added while a video was playing its caption ("▶ 12:34").
 * The picture arrives through the editor's own paste and upload, which know
 * nothing of videos, so the time is noted when the file is saved (see
 * `stampPicture`) and written onto the new picture block right after.
 * Renders nothing.
 */
export function StampWatcher({ editor }: { editor: unknown }) {
  useEffect(() => {
    const ed = editor as StampEditor
    const apply = () => {
      if (!hasStamps()) return
      const visit = (nodes: readonly Node[]) => {
        for (const block of nodes) {
          if (block.type === 'image' && typeof block.props?.url === 'string') {
            const caption = block.props.caption
            if (caption === '' || caption === undefined) {
              const label = takeStamp(block.props.url)
              if (label) ed.updateBlock(block, { props: { caption: label } })
            }
          }
          if (block.children) visit(block.children)
        }
      }
      visit(ed.document)
    }
    const off = ed.onChange(apply)
    return () => {
      if (typeof off === 'function') off()
    }
  }, [editor])
  return null
}
