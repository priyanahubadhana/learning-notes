import { readPref } from '../app/uiPrefs'
import type { LearningNotesDB } from '../core/db'
import { t } from '../i18n/t'
import { aiLockedBlock } from './aiLock'
import { getKeyById, listKeys, type AiKey } from './keyStore'
import { modelInfo, orderedModels } from './models'
import {
  AiError,
  PROVIDERS,
  isProviderId,
  type AiImage,
  type AiResult,
  type ProviderId,
} from './provider'
import { complete, stream } from './providers'
import { logSend } from './sendLog'
import { costOf, isCap, recordUsage, withinCap } from './usage'

/**
 * Which key and model a request uses, and what happens when one fails.
 * The global order (Settings › AI model cards) lists the models: the first
 * that has a key is the default and the rest are the fallback order. A
 * notebook can pick one key and model of its own; that notebook then uses
 * only that choice (no silent fallback to another company).
 */

export interface AiChoice {
  keyId: string
  model: string
}

export interface AiConfig {
  enabled: boolean
  /** Default monthly cap (a key can have its own). */
  capUsd: number
  /** Tried in this order; the first is the one used. */
  candidates: AiChoice[]
  /** Provider and model of the first candidate (for the privacy text). */
  provider: ProviderId
  model: string
}

const isBool = (v: unknown): v is boolean => typeof v === 'boolean'
const isStringList = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string')
const isStringMap = (v: unknown): v is Record<string, string> =>
  !!v &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  Object.values(v).every((x) => typeof x === 'string')

export const AI_KEYS = {
  enabled: 'ai.enabled',
  provider: 'ai.provider',
  model: 'ai.model',
  cap: 'ai.cap',
  privacy: 'ai.privacyOk',
  /** Model ids in the user's order (first = default). */
  order: 'ai.modelOrder',
  /** Model id -> key id, where a provider has more than one key. */
  keyFor: 'ai.modelKeys',
} as const

export const DEFAULT_CAP_USD = 5

/** The ordered key and model pairs a list of keys can serve. */
export function buildCandidates(
  keys: readonly AiKey[],
  order: readonly string[],
  keyFor: Readonly<Record<string, string>>,
): AiChoice[] {
  const out: AiChoice[] = []
  for (const m of orderedModels(order)) {
    const key =
      keys.find((k) => k.id === keyFor[m.id] && k.provider === m.provider) ??
      keys.find((k) => k.provider === m.provider)
    if (key) out.push({ keyId: key.id, model: m.id })
  }
  return out
}

function withHead(
  config: Omit<AiConfig, 'provider' | 'model'>,
  keys: readonly AiKey[],
): AiConfig {
  const head = config.candidates[0]
  const key = head && keys.find((k) => k.id === head.keyId)
  return {
    ...config,
    provider: key?.provider ?? 'anthropic',
    model: head?.model ?? PROVIDERS.anthropic.defaultModel,
  }
}

export function readAiConfig(): AiConfig {
  const keys = listKeys()
  return withHead(
    {
      enabled: readPref(AI_KEYS.enabled, isBool, false),
      capUsd: readPref(AI_KEYS.cap, isCap, DEFAULT_CAP_USD),
      candidates: buildCandidates(
        keys,
        readPref(AI_KEYS.order, isStringList, []),
        readPref(AI_KEYS.keyFor, isStringMap, {}),
      ),
    },
    keys,
  )
}

/** The notebook's own choice first; without one (or when its key is gone), the default. */
export function forNotebook(
  config: AiConfig,
  notebook: { aiChoice?: AiChoice } | undefined,
): AiConfig {
  const c = notebook?.aiChoice
  if (!c) return config
  const keys = listKeys()
  const key = keys.find((k) => k.id === c.keyId)
  const info = modelInfo(c.model)
  if (!key || !info || info.provider !== key.provider) return config
  return withHead({ ...config, candidates: [c] }, keys)
}

