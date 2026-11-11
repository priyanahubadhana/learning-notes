import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, hostname } from 'node:os'
import { join } from 'node:path'

/**
 * What Claude may do on this PC: ~/.learning-notes-mcp/config.json
 *
 *   { "scopes": { "read": true, "write:append": true, "write:create": true } }
 *
 * Everything is ON by default (owner's choice, 11 Nov 2026). A scope that is
 * off is not even offered to Claude. Safe on mistakes: a broken file, or a
 * value that is not true/false, turns that part OFF (never on). Appending
 * needs reading (the version check), so it is off when read is off. There is
 * no delete scope because there is no delete tool. Changes apply at the next
 * start of the connector (restart Claude Desktop).
 */

export const SCOPE_NAMES = ['read', 'write:append', 'write:create'] as const
export type ScopeName = (typeof SCOPE_NAMES)[number]
export type Scopes = Record<ScopeName, boolean>

export interface Config {
  scopes: Scopes
  /** The device id records are stamped with, like "mcp-desktop". */
  deviceId: string
  /** Things to tell the owner (stderr), never secrets. */
  problems: string[]
}

export const DEVICE_NAME = 'Claude (PC)'

export const configDir = (env: NodeJS.ProcessEnv = process.env): string =>
  env.LN_MCP_HOME || join(homedir(), '.learning-notes-mcp')

/** "mcp-" plus the PC's name, lower case, letters and digits only. */
export function defaultDeviceId(host = hostname()): string {
  const clean = host
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20)
  return `mcp-${clean || 'pc'}`
}

const DEVICE_ID = /^mcp-[a-z0-9-]{1,30}$/

export function parseConfig(text: string | null, host?: string): Config {
  const problems: string[] = []
  const out: Config = {
    scopes: { read: true, 'write:append': true, 'write:create': true },
    deviceId: defaultDeviceId(host),
    problems,
  }
  if (text === null) return out
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    problems.push(
      'config.json is not valid JSON: Claude is limited to reading until you fix it.',
    )
    out.scopes = { read: true, 'write:append': false, 'write:create': false }
    return out
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    problems.push(
      'config.json must be an object: Claude is limited to reading.',
    )
    out.scopes = { read: true, 'write:append': false, 'write:create': false }
    return out
  }
  const cfg = raw as { scopes?: unknown; deviceId?: unknown }
  if (cfg.scopes !== undefined) {
    if (
      !cfg.scopes ||
      typeof cfg.scopes !== 'object' ||
      Array.isArray(cfg.scopes)
    ) {
      problems.push('"scopes" must be an object: Claude is limited to reading.')
      out.scopes = { read: true, 'write:append': false, 'write:create': false }
    } else {
      const given = cfg.scopes as Record<string, unknown>
      for (const k of Object.keys(given))
        if (!(SCOPE_NAMES as readonly string[]).includes(k))
          problems.push(`Unknown scope "${k}" ignored.`)
      for (const name of SCOPE_NAMES) {
        const v = given[name]
        if (v === undefined) continue
        if (typeof v === 'boolean') out.scopes[name] = v
        else {
          out.scopes[name] = false
          problems.push(`"${name}" must be true or false: it is OFF.`)
        }
      }
    }
  }
  if (out.scopes['write:append'] && !out.scopes.read) {
    out.scopes['write:append'] = false
    problems.push(
      '"write:append" needs "read" (appending checks the page version): it is OFF.',
    )
  }
  if (cfg.deviceId !== undefined) {
    if (typeof cfg.deviceId === 'string' && DEVICE_ID.test(cfg.deviceId))
      out.deviceId = cfg.deviceId
    else problems.push('"deviceId" must look like mcp-mypc: ignored.')
  }
  return out
}

export function loadConfig(dir = configDir()): Config {
  const file = join(dir, 'config.json')
  let text: string | null = null
  try {
    if (existsSync(file)) text = readFileSync(file, 'utf8')
  } catch {
    const c = parseConfig('[')
    c.problems[0] =
      'config.json could not be read: Claude is limited to reading.'
    return c
  }
  return parseConfig(text)
}

/** Writes the default file once (so the owner can see and edit it). Never overwrites. */
export function ensureConfig(dir = configDir()): string {
  const file = join(dir, 'config.json')
  if (!existsSync(file)) {
    mkdirSync(dir, { recursive: true })
    const c = parseConfig(null)
    writeFileSync(
      file,
      JSON.stringify({ scopes: c.scopes, deviceId: c.deviceId }, null, 2) +
        '\n',
      { flag: 'wx' },
    )
  }
  return file
}
