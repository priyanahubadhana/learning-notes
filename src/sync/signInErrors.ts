import type { MessageKey } from '../i18n/t'
import { AuthInputError, NotAllowedError, TryLaterError } from './connectors'

/** Plain words for a failed sign-in step. */
export function errorKey(e: unknown): MessageKey {
  if (e instanceof AuthInputError) return `signin.err.${e.kind}` as MessageKey
  if (e instanceof NotAllowedError) return 'signin.err.refused'
  if (e instanceof TryLaterError) return 'signin.err.later'
  return 'signin.err.failed'
}
