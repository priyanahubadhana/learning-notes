/**
 * @vitest-environment jsdom
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { writePref } from '../app/uiPrefs'
import {
  addKey,
  deleteKey,
  getKeyById,
  listKeys,
  maskKey,
  renameKey,
  replaceKey,
  setKeyCap,
} from './keyStore'
import { MODELS, moveItem, orderedModels } from './models'
import {
  AI_KEYS,
  buildCandidates,
  callAi,
  forNotebook,
  readAiConfig,
  testKey,
} from './route'
import { readKeyUsage, readUsage } from './usage'

beforeEach(() => localStorage.clear())

const noWait = async () => {}
/** Answers per host: anthropic by `a`, gemini by `g`. */
function byHost(a: number, g: number) {
  const urls: string[] = []
  const fn = (async (url: string) => {
    urls.push(url)
    const status = url.includes('anthropic') ? a : g
    const body = url.includes('anthropic')
      ? { content: [{ type: 'text', text: 'from claude' }], usage: {} }
      : { choices: [{ message: { content: 'from gemini' } }], usage: {} }
    return new Response(JSON.stringify(body), { status })
  }) as unknown as typeof fetch
  return { fn, urls }
}

describe('several named keys', () => {
  it('adds, renames, replaces and deletes keys; many per provider', () => {
    const a = addKey('anthropic', 'Claude main', 'sk-ant-aaaaaaaa1111')!
    const b = addKey('anthropic', 'Claude work', 'sk-ant-bbbbbbbb2222')!
    const g = addKey('gemini', 'Gemini free', 'AIzaCCCCCCCC3333')!
    expect(listKeys().map((k) => k.name)).toEqual([
      'Claude main',
      'Claude work',
      'Gemini free',
    ])
    expect(renameKey(a.id, '  Claude home ')).toBe(true)
    expect(renameKey(a.id, '   ')).toBe(false)
    expect(getKeyById(a.id)?.name).toBe('Claude home')
    expect(replaceKey(b.id, 'sk-ant-new-key-9999')).toBe(true)
    expect(replaceKey(b.id, 'short')).toBe(false)
    expect(getKeyById(b.id)?.key).toBe('sk-ant-new-key-9999')
    expect(getKeyById(b.id)?.name).toBe('Claude work')
    expect(addKey('openai', 'x', 'has a space in it')).toBeNull()
    expect(maskKey(g.key)).toBe('AIz…3333')
    deleteKey(b.id)
    expect(listKeys().map((k) => k.id)).toEqual([a.id, g.id])
    expect(setKeyCap(a.id, 3)).toBe(true)
    expect(getKeyById(a.id)?.capUsd).toBe(3)
    setKeyCap(a.id, undefined)
    expect(getKeyById(a.id)?.capUsd).toBeUndefined()
  })

  it('moves a key saved by the one-key version in, once', () => {
    localStorage.setItem('learning-notes:ai.key.anthropic', 'sk-ant-old-12345')
    const first = listKeys()
    expect(first).toHaveLength(1)
    expect(first[0].name).toBe('Claude')
    expect(localStorage.getItem('learning-notes:ai.key.anthropic')).toBeNull()
    expect(listKeys()).toHaveLength(1)
  })

  it('keys live only in localStorage: no backup or sync code touches them', () => {
    addKey('anthropic', 'k', 'sk-ant-secret-0000')
    const raw = Object.keys(localStorage).filter((k) => k.includes('ai.key'))
    expect(raw).toEqual(['learning-notes:ai.keys'])
    const bad: string[] = []
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f)
        if (statSync(p).isDirectory()) walk(p)
        else if (/\.tsx?$/.test(f) && !/\.test\./.test(f)) {
          const text = readFileSync(p, 'utf8')
          // A parameter named forgetKey in sync is a sign-out flag, not the store.
          if (/ai\/keyStore|ai\.keys|learning-notes:ai\./.test(text)) {
            bad.push(p)
          }
          // The one allowed bridge (R6-2): sync starts the encrypted key
          // mirror `ai/keySync.ts`, which alone reads the store; nothing in
          // share/ (backups) may import it.
          if (
            /ai\/keySync/.test(text) &&
            p !== join('src/sync', 'syncService.ts')
          ) {
            bad.push(`${p} (keySync allowed only from sync/syncService.ts)`)
          }
        }
      }
    }
    for (const d of ['src/share', 'src/sync', 'src/core']) walk(d)
    expect(bad).toEqual([])
  })
})

