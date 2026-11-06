import {
  AiError,
  PROVIDERS,
  reasonFor,
  type AiCall,
  type AiResult,
} from './provider'

/**
 * Plain `fetch` calls (no SDK). Anthropic allows calls from a browser with the
 * `anthropic-dangerous-direct-browser-access` header; the user's own key is
 * the only secret and stays on this device.
 */

const TIMEOUT_MS = 90_000

async function post(
  call: AiCall,
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<unknown> {
  const doFetch = call.fetchImpl ?? fetch
  const timeout = new AbortController()
  const timer = setTimeout(() => timeout.abort(), TIMEOUT_MS)
  call.signal?.addEventListener('abort', () => timeout.abort())
  try {
    const res = await doFetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: timeout.signal,
      // Never send cookies or the page address to the provider.
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    })
    if (!res.ok) throw new AiError(reasonFor(res.status), res.status)
    return await res.json()
  } catch (e) {
    if (e instanceof AiError) throw e
    throw new AiError(
      timeout.signal.aborted ? 'it took too long' : 'no connection',
    )
  } finally {
    clearTimeout(timer)
  }
}

const num = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0

async function anthropic(call: AiCall): Promise<AiResult> {
  const data = (await post(
    call,
    'https://api.anthropic.com/v1/messages',
    {
      'x-api-key': call.key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    {
      model: call.model,
      max_tokens: call.maxTokens,
      messages: [{ role: 'user', content: call.prompt }],
    },
  )) as {
    content?: { type?: string; text?: string }[]
    usage?: { input_tokens?: number; output_tokens?: number }
  }
  const text = (data.content ?? [])
    .filter((c) => c.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text)
    .join('')
  if (!text) throw new AiError('the answer was empty')
  return {
    text,
    inputTokens: num(data.usage?.input_tokens),
    outputTokens: num(data.usage?.output_tokens),
  }
}

async function openaiStyle(call: AiCall): Promise<AiResult> {
  const base = PROVIDERS[call.provider].base
  if (!base) throw new AiError('no address for this provider')
  const data = (await post(
    call,
    `${base}/chat/completions`,
    { authorization: `Bearer ${call.key}` },
    {
      model: call.model,
      max_tokens: call.maxTokens,
      messages: [{ role: 'user', content: call.prompt }],
    },
  )) as {
    choices?: { message?: { content?: string } }[]
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }
  const text = data.choices?.[0]?.message?.content
  if (typeof text !== 'string' || !text) {
    throw new AiError('the answer was empty')
  }
  return {
    text,
    inputTokens: num(data.usage?.prompt_tokens),
    outputTokens: num(data.usage?.completion_tokens),
  }
}

/** Calls the chosen provider. */
export function complete(call: AiCall): Promise<AiResult> {
  return call.provider === 'anthropic' ? anthropic(call) : openaiStyle(call)
}
