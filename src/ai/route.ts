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
import { formatAmount, toCurrency } from './costCurrency'
import { costOf, isCap, recordUsage, withinCap, worstCost } from './usage'

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

/**
 * A single call whose worst case costs more than this (US dollars) never goes
 * out unless the screen showed that cost first and passed it as
 * `approvedUsd`. Cheap one-tap actions stay one tap.
 */
export const AUTO_OK_USD = 0.1

/** Errors another key or model could get past: refused, no credit, busy, offline. */
function canFallBack(e: AiError): boolean {
  // A timeout may already be billed: asking another model would pay twice.
  if (e.maybeBilled) return false
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
   * The worst-case cost (US dollars) the screen showed the person before the
   * run. A call that could cost more than `AUTO_OK_USD` and more than this
   * is refused, so no costly call can start unseen.
   */
  approvedUsd?: number
  /**
   * The page the words or picture come from. With it, `callAi` refuses a
   * locked page (or notebook) unless the notebook allows AI while locked.
   */
  where?: { db: LearningNotesDB; pageId: string }
}

/** Dollars each key may still have to pay for calls that have not finished. */
const reserved = new Map<string, number>()
/** Identical requests running now share one call (a double tap pays once). */
const running = new Map<string, Promise<AiResult & { stopped?: boolean }>>()
const testing = new Map<
  string,
  Promise<{ ok: true } | { ok: false; reason: string }>
>()

function hashText(text: string): string {
  let h = 5381
  for (let i = 0; i < text.length; i++) {
    h = ((h * 33) ^ text.charCodeAt(i)) >>> 0
  }
  return h.toString(36)
}

/** The same words, pictures, limit and choices give the same fingerprint. */
function fingerprint(config: AiConfig, req: AiRequest): string {
  return hashText(
    JSON.stringify([
      config.candidates,
      req.prompt,
      req.cachePrefix ?? '',
      req.maxTokens,
      (req.images ?? []).map((i) => [
        i.width,
        i.height,
        i.data.length,
        i.data.slice(0, 64),
        i.data.slice(-64),
      ]),
      req.log?.feature,
    ]),
  )
}

/** Runs `fn` unless the very same request is already running: then it shares that one. */
function once<T>(
  id: string,
  map: Map<string, Promise<T>>,
  fn: () => Promise<T>,
): Promise<T> {
  const live = map.get(id)
  if (live) return live
  const p = fn().finally(() => map.delete(id))
  map.set(id, p)
  return p
}

/**
 * One request with every check: AI is on (read live, so a switch turned off
 * a moment ago holds), the key's monthly cap before the call (counting calls
 * still running and the same key's use on other devices), the cost shown for
 * a costly call, the usage recorded after it. A key that fails (or is at its
 * cap) is skipped and the next choice is tried; a refused request (400)
 * stops at once. An identical request already running is shared, not paid
 * for twice.
 */
export function callAi(
  config: AiConfig,
  req: AiRequest,
): Promise<AiResult & { stopped?: boolean }> {
  if (!config.enabled || !readPref(AI_KEYS.enabled, isBool, false)) {
    return Promise.reject(new AiError(t('ai.notReady')))
  }
  return once(fingerprint(config, req), running, () => callAiOnce(config, req))
}

async function callAiOnce(
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
    // The switch is read again here: it may have been turned off while the
    // lock check above or an earlier choice was running.
    if (!readPref(AI_KEYS.enabled, isBool, false)) {
      throw new AiError(t('ai.notReady'))
    }
    const cap = key.capUsd ?? config.capUsd
    const all = (req.cachePrefix ?? '') + req.prompt
    const worst = worstCost(
      key.provider,
      c.model,
      all,
      req.maxTokens,
      req.images,
    )
    if (worst > Math.max(AUTO_OK_USD, (req.approvedUsd ?? 0) * 1.1 + 0.001)) {
      last = new AiError(
        t('ai.needsApproval', { amount: formatAmount(toCurrency(worst)) }),
      )
      continue
    }
    if (
      !withinCap(
        key.id,
        key.provider,
        c.model,
        all,
        req.maxTokens,
        cap,
        new Date(),
        req.images,
        reserved.get(key.id) ?? 0,
      )
    ) {
      last = new AiError(t('ai.capReached'))
      failed.add(key.id)
      continue
    }
    // No await between the cap check and this line: the reservation makes a
    // second call started at the same moment count this one.
    reserved.set(key.id, (reserved.get(key.id) ?? 0) + worst)
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
        undefined,
        result.cachedTokens,
      )
      logSend({
        at: Date.now(),
        notebookId: req.log?.notebookId,
        feature: req.log?.feature ?? 'other',
        host: PROVIDERS[key.provider].host,
        keyId: key.id,
        model: c.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd: costOf(
          key.provider,
          c.model,
          result.inputTokens,
          result.outputTokens,
          result.cachedTokens,
        ),
      })
      return result
    } catch (e) {
      if (e instanceof AiError && e.maybeBilled) {
        // No answer came, but their side may have counted the words we sent.
        recordUsage(key.id, key.provider, c.model, Math.ceil(all.length / 4), 0)
      }
      // Once part of an answer has been shown, another key is not tried.
      if (streamed || !(e instanceof AiError) || !canFallBack(e)) throw e
      last = e
      failed.add(key.id)
    } finally {
      const left = (reserved.get(key.id) ?? 0) - worst
      if (left > 1e-12) reserved.set(key.id, left)
      else reserved.delete(key.id)
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
  return once(`test:${keyId}`, testing, () => runTest(key, model, fetchImpl))
}

const TEST_PROMPT = 'Reply with the word OK.'

async function runTest(
  key: AiKey,
  model: string,
  fetchImpl?: typeof fetch,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  // A test is a real (tiny) call: the cap holds for it too.
  const cap = key.capUsd ?? readPref(AI_KEYS.cap, isCap, DEFAULT_CAP_USD)
  const held = reserved.get(key.id) ?? 0
  if (
    !withinCap(
      key.id,
      key.provider,
      model,
      TEST_PROMPT,
      64,
      cap,
      new Date(),
      [],
      held,
    )
  ) {
    return { ok: false, reason: t('ai.capReached') }
  }
  try {
    const r = await complete({
      provider: key.provider,
      key: key.key,
      model,
      prompt: TEST_PROMPT,
      maxTokens: 64,
      fetchImpl,
      sleep: async () => {},
    })
    recordUsage(
      key.id,
      key.provider,
      model,
      r.inputTokens,
      r.outputTokens,
      undefined,
      r.cachedTokens,
    )
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: e instanceof AiError ? e.message : 'error' }
  }
}
