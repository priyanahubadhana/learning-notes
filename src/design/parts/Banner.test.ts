// @vitest-environment jsdom
import { act, createElement as h } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BannerHost } from './Banner'
import { createBannerQueue } from './bannerQueue'
import { $, $$, byLabel, cleanDom, click, mount } from './testHelpers'

afterEach(cleanDom)

const item = (id: string, text = id) => ({
  id,
  kind: 'backup' as const,
  text,
})

describe('createBannerQueue', () => {
  it('shows one at a time; a newer one queues', () => {
    const q = createBannerQueue()
    q.push(item('a'))
    q.push(item('b'))
    expect(q.current()?.id).toBe('a')
    expect(q.waiting()).toBe(1)
    q.dismiss('a')
    expect(q.current()?.id).toBe('b')
    expect(q.waiting()).toBe(0)
  })

  it('does not queue the same id twice', () => {
    const q = createBannerQueue()
    q.push(item('a'))
    q.push(item('a'))
    expect(q.waiting()).toBe(0)
  })
})

describe('BannerHost', () => {
  it('shows text, one action and a close button; close shows the next', () => {
    const q = createBannerQueue()
    const run = vi.fn()
    q.push({ ...item('a', 'First'), action: { label: 'Open', run } })
    q.push(item('b', 'Second'))
    mount(h(BannerHost, { queue: q }))
    expect($$('[data-testid="fb-banner"]')).toHaveLength(1)
    expect($('.fb-banner__text')?.textContent).toBe('First')
    expect($('[data-testid="fb-banner-more"]')?.textContent).toBe('+1')
    click($('[data-testid="fb-banner-action"]'))
    expect(run).toHaveBeenCalledTimes(1)
    click(byLabel('Dismiss notice'))
    expect($('.fb-banner__text')?.textContent).toBe('Second')
    expect($('[data-testid="fb-banner-action"]')).toBeNull()
    click(byLabel('Dismiss notice'))
    expect($('[data-testid="fb-banner"]')).toBeNull()
  })

  it('shows a banner pushed later', () => {
    const q = createBannerQueue()
    mount(h(BannerHost, { queue: q }))
    expect($('[data-testid="fb-banner"]')).toBeNull()
    act(() => q.push(item('a', 'Hello')))
    expect($('.fb-banner__text')?.textContent).toBe('Hello')
  })
})
