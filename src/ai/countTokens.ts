import { readPref } from '../app/uiPrefs'
import type { LearningNotesDB } from '../core/db'
import { aiLockedBlock } from './aiLock'
import { getKeyById } from './keyStore'
import { PROVIDERS, estimateTokens } from './provider'
import { AI_KEYS, type AiConfig } from './route'
import { logSend } from './sendLog'
import { othersSpent, readKeyUsage } from './usage'

/**
 * The true token count for a preview (docs/features/ai.md, "Cost additions").
 * Claude offers a free count call; the others do not, so they get the
 * 4-characters-a-token guess. The count call sends note text, so it obeys
 * every rule of a real call: AI on, a key present, the notebook's Allow AI
 * switch, locked pages never sent, and a row in the send log (no text, no key).
 * Offline or a failed call gives the guess, marked `estimated`.
 */

export interface TokenCount {
  tokens: number
  /** True when the number is the 4-characters-a-token guess. */
  estimated: boolean
}

export interface CountRequest {
  /** Exactly what the real call would send (cached part first). */
  text: string
  notebookId?: string
  /** The notebook's Allow AI switch. */
  allowedHere: boolean
  /** A locked page or notebook that does not allow AI while locked. */
  lockedBlocked?: boolean
  /** Alternatively, the page the text comes from; checked here. */
  where?: { db: LearningNotesDB; pageId: string }
  fetchImpl?: typeof fetch
  signal?: AbortSignal
}

const TIMEOUT_MS = 8_000

export async function countPromptTokens(
  config: AiConfig,
  req: CountRequest,
): Promise<TokenCount> {
  const guess: TokenCount = {
    tokens: estimateTokens(req.text),
    estimated: true,
  }
  const head = config.candidates[0]
  const key = head ? getKeyById(head.keyId) : undefined
  if (
    !config.enabled ||
    !readPref(
      AI_KEYS.enabled,
      (v): v is boolean => typeof v === 'boolean',
      false,
    ) ||
    !key ||
    !req.allowedHere ||
    req.lockedBlocked ||
    key.provider !== 'anthropic' ||
    (typeof navigator !== 'undefined' && navigator.onLine === false)
  ) {
    return guess
  }
  // A key already at its monthly limit (or set to 0) sends nothing, not even a count.
  const cap = key.capUsd ?? config.capUsd
  if (readKeyUsage(key.id).costUsd + othersSpent(key.id) >= cap) return guess
  if (req.where && (await aiLockedBlock(req.where.db, req.where.pageId))) {
    return guess
  }
  const timeout = new AbortController()
  const timer = setTimeout(() => timeout.abort(), TIMEOUT_MS)
  req.signal?.addEventListener('abort', () => timeout.abort())
  try {
    const res = await (req.fetchImpl ?? fetch)(
      'https://api.anthropic.com/v1/messages/count_tokens',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key.key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: head.model,
          messages: [{ role: 'user', content: req.text }],
        }),
        signal: timeout.signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      },
    )
    if (!res.ok) return guess
    const n = ((await res.json()) as { input_tokens?: unknown }).input_tokens
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return guess
    logSend({
      at: Date.now(),
      notebookId: req.notebookId,
      feature: 'countTokens',
      host: PROVIDERS.anthropic.host,
      keyId: key.id,
      model: head.model,
      inputTokens: n,
      outputTokens: 0,
      costUsd: 0,
    })
    return { tokens: n, estimated: false }
  } catch {
    return guess
  } finally {
    clearTimeout(timer)
  }
}
