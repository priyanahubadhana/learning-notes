import { ScrollBar } from './ScrollBar'
import { useScrollTarget } from './scrollTarget'

/** Mounted once: the shared scroll bar on whichever list is being scrolled (every panel and list, F6). */
export function ScrollBarHost() {
  return <ScrollBar scroller={useScrollTarget()} auto />
}
