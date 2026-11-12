import type { ProviderId } from '../../ai/provider'

/** Claude first, then every other AI that has a saved key (SET-B25). */
export function aiListOrder(providers: ProviderId[]): string[] {
  const others = [...new Set(providers)].filter((p) => p !== 'anthropic')
  return ['claude', ...others]
}
