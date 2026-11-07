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
/** Retries after a busy or rate-limited answer or a dropped connection. */
const RETRIES = 2
const retryable = (e: AiError) =>
  e.status === undefined
    ? e.message === 'no connection'
    : e.status === 429 || e.status >= 500
const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

async function post(
  call: AiCall,
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<unknown> {
  const sleep = call.sleep ?? realSleep
  for (let attempt = 0; ; attempt++) {
    try {
      return await postOnce(call, url, headers, body)
    } catch (e) {
      const err = e as AiError
      if (attempt >= RETRIES || call.signal?.aborted || !retryable(err)) throw e
      // About 1 s, then 3 s.
      await sleep(1000 * 3 ** attempt + Math.random() * 250)
    }
  }
}

/** The user content: pictures first, then the words. */
function anthropicContent(call: AiCall): unknown {
  if (!call.images?.length) return call.prompt
  return [
    ...call.images.map((i) => ({
      type: 'image',
      source: { type: 'base64', media_type: i.mediaType, data: i.data },
    })),
    { type: 'text', text: call.prompt },
  ]
}

function openaiContent(call: AiCall): unknown {
  if (!call.images?.length) return call.prompt
  return [
    ...call.images.map((i) => ({
      type: 'image_url',
      image_url: { url: `data:${i.mediaType};base64,${i.data}` },
    })),
    { type: 'text', text: call.prompt },
  ]
}

async function postOnce(
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
      messages: [{ role: 'user', content: anthropicContent(call) }],
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
      messages: [{ role: 'user', content: openaiContent(call) }],
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