/** Errors another key or model could get past: refused, no credit, busy, offline. */
function canFallBack(e: AiError): boolean {
  return (
    e.status === undefined ||
    e.status === 401 ||
    e.status === 403 ||
    e.status === 429 ||
    e.status >= 500
  )
}

export interface AiRequest {
  prompt: string
  /** A long text sent first and cached by Claude (see AiCall.cachePrefix). */
  cachePrefix?: string
  maxTokens: number
  images?: AiImage[]
  fetchImpl?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  /** Streams the answer piece by piece (long answers, with Stop). */
  onText?: (piece: string) => void
  /** Stop: ends a streamed answer early (what came so far is kept). */
  signal?: AbortSignal
  /** For the "Everything AI sent" log (no content is logged). */
  log?: { notebookId?: string; feature: string }
  /**
   * The page the words or picture come from. With it, `callAi` refuses a
   * locked page (or notebook) unless the notebook allows AI while locked.
   */
  where?: { db: LearningNotesDB; pageId: string }
}

/**
 * One request with every check: the key's monthly cap before the call, the
 * usage recorded after it. A key that fails (or is at its cap) is skipped and
 * the next choice is tried; a refused request (400) stops at once.
 */
export async function callAi(
  config: AiConfig,
  req: AiRequest,
): Promise<AiResult & { stopped?: boolean }> {
  if (req.where && (await aiLockedBlock(req.where.db, req.where.pageId))) {
    throw new AiError(t('ai.lockedOff'))
  }
  const failed = new Set<string>()
  let streamed = false
  let last: AiError | undefined
  for (const c of config.candidates) {
    if (failed.has(c.keyId)) continue
    const key = getKeyById(c.keyId)
    if (!key) continue
    if (req.images?.length && modelInfo(c.model)?.vision === false) continue
    const cap = key.capUsd ?? config.capUsd
    if (
      !withinCap(
        key.id,
        key.provider,
        c.model,
        (req.cachePrefix ?? '') + req.prompt,
        req.maxTokens,
        cap,
        new Date(),
        req.images,
      )
    ) {
      last = new AiError(t('ai.capReached'))
      failed.add(key.id)
      continue
    }
    try {
      const call = {
        provider: key.provider,
        key: key.key,
        model: c.model,
        prompt: req.prompt,
        cachePrefix: req.cachePrefix,
        maxTokens: req.maxTokens,
        images: req.images,
        fetchImpl: req.fetchImpl,
        sleep: req.sleep,
        signal: req.signal,
      }
      const onText = req.onText
      const result = onText
        ? await stream(call, (piece) => {
            streamed = true
            onText(piece)
          })
        : await complete(call)
      recordUsage(
        key.id,
        key.provider,
        c.model,
        result.inputTokens,
        result.outputTokens,
      )
      {
        logSend({
          at: Date.now(),
          notebookId: req.log?.notebookId,
          feature: req.log?.feature ?? 'other',
          host: PROVIDERS[key.provider].host,
          costUsd: costOf(
            key.provider,
            c.model,
            result.inputTokens,
            result.outputTokens,
          ),
        })
      }
      return result
    } catch (e) {
      // Once part of an answer has been shown, another key is not tried.
      if (streamed || !(e instanceof AiError) || !canFallBack(e)) throw e
      last = e
      failed.add(key.id)
    }
  }
  throw last ?? new AiError(t('ai.notReady'))
}

/** A tiny call to see that a key works (a few tokens; counted in the usage). */
export async function testKey(
  keyId: string,
  fetchImpl?: typeof fetch,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const key = getKeyById(keyId)
  if (!key || !isProviderId(key.provider)) {
    return { ok: false, reason: t('ai.notReady') }
  }
  const model = PROVIDERS[key.provider].defaultModel
  try {
    const r = await complete({
      provider: key.provider,
      key: key.key,
      model,
      prompt: 'Reply with the word OK.',
      maxTokens: 64,
      fetchImpl,
      sleep: async () => {},
    })
    recordUsage(key.id, key.provider, model, r.inputTokens, r.outputTokens)
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: e instanceof AiError ? e.message : 'error' }
  }
}
