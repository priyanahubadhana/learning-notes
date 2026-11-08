/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { writePref } from '../app/uiPrefs'
import { AI_KEYS, readAiConfig } from './aiRun'
import { setKey } from './keyStore'
import type { AiImage } from './provider'
import { getReadPrompt, setReadPrompt } from './readPrompt'
import { runVision, visionPrompt } from './vision'

const IMG: AiImage = {
  mediaType: 'image/png',
  data: 'iVBORw0KGgo',
  width: 300,
  height: 150,
}

function once() {
  const bodies: string[] = []
  const fn = (async (_url: string, init: RequestInit) => {
    bodies.push(String(init.body))
    return new Response(
      JSON.stringify({
        content: [{ type: 'text', text: 'hello' }],
        usage: { input_tokens: 10, output_tokens: 2 },
      }),
    )
  }) as unknown as typeof fetch
  return { fn, bodies }
}

beforeEach(() => {
  localStorage.clear()
  writePref(AI_KEYS.enabled, true)
  setKey('anthropic', 'sk-ant-xxxxxxxx')
})

describe('saved prompt for reading handwriting', () => {
  it('is off by default, and the built-in prompt is sent', async () => {
    expect(getReadPrompt()).toBeNull()
    const { fn, bodies } = once()
    await runVision(readAiConfig(), 'handwriting', IMG, fn, async () => {})
    expect(bodies[0]).toContain(visionPrompt('handwriting').slice(0, 40))
  })

  it('sends the chosen prompt for handwriting, never for maths, until cleared', async () => {
    setReadPrompt({
      name: 'Tidy notes',
      text: 'Fix spelling and keep bullets.',
    })
    expect(getReadPrompt()?.name).toBe('Tidy notes')
    const a = once()
    await runVision(
      readAiConfig(),
      'handwriting',
      IMG,
      a.fn,
      async () => {},
      undefined,
      getReadPrompt()?.text,
    )
    expect(a.bodies[0]).toContain('Fix spelling and keep bullets.')
    expect(a.bodies[0]).toContain('handwriting')
    const b = once()
    await runVision(
      readAiConfig(),
      'latex',
      IMG,
      b.fn,
      async () => {},
      undefined,
      getReadPrompt()?.text,
    )
    expect(b.bodies[0]).not.toContain('Fix spelling')
    setReadPrompt(null)
    expect(getReadPrompt()).toBeNull()
  })
})
