import { beforeEach, describe, expect, it } from 'vitest'
import {
  memoryStore,
  randomToken,
  sha256Hex,
} from '../../supabase/functions/_shared/oauth'
import {
  MAX_REQUEST_BYTES,
  PROTOCOL_VERSIONS,
  TOOLS,
  handleMcp,
} from '../../supabase/functions/_shared/mcpHandler'

const BASE = 'https://proj.example.test/functions/v1/mcp'
let store: ReturnType<typeof memoryStore>
let now: number

async function grantToken(
  scopes: string[],
  over: { expiresAt?: number; audience?: string } = {},
) {
  const raw = randomToken('lna_a_')
  await store.putToken({
    hash: await sha256Hex(raw),
    kind: 'access',
    family: 'f1',
    clientId: 'c1',
    userId: 'u1',
    scopes,
    audience: over.audience ?? BASE,
    expiresAt: over.expiresAt ?? now + 3_600_000,
    usedAt: null,
  })
  return raw
}
const rpc = (
  token: string | null,
  body: unknown,
  headers: Record<string, string> = {},
) =>
  handleMcp(
    new Request(BASE, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    { store, baseUrl: BASE, now: () => now },
  )
const msg = (method: string, params?: unknown, id: number | string = 1) => ({
  jsonrpc: '2.0',
  id,
  method,
  params,
})
type Rpc = {
  result?: Record<string, unknown>
  error?: { code: number; message: string }
}

beforeEach(() => {
  store = memoryStore()
  now = Date.now()
})

describe('MCP endpoint: access', () => {
  it('answers 401 with the metadata pointer without a token', async () => {
    const res = await rpc(null, msg('ping'))
    expect(res.status).toBe(401)
    expect(res.headers.get('www-authenticate')).toContain('resource_metadata=')
  })
  it('refuses bad, expired and other-audience tokens', async () => {
    expect((await rpc('lna_a_junk', msg('ping'))).status).toBe(401)
    const old = await grantToken(['notes:read'], { expiresAt: now - 1 })
    expect((await rpc(old, msg('ping'))).status).toBe(401)
    const other = await grantToken(['notes:read'], {
      audience: 'https://other.example/mcp',
    })
    expect((await rpc(other, msg('ping'))).status).toBe(401)
    expect(
      (await rpc(await grantToken(['notes:read']), msg('ping'))).status,
    ).toBe(200)
  })
  it('refuses a browser origin that is not Claude', async () => {
    const t = await grantToken(['notes:read'])
    expect(
      (await rpc(t, msg('ping'), { origin: 'https://evil.example' })).status,
    ).toBe(403)
    expect(
      (await rpc(t, msg('ping'), { origin: 'https://claude.ai' })).status,
    ).toBe(200)
  })
  it('GET and DELETE are not allowed (no stream, no sessions)', async () => {
    const t = await grantToken(['notes:read'])
    for (const method of ['GET', 'DELETE']) {
      const res = await handleMcp(
        new Request(BASE, {
          method,
          headers: { authorization: `Bearer ${t}` },
        }),
        { store, baseUrl: BASE, now: () => now },
      )
      expect(res.status).toBe(405)
    }
  })
  it('limits the body size and rejects bad JSON', async () => {
    const t = await grantToken(['notes:read'])
    const big = await rpc(t, 'x'.repeat(MAX_REQUEST_BYTES + 1))
    expect(big.status).toBe(413)
    const bad = await rpc(t, '{nope')
    expect(bad.status).toBe(400)
    expect(((await bad.json()) as Rpc).error?.code).toBe(-32700)
  })
})

describe('MCP endpoint: protocol', () => {
  it('initializes with the version the client asks for, else the newest', async () => {
    const t = await grantToken(['notes:read'])
    for (const v of PROTOCOL_VERSIONS) {
      const r = (await (
        await rpc(t, msg('initialize', { protocolVersion: v }))
      ).json()) as Rpc
      expect(r.result?.protocolVersion).toBe(v)
    }
    const r = (await (
      await rpc(t, msg('initialize', { protocolVersion: '1999-01-01' }))
    ).json()) as Rpc
    expect(r.result?.protocolVersion).toBe(PROTOCOL_VERSIONS[0])
    expect(r.result?.capabilities).toEqual({ tools: { listChanged: false } })
  })
  it('a notification gets 202 and no body', async () => {
    const t = await grantToken(['notes:read'])
    const res = await rpc(t, {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    })
    expect(res.status).toBe(202)
    expect(await res.text()).toBe('')
  })
  it('handles batches and rejects an empty or huge one', async () => {
    const t = await grantToken(['notes:read'])
    const res = await rpc(t, [
      msg('ping', undefined, 1),
      msg('ping', undefined, 2),
    ])
    expect(((await res.json()) as Rpc[]).length).toBe(2)
    expect((await rpc(t, [])).status).toBe(400)
    expect((await rpc(t, Array(21).fill(msg('ping')))).status).toBe(400)
  })
  it('gives JSON-RPC errors for odd messages', async () => {
    const t = await grantToken(['notes:read'])
    expect(
      ((await (await rpc(t, msg('nope'))).json()) as Rpc).error?.code,
    ).toBe(-32601)
    expect(
      ((await (await rpc(t, { id: 1, method: 'ping' })).json()) as Rpc).error
        ?.code,
    ).toBe(-32600)
    expect(((await (await rpc(t, 5)).json()) as Rpc).error?.code).toBe(-32600)
    expect(
      ((await (await rpc(t, msg('tools/call', { name: 'zzz' }))).json()) as Rpc)
        .error?.code,
    ).toBe(-32602)
    expect(
      ((await (await rpc(t, msg('tools/call', null))).json()) as Rpc).error
        ?.code,
    ).toBe(-32602)
  })
})

describe('MCP endpoint: tools', () => {
  it('lists every tool for a read+write grant, with no delete tool', async () => {
    const t = await grantToken(['notes:read', 'notes:write'])
    const r = (await (await rpc(t, msg('tools/list'))).json()) as Rpc
    const names = (r.result!.tools as { name: string }[]).map((x) => x.name)
    expect(names.sort()).toEqual([
      'add_cards',
      'add_page',
      'apply_style',
      'create_database',
      'create_notebook',
      'list_cards',
      'list_notebooks',
      'list_pages',
      'ping',
      'read',
      'refine_page',
      'search',
    ])
    expect(names.some((n) => /delete|remove/i.test(n))).toBe(false)
    for (const tool of r.result!.tools as {
      inputSchema: { type: string }
      annotations: { destructiveHint: boolean }
    }[]) {
      expect(tool.inputSchema.type).toBe('object')
      expect(tool.annotations.destructiveHint).toBe(false)
    }
  })
  it('a read-only grant sees only read tools and cannot call write tools', async () => {
    const t = await grantToken(['notes:read'])
    const r = (await (await rpc(t, msg('tools/list'))).json()) as Rpc
    const names = (r.result!.tools as { name: string }[])
      .map((x) => x.name)
      .sort()
    expect(names).toEqual([
      'list_cards',
      'list_notebooks',
      'list_pages',
      'ping',
      'read',
      'search',
    ])
    const call = (await (
      await rpc(t, msg('tools/call', { name: 'add_page', arguments: {} }))
    ).json()) as Rpc
    expect(call.result?.isError).toBe(true)
    expect(JSON.stringify(call.result)).toContain('notes:write')
  })
  it('ping works', async () => {
    const t = await grantToken(['notes:read'])
    const r = (await (
      await rpc(t, msg('tools/call', { name: 'ping' }))
    ).json()) as Rpc
    expect(r.result?.isError).toBe(false)
    expect(JSON.stringify(r.result)).toContain('pong')
  })
  it('every other tool says it is not enabled yet and changes nothing', async () => {
    const t = await grantToken(['notes:read', 'notes:write'])
    for (const tool of TOOLS.filter((x) => x.name !== 'ping')) {
      const r = (await (
        await rpc(
          t,
          msg('tools/call', { name: tool.name, arguments: { query: 'x' } }),
        )
      ).json()) as Rpc
      expect(r.result?.isError, tool.name).toBe(true)
      expect(JSON.stringify(r.result)).toContain('not enabled yet')
    }
  })
  it('a throwing tool gives a safe message with no details', async () => {
    const ping = TOOLS.find((x) => x.name === 'ping')!
    const orig = ping.run
    ping.run = () => {
      throw new Error('secret note text')
    }
    try {
      const t = await grantToken(['notes:read'])
      const r = (await (
        await rpc(t, msg('tools/call', { name: 'ping' }))
      ).json()) as Rpc
      expect(r.result?.isError).toBe(true)
      expect(JSON.stringify(r)).not.toContain('secret')
    } finally {
      ping.run = orig
    }
  })
})
