import { useFlag } from '../app/flags'
import { useBarSettings } from '../settings/deviceModeSettings'
import { readingView } from '../app/reading/readingState'
import { barRoomWanted, editorDecided } from './barRoomRule'
import { useBarLayout } from './useBarLayout'

/**
 * Keeps the tool bar's height in the bar slot from the first paint until the
 * page editor has drawn the bar, so the page below does not jump down when
 * the lazy parts arrive (F8). Hidden by CSS the moment the real bar is there
 * (see shell.css), and gone once the editor has decided (no bar = no blank).
 */
export function BarRoom({ pageRoute }: { pageRoute: boolean }) {
  const v8 = useFlag('toolbar.v8')
  const bar = useBarSettings()
  const layout = useBarLayout()
  const reading = readingView.useValue() !== 'off'
  const decided = editorDecided.useValue()
  if (
    decided ||
    !barRoomWanted({
      v8,
      pageRoute,
      placement: bar.placement,
      layout,
      autoHide: bar.autoHide,
      inReading: reading,
    })
  )
    return null
  return <div aria-hidden data-bar-room />
}
