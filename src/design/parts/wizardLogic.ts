export type WizardStep = {
  id: string
  label: string
  state?: 'done' | 'error'
  /** Unlock id; the step is absent while it is locked. */
  pro?: string
}

/** Steps a person can see: a step with a locked `pro` id is left out and the numbers close up. */
export function visibleSteps(
  steps: readonly WizardStep[],
  unlocked: (proId: string) => boolean = () => false,
): WizardStep[] {
  return steps.filter((s) => !s.pro || unlocked(s.pro))
}

/** The same rule for the Tool frame's tools: a tool with a locked `pro` id is absent (S3-40). */
export function visibleTools<T extends { pro?: string }>(
  tools: readonly T[],
  unlocked: (proId: string) => boolean = () => false,
): T[] {
  return tools.filter((t) => !t.pro || unlocked(t.pro))
}

/**
 * Default rule (WS): any earlier step, the current one, and the next one only
 * when the current step is valid. Steps further ahead are never allowed.
 */
export function defaultCanGo(
  steps: readonly WizardStep[],
  value: string,
  id: string,
  currentValid: boolean,
): boolean {
  const cur = steps.findIndex((s) => s.id === value)
  const to = steps.findIndex((s) => s.id === id)
  if (cur < 0 || to < 0) return false
  if (to <= cur) return true
  return to === cur + 1 && currentValid
}

/** 0..1 for the progress line of the compact strip. */
export function wizardProgress(
  steps: readonly WizardStep[],
  value: string,
): number {
  const i = steps.findIndex((s) => s.id === value)
  if (i < 0 || steps.length === 0) return 0
  return (i + 1) / steps.length
}
