import { execFile } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/**
 * Where the connector keeps its secrets on this PC: the master key and the
 * sign-in renewal token. Never in a config file, never in a log.
 *
 * 1. Windows Credential Manager (through keytar). Preferred.
 * 2. A file locked with Windows DPAPI (only this Windows user on this PC can
 *    open it), if keytar cannot load.
 * Tests use the in-memory store.
 */
export interface SecretStore {
  readonly kind: string
  get(name: string): Promise<string | null>
  set(name: string, value: string): Promise<void>
  remove(name: string): Promise<void>
}

const SERVICE = 'learning-notes-mcp'

export function memoryStore(): SecretStore {
  const map = new Map<string, string>()
  return {
    kind: 'memory',
    get: async (n) => map.get(n) ?? null,
    set: async (n, v) => void map.set(n, v),
    remove: async (n) => void map.delete(n),
  }
}

interface Keytar {
  getPassword(s: string, a: string): Promise<string | null>
  setPassword(s: string, a: string, p: string): Promise<void>
  deletePassword(s: string, a: string): Promise<boolean>
}

async function loadKeytar(): Promise<Keytar | null> {
  try {
    const keytarModule = 'keytar' // optional native module; resolved at run time only
    const mod = (await import(/* @vite-ignore */ keytarModule)) as {
      default?: Keytar
    } & Keytar
    const k = mod.default ?? mod
    // Prove the OS vault answers before trusting it.
    await k.getPassword(SERVICE, 'probe')
    return k
  } catch {
    return null
  }
}

export function keytarStore(k: Keytar): SecretStore {
  return {
    kind: 'Windows Credential Manager',
    get: (n) => k.getPassword(SERVICE, n),
    set: (n, v) => k.setPassword(SERVICE, n, v),
    remove: async (n) => void (await k.deletePassword(SERVICE, n)),
  }
}

/** Runs a PowerShell snippet with `input` on stdin (never on the command line). */
function powershell(script: string, input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, maxBuffer: 1 << 20 },
      (err, stdout) => (err ? reject(err) : resolve(stdout.trim())),
    )
    child.stdin?.end(input)
  })
}

const PROTECT =
  'Add-Type -AssemblyName System.Security;' +
  '$t=[Console]::In.ReadToEnd();' +
  '[Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes($t),$null,"CurrentUser"))'
const UNPROTECT =
  'Add-Type -AssemblyName System.Security;' +
  '$t=[Console]::In.ReadToEnd().Trim();' +
  '[Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($t),$null,"CurrentUser"))'

/** One DPAPI-locked file holding all secrets as JSON. */
export function dpapiStore(file: string): SecretStore {
  const readAll = async (): Promise<Record<string, string>> => {
    let locked: string
    try {
      locked = await readFile(file, 'utf8')
    } catch {
      return {}
    }
    return JSON.parse(await powershell(UNPROTECT, locked)) as Record<
      string,
      string
    >
  }
  const writeAll = async (all: Record<string, string>) => {
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, await powershell(PROTECT, JSON.stringify(all)), {
      mode: 0o600,
    })
  }
  return {
    kind: 'DPAPI-locked file',
    get: async (n) => (await readAll())[n] ?? null,
    set: async (n, v) => writeAll({ ...(await readAll()), [n]: v }),
    remove: async (n) => {
      const all = await readAll()
      delete all[n]
      if (Object.keys(all).length === 0) await rm(file, { force: true })
      else await writeAll(all)
    },
  }
}

export function defaultSecretFile(): string {
  const base = process.env.APPDATA ?? process.env.HOME ?? '.'
  return join(base, 'learning-notes-mcp', 'secrets.dpapi')
}

/** The best store available on this PC. */
export async function openSecretStore(): Promise<SecretStore> {
  const k = await loadKeytar()
  if (k) return keytarStore(k)
  if (process.platform === 'win32') return dpapiStore(defaultSecretFile())
  throw new Error(
    'No safe place to keep the key on this computer (needs Windows Credential Manager or DPAPI).',
  )
}
