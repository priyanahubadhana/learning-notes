/** Which line About shows while a new version waits; it must match the screen. */
export type AboutReady = 'updating' | 'notice' | 'closed' | 'auto'

export function aboutReady(s: {
  auto: boolean
  phase: string
  dismissed: boolean
}): AboutReady {
  // The restart has begun: nothing to tap.
  if (s.phase === 'updating') return 'updating'
  // The top notice was closed: the button in About is the way.
  if (s.dismissed) return 'closed'
  // Automatic: it waits for a quiet moment (or for the question), and About
  // has its own button, so never promise a restart that may not come.
  if (s.auto) return 'auto'
  return 'notice'
}
