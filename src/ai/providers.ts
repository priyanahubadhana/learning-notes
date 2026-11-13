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
  if (!call.images?.length && !call.cachePrefix) return call.prompt
  return [
    ...(call.images ?? []).map((i) => ({
      type: 'image',
      source: { type: 'base64', media_type: i.mediaType, data: i.data },
    })),
    // The long text first, marked for caching (prompt caching).
    ...(call.cachePrefix
      ? [
          {
            type: 'text',
            text: call.cachePrefix,
            cache_control: { type: 'ephemeral' },
          },
        ]
      : []),
    { type: 'text', text: call.prompt },
  ]
}

function openaiContent(call: AiCall): unknown {
  const text = (call.cachePrefix ?? '') + call.prompt
  if (!call.images?.length) return text
  return [
    ...call.images.map((i) => ({
      type: 'image_url',
      image_url: { url: `data:${i.mediaType};base64,${i.data}` },
    })),
    { type: 'text', text },
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
    // A timeout may still have been processed (and billed) on their side.
    if (timeout.signal.aborted) {
      throw new AiError('it took too long', undefined, true)
    }
    throw new AiError('no connection')
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
    usage?: {
      input_tokens?: number
      output_tokens?: number
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
  }
  const text = (data.content ?? [])
    .filter((c) => c.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text)
    .join('')
  if (!text) throw new AiError('the answer was empty')
  return {
    text,
    // Cached tokens are part of the input count; cache reads are priced
    // at the cached rate (see costOf).
    inputTokens:
      num(data.usage?.input_tokens) +
      num(data.usage?.cache_creation_input_tokens) +
      num(data.usage?.cache_read_input_tokens),
    outputTokens: num(data.usage?.output_tokens),
    cachedTokens: num(data.usage?.cache_read_input_tokens),
    ...(num(data.usage?.cache_creation_input_tokens) > 0 && {
      cacheWriteTokens: num(data.usage?.cache_creation_input_tokens),
    }),
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
    usage?: {
      prompt_tokens?: number
      completion_tokens?: number
      prompt_tokens_details?: { cached_tokens?: number }
    }
  }
  const text = data.choices?.[0]?.message?.content
  if (typeof text !== 'string' || !text) {
    throw new AiError('the answer was empty')
  }
  return {
    text,
    inputTokens: num(data.usage?.prompt_tokens),
    outputTokens: num(data.usage?.completion_tokens),
    cachedTokens: num(data.usage?.prompt_tokens_details?.cached_tokens),
  }
}

/** Calls the chosen provider. */
export function complete(call: AiCall): Promise<AiResult> {
  return call.provider === 'anthropic' ? anthropic(call) : openaiStyle(call)
}

// ---- Streaming (Phase P) ----

/** Reads the `data:` lines of a server-sent-events body, one JSON value each. */
async function* sseData(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<unknown> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let nl: number
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim()
        buf = buf.slice(nl + 1)
        if (!line.startsWith('data:')) continue
        const raw = line.slice(5).trim()
        if (!raw || raw === '[DONE]') continue
        try {
          yield JSON.parse(raw)
        } catch {
          // A broken line is skipped.
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

interface StreamEvent {
  type?: string
  delta?: { text?: string }
  message?: {
    usage?: {
      input_tokens?: number
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
  }
  usage?: {
    output_tokens?: number
    prompt_tokens?: number
    completion_tokens?: number
    prompt_tokens_details?: { cached_tokens?: number }
  }
  choices?: { delta?: { content?: string } }[]
}

/**
 * Streams the answer (Anthropic and the OpenAI-style SSE that Gemini also
 * speaks): `onText` gets each new piece. Stop (the signal) ends the stream
 * early and returns what came so far, marked `stopped`. Token counts come
 * from the stream; when it gives none (a stopped stream), they are estimated.
 */
export async function stream(
  call: AiCall,
  onText: (piece: string) => void,
): Promise<AiResult & { stopped: boolean }> {
  const doFetch = call.fetchImpl ?? fetch
  const anth = call.provider === 'anthropic'
  const url = anth
    ? 'https://api.anthropic.com/v1/messages'
    : `${PROVIDERS[call.provider].base}/chat/completions`
  const headers: Record<string, string> = anth
    ? {
        'x-api-key': call.key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      }
    : { authorization: `Bearer ${call.key}` }
  const messages = [
    {
      role: 'user',
      content: anth ? anthropicContent(call) : openaiContent(call),
    },
  ]
  const body = anth
    ? { model: call.model, max_tokens: call.maxTokens, stream: true, messages }
    : {
        model: call.model,
        max_tokens: call.maxTokens,
        stream: true,
        stream_options: { include_usage: true },
        messages,
      }
  const stoppedEarly = () => !!call.signal?.aborted
  let res: Response
  try {
    res = await doFetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: call.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    })
  } catch {
    if (stoppedEarly()) {
      return { text: '', inputTokens: 0, outputTokens: 0, stopped: true }
    }
    throw new AiError('no connection')
  }
  if (!res.ok) throw new AiError(reasonFor(res.status), res.status)
  if (!res.body) throw new AiError('the answer was empty')
  let text = ''
  let inputTokens = 0
  let outputTokens = 0
  let cachedTokens = 0
  let cacheWriteTokens = 0
  let cutOff = false
  try {
    for await (const ev of sseData(res.body)) {
      if (stoppedEarly()) break
      const e = ev as StreamEvent
      let piece = ''
      if (anth) {
        if (e.type === 'message_start') {
          const u = e.message?.usage
          inputTokens =
            num(u?.input_tokens) +
            num(u?.cache_creation_input_tokens) +
            num(u?.cache_read_input_tokens)
          cachedTokens = num(u?.cache_read_input_tokens)
          cacheWriteTokens = num(u?.cache_creation_input_tokens)
        } else if (e.type === 'content_block_delta') {
          piece = e.delta?.text ?? ''
        } else if (e.type === 'message_delta') {
          outputTokens = num(e.usage?.output_tokens) || outputTokens
        } else if (e.type === 'error') {
          throw new AiError(reasonFor(529), 529)
        }
      } else {
        piece = e.choices?.[0]?.delta?.content ?? ''
        if (e.usage) {
          inputTokens = num(e.usage.prompt_tokens) || inputTokens
          cachedTokens =
            num(e.usage.prompt_tokens_details?.cached_tokens) || cachedTokens
          outputTokens = num(e.usage.completion_tokens) || outputTokens
        }
      }
      if (piece) {
        text += piece
        onText(piece)
      }
    }
  } catch (e) {
    if (e instanceof AiError && !text) throw e
    // The connection dropped part way: the words that came were billed, so
    // they are kept and counted (marked stopped) instead of lost.
    if (!stoppedEarly() && !text) throw new AiError('no connection')
    cutOff = !stoppedEarly()
  }
  const stopped = stoppedEarly() || cutOff
  if (!text && !stopped) throw new AiError('the answer was empty')
  if (!inputTokens)
    inputTokens = Math.ceil(
      ((call.cachePrefix?.length ?? 0) + call.prompt.length) / 4,
    )
  if (!outputTokens) outputTokens = Math.ceil(text.length / 4)
  return {
    text,
    inputTokens,
    outputTokens,
    cachedTokens,
    ...(cacheWriteTokens > 0 && { cacheWriteTokens }),
    stopped,
  }
}
