/** The consent screen for the online Claude connector lives at `#/connect?...` (see ConnectPage). */
export const isConnectRoute = (hash: string): boolean =>
  hash === '#/connect' || hash.startsWith('#/connect?')

/** The authorization request the server put in the address. */
export interface ConnectParams {
  client_id: string
  redirect_uri: string
  code_challenge: string
  scope: string
  state?: string
}

/** Reads the request from the hash; null if anything needed is missing. */
export function parseConnectHash(hash: string): ConnectParams | null {
  const q = new URLSearchParams(hash.slice(hash.indexOf('?') + 1))
  const client_id = q.get('client_id')
  const redirect_uri = q.get('redirect_uri')
  const code_challenge = q.get('code_challenge')
  if (!client_id || !redirect_uri || !code_challenge) return null
  return {
    client_id,
    redirect_uri,
    code_challenge,
    scope: q.get('scope') ?? '',
    ...(q.get('state') ? { state: q.get('state')! } : {}),
  }
}

/** Only Claude's own addresses are ever opened after a choice. */
export function isClaudeAddress(url: string): boolean {
  try {
    const u = new URL(url)
    return (
      u.protocol === 'https:' &&
      ['claude.ai', 'www.claude.ai', 'claude.com', 'www.claude.com'].includes(
        u.hostname,
      )
    )
  } catch {
    return false
  }
}
