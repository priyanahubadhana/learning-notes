import { describe, expect, it } from 'vitest'
import {
  corsHeaders,
  isAllowedOrigin,
} from '../../../supabase/functions/_shared/cors'

describe('drive-token CORS', () => {
  it('allows the live app and local development only', () => {
    for (const o of [
      'https://learning-notes-app.pages.dev',
      'http://localhost:5173',
      'http://localhost',
      'http://127.0.0.1:5199',
    ])
      expect(isAllowedOrigin(o)).toBe(true)
    for (const o of [
      null,
      '',
      'null',
      'https://evil.example',
      'https://learning-notes-app.pages.dev.evil.example',
      'https://evil.learning-notes-app.pages.dev',
      'http://learning-notes-app.pages.dev',
      'http://localhost.evil.example',
      'http://localhost:5173.evil.example',
      'https://localhost:5173',
    ])
      expect(isAllowedOrigin(o)).toBe(false)
  })

  it('echoes the origin (never *) and sends nothing for a stranger', () => {
    const ok = corsHeaders('https://learning-notes-app.pages.dev')
    expect(ok['Access-Control-Allow-Origin']).toBe(
      'https://learning-notes-app.pages.dev',
    )
    expect(ok.Vary).toBe('Origin')
    const bad = corsHeaders('https://evil.example')
    expect(bad['Access-Control-Allow-Origin']).toBeUndefined()
    expect(corsHeaders(null)['Access-Control-Allow-Origin']).toBeUndefined()
  })
})
