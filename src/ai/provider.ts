/**
 * Bring your own AI (CR4). The user's own key calls the provider straight from
 * the browser: no server of ours, nothing stored on a server, the user's
 * account pays. A provider is a plain function from a prompt to text; the
 * rest of the app only sees the ln-notes/1 format (docs/features/
 * ai-notes-format.md), so the AI side is swappable.
 */

export type ProviderId = 'anthropic' | 'openai' | 'gemini'

export interface ProviderInfo {
  id: ProviderId
  /** Host the CSP `connect-src` allows (https://<host>). */
  host: string
  /** Base address for OpenAI-style providers. */
  base?: string
  defaultModel: string
  /** Estimated US dollars per million tokens (input, output). */
  price: { in: number; out: number }
}

/** The providers the app can call. Only these hosts are in `connect-src`. */
export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  anthropic: {
    id: 'anthropic',
    host: 'api.anthropic.com',
    defaultModel: 'claude-haiku-5-5',
    // Prices checked 2026-11-06 (up to 100K tokens per prompt). Another model
    // can be typed in Settings, e.g. claude-sonnet-5-5 ($2 / $10).
    price: { in: 0.1, out: 0.5 },
  },
  openai: {
    id: 'openai',
    host: 'api.openai.com',
    base: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini', // still listed; takes max_tokens, unlike the gpt-5 family
    price: { in: 0.15, out: 0.6 }, // checked 2026-11-06
  },
  gemini: {
    id: 'gemini',
    host: 'generativelanguage.googleapis.com',
    base: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-3.5-flash-lite',
    price: { in: 0.3, out: 2.5 }, // checked 2026-11-06
  },
}

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[]
export const isProviderId = (v: unknown): v is ProviderId =>
  typeof v === 'string' && v in PROVIDERS

/** What a call needs. The key is passed in and never logged. */
export interface AiCall {
  provider: ProviderId
  key: string
  model: string
  prompt: string
  maxTokens: number
  fetchImpl?: typeof fetch
  signal?: AbortSignal
}

export interface AiResult {
  text: string
  inputTokens: number
  outputTokens: number
}

/** A failure with a plain reason (never contains the key). */
export class AiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

/** A short reason for an HTTP status. */
export function reasonFor(status: number): string {
  if (status === 401 || status === 403) return 'the key was refused'
  if (status === 429) return 'too many requests or no credit left'
  if (status === 400) return 'the request was refused'
  if (status >= 500) return 'the service is busy'
  return `error ${status}`
}

/** Rough token count of a text (4 characters a token). */
export const estimateTokens = (text: string): number =>
  Math.ceil(text.length / 4)