describe('model order and fallback', () => {
  it('uses the saved order, drops unknown ids, appends new models', () => {
    const ids = MODELS.map((m) => m.id)
    const out = orderedModels(['gpt-4o-mini', 'nope', ids[0]]).map((m) => m.id)
    expect(out.slice(0, 2)).toEqual(['gpt-4o-mini', ids[0]])
    expect(out).toHaveLength(MODELS.length)
    expect(new Set(out).size).toBe(MODELS.length)
    expect(moveItem([1, 2, 3], 2, 0)).toEqual([3, 1, 2])
    expect(moveItem([1, 2, 3], 0, 9)).toEqual([2, 3, 1])
  })

  it('first model with a key is the default; the rest follow the order', () => {
    addKey('anthropic', 'Claude main', 'sk-ant-aaaaaaaa1111')
    const g = addKey('gemini', 'Gemini free', 'AIzaCCCCCCCC3333')!
    writePref(AI_KEYS.enabled, true)
    writePref(AI_KEYS.order, ['gemini-3.1-flash-lite', 'claude-haiku-5-5'])
    const c = readAiConfig()
    expect(c.candidates[0]).toEqual({
      keyId: g.id,
      model: 'gemini-3.1-flash-lite',
    })
    expect(c.candidates[1].model).toBe('claude-haiku-5-5')
    expect(c.provider).toBe('gemini')
    // No OpenAI key: no OpenAI model is offered.
    expect(c.candidates.some((x) => x.model.startsWith('gpt'))).toBe(false)
  })

  it('a model can name which key serves it', () => {
    const a = addKey('anthropic', 'main', 'sk-ant-aaaaaaaa1111')!
    const b = addKey('anthropic', 'work', 'sk-ant-bbbbbbbb2222')!
    const list = buildCandidates([a, b], ['claude-sonnet-5-5'], {
      'claude-sonnet-5-5': b.id,
    })
    expect(list[0]).toEqual({ keyId: b.id, model: 'claude-sonnet-5-5' })
    expect(list.find((x) => x.model === 'claude-haiku-5-5')?.keyId).toBe(a.id)
  })

  it('falls back to the next key when one is refused', async () => {
    const a = addKey('anthropic', 'Claude', 'sk-ant-aaaaaaaa1111')!
    const g = addKey('gemini', 'Gemini', 'AIzaCCCCCCCC3333')!
    writePref(AI_KEYS.enabled, true)
    const { fn, urls } = byHost(401, 200)
    const r = await callAi(readAiConfig(), {
      prompt: 'hi',
      maxTokens: 10,
      fetchImpl: fn,
      sleep: noWait,
    })
    expect(r.text).toBe('from gemini')
    expect(urls[0]).toContain('anthropic')
    // The refused key is not tried again for its other models.
    expect(urls.filter((u) => u.includes('anthropic'))).toHaveLength(1)
    expect(readKeyUsage(g.id).inputTokens).toBe(0)
    expect(readKeyUsage(a.id).costUsd).toBe(0)
  })

  it('falls back when a key is at its cap, and charges the key that answered', async () => {
    const a = addKey('anthropic', 'Claude', 'sk-ant-aaaaaaaa1111')!
    const g = addKey('gemini', 'Gemini', 'AIzaCCCCCCCC3333')!
    setKeyCap(a.id, 0)
    writePref(AI_KEYS.enabled, true)
    const { fn, urls } = byHost(200, 200)
    const r = await callAi(readAiConfig(), {
      prompt: 'hi',
      maxTokens: 10,
      fetchImpl: fn,
    })
    expect(r.text).toBe('from gemini')
    expect(urls.every((u) => !u.includes('anthropic'))).toBe(true)
    expect(readUsage().costUsd).toBe(readKeyUsage(g.id).costUsd)
  })

  it('stops with the reason when every key fails, and on a refused request', async () => {
    addKey('anthropic', 'Claude', 'sk-ant-aaaaaaaa1111')
    addKey('gemini', 'Gemini', 'AIzaCCCCCCCC3333')
    writePref(AI_KEYS.enabled, true)
    const cfg = readAiConfig()
    await expect(
      callAi(cfg, {
        prompt: 'hi',
        maxTokens: 10,
        fetchImpl: byHost(401, 401).fn,
      }),
    ).rejects.toThrow(/refused/)
    const { fn, urls } = byHost(400, 200)
    await expect(
      callAi(cfg, { prompt: 'hi', maxTokens: 10, fetchImpl: fn }),
    ).rejects.toThrow()
    expect(urls).toHaveLength(1)
  })

  it('Test makes one tiny call and counts it for that key', async () => {
    const g = addKey('gemini', 'Gemini', 'AIzaCCCCCCCC3333')!
    const { fn, urls } = byHost(200, 200)
    expect(await testKey(g.id, fn)).toEqual({ ok: true })
    expect(urls).toHaveLength(1)
    const bad = await testKey(g.id, byHost(200, 401).fn)
    expect(bad.ok).toBe(false)
  })
})

describe('per-notebook choice', () => {
  it('uses the notebook choice only; falls back to the default when its key is gone', async () => {
    const a = addKey('anthropic', 'Claude', 'sk-ant-aaaaaaaa1111')!
    const g = addKey('gemini', 'Gemini free', 'AIzaCCCCCCCC3333')!
    writePref(AI_KEYS.enabled, true)
    writePref(AI_KEYS.order, ['gemini-3.5-flash-lite'])
    const base = readAiConfig()
    expect(base.candidates[0].keyId).toBe(g.id)

    const priv = forNotebook(base, {
      aiChoice: { keyId: a.id, model: 'claude-sonnet-5-5' },
    })
    expect(priv.candidates).toEqual([
      { keyId: a.id, model: 'claude-sonnet-5-5' },
    ])
    expect(priv.provider).toBe('anthropic')
    // The private notebook never falls back to the free Gemini key.
    const { fn, urls } = byHost(401, 200)
    await expect(
      callAi(priv, { prompt: 'hi', maxTokens: 10, fetchImpl: fn }),
    ).rejects.toThrow()
    expect(urls.every((u) => u.includes('anthropic'))).toBe(true)

    expect(forNotebook(base, undefined)).toBe(base)
    expect(forNotebook(base, {})).toBe(base)
    deleteKey(a.id)
    const gone = forNotebook(readAiConfig(), {
      aiChoice: { keyId: a.id, model: 'claude-sonnet-5-5' },
    })
    expect(gone.candidates[0].keyId).toBe(g.id)
    // A model that does not belong to the key's company is ignored too.
    const odd = forNotebook(readAiConfig(), {
      aiChoice: { keyId: g.id, model: 'claude-sonnet-5-5' },
    })
    expect(odd.candidates[0].model).toBe('gemini-3.5-flash-lite')
  })
})
