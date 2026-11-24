import { BOTH_MIN_W, isPhone } from './columns'
import { useFrameSize } from './useFrameSize'

/**
 * SH-14: the two shell breakpoints (shell-spec 8). `phone` is under 640 wide
 * or under 512 high, `mid` has room for one column beside the page, `wide`
 * (1180 and up) has room for the sidebar and the pages panel together.
 */
export type Breakpoint = 'phone' | 'mid' | 'wide'

export function breakpointFor(width: number, height: number): Breakpoint {
  if (isPhone(width, height)) return 'phone'
  return width >= BOTH_MIN_W ? 'wide' : 'mid'
}

export function useBreakpoint(): Breakpoint {
  const { width, height } = useFrameSize()
  return breakpointFor(width, height)
}
