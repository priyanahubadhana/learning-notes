import { renderToString } from 'react-dom/server'
import { createElement as h, Suspense } from 'react'
import { describe, expect, it } from 'vitest'
import { lazyNow } from './lazyNow'

describe('lazyNow (R13: a preloaded lazy part draws at once, no Suspense wait)', () => {
  const load = () => Promise.resolve({ default: () => h('b', null, 'hello') })

  it('before preload it suspends like a lazy part (shows the fallback)', () => {
    const Part = lazyNow(load)
    const html = renderToString(
      h(Suspense, { fallback: h('i', null, 'wait') }, h(Part)),
    )
    expect(html).toContain('wait')
  })

  it('after preload it draws in the same render, with no fallback', async () => {
    const Part = lazyNow(load)
    await Part.preload()
    const html = renderToString(
      h(Suspense, { fallback: h('i', null, 'wait') }, h(Part)),
    )
    expect(html).toContain('hello')
    expect(html).not.toContain('wait')
  })

  it('preload is safe to call twice and returns the same promise', async () => {
    const Part = lazyNow(load)
    expect(Part.preload()).toBe(Part.preload())
    await Part.preload()
  })
  it('a failed fetch tries again on the next preload', async () => {
    let calls = 0
    const Part = lazyNow(() => {
      calls++
      return calls === 1
        ? Promise.reject(new Error('offline'))
        : Promise.resolve({ default: () => h('b', null, 'hello') })
    })
    await expect(Part.preload()).rejects.toThrow('offline')
    await Part.preload()
    expect(calls).toBe(2)
    expect(renderToString(h(Suspense, { fallback: null }, h(Part)))).toContain(
      'hello',
    )
  })
})
