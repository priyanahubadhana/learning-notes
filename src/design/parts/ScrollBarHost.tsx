import { useFlag } from '../../app/flags'
import { ScrollBar } from './ScrollBar'
import { useScrollTarget } from './scrollTarget'

/**
 * Mounted once (new app frame, flag foundation.shell): the shared scroll bar on
 * whichever list is being scrolled, so every panel and list has the same bar
 * (F6). With the flag off nothing is drawn and the old handle stays.
 */
export function ScrollBarHost() {
  const on = useFlag('foundation.shell')
  const target = useScrollTarget()
  return on ? <ScrollBar scroller={target} auto /> : null
}
