/**
 * Embed addresses (G2a). Pure functions: recognise a YouTube, Vimeo or Loom
 * link (with a start time) or a direct .mp4 / .webm file (https only), accept
 * any other web address as a plain link card, and refuse everything else (no
 * javascript:, data:, file: or addresses with a password). The allow-list is
 * closed: only these hosts are ever framed (public/_headers frame-src).
 */

export type ParsedEmbed =
  | { provider: 'youtube'; videoId: string; start: number; url: string }
  | {
      provider: 'vimeo'
      videoId: string
      /** The private-link hash of an unlisted video ('' for public ones). */
      hash: string
      start: number
      url: string
    }
  | { provider: 'loom'; videoId: string; start: number; url: string }
  | { provider: 'video'; url: string }
  | { provider: 'link'; url: string }

/** Providers that show a player after a tap (the rest are link cards). */
export const PLAYER_PROVIDERS = ['youtube', 'vimeo', 'loom', 'video'] as const

const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'])
const LOOM_HOSTS = new Set(['loom.com', 'www.loom.com'])
const VIMEO_ID = /^\d{6,12}$/
const VIMEO_HASH = /^[0-9a-f]{8,16}$/i
const LOOM_ID = /^[0-9a-f]{32}$/i
const VIDEO_FILE = /\.(mp4|webm)$/i

/** The block props for a parsed address (what the Embed block stores). */
export function embedProps(p: ParsedEmbed): {
  url: string
  provider: string
  videoId?: string
  start?: number
} {
  return p.provider === 'link' || p.provider === 'video'
    ? { url: p.url, provider: p.provider }
    : {
        url: p.url,
        provider: p.provider,
        videoId: p.videoId,
        start: p.start,
      }
}

const MAX_URL = 2000
const VIDEO_ID = /^[\w-]{11}$/
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
])

/** "754", "12:34", "1:02:03", "1h2m3s", "90s" into seconds; null if unreadable. */
export function parseTime(text: string): number | null {
  const s = text.trim().toLowerCase()
  if (s === '') return null
  if (/^\d+$/.test(s)) return Number(s)
  const colon = /^(?:(\d{1,3}):)?(\d{1,2}):(\d{1,2})$/.exec(s)
  if (colon) {
    const [, h, m, sec] = colon
    if (Number(sec) > 59 || (h !== undefined && Number(m) > 59)) return null
    return Number(h ?? 0) * 3600 + Number(m) * 60 + Number(sec)
  }
  const hms = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(s)
  if (hms && (hms[1] || hms[2] || hms[3])) {
    return (
      Number(hms[1] ?? 0) * 3600 +
      Number(hms[2] ?? 0) * 60 +
      Number(hms[3] ?? 0)
    )
  }
  return null
}

/** Seconds as "m:ss" or "h:mm:ss". */
export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** The address of a video at a moment (what a timestamp link opens). */
export function videoLink(videoId: string, seconds = 0): string {
  const t = Math.max(0, Math.floor(seconds))
  return `https://www.youtube.com/watch?v=${videoId}${t > 0 ? `&t=${t}s` : ''}`
}

/** Reads what the user pasted: a YouTube video, a web address, or null. */
export function parseEmbedUrl(text: string): ParsedEmbed | null {
  const raw = text.trim()
  if (raw === '' || raw.length > MAX_URL || /\s/.test(raw)) return null
  let url: URL
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (url.username || url.password) return null
  const host = url.hostname.toLowerCase()
  if (!host.includes('.')) return null

  let id: string | null = null
  if (host === 'youtu.be') {
    id = url.pathname.split('/')[1] ?? null
  } else if (YOUTUBE_HOSTS.has(host)) {
    const parts = url.pathname.split('/').filter(Boolean)
    if (url.pathname === '/watch') id = url.searchParams.get('v')
    else if (['embed', 'shorts', 'live', 'v'].includes(parts[0] ?? '')) {
      id = parts[1] ?? null
    }
  }
  if (id !== null && VIDEO_ID.test(id)) {
    const t = url.searchParams.get('t') ?? url.searchParams.get('start')
    const start = (t && parseTime(t)) || 0
    return {
      provider: 'youtube',
      videoId: id,
      start,
      url: videoLink(id, start),
    }
  }
  const parts = url.pathname.split('/').filter(Boolean)
  if (VIMEO_HOSTS.has(host)) {
    // vimeo.com/ID, vimeo.com/ID/HASH, player.vimeo.com/video/ID?h=HASH,
    // vimeo.com/channels/x/ID, vimeo.com/groups/x/videos/ID
    const at = parts.findIndex((x) => VIMEO_ID.test(x))
    if (at >= 0) {
      const next = parts[at + 1] ?? url.searchParams.get('h') ?? ''
      const hash = VIMEO_HASH.test(next) ? next.toLowerCase() : ''
      const t = /^#t=(.+)$/.exec(url.hash)?.[1] ?? url.searchParams.get('t')
      const start = (t && parseTime(t)) || 0
      return {
        provider: 'vimeo',
        videoId: parts[at],
        hash,
        start,
        url: `https://vimeo.com/${parts[at]}${hash ? '/' + hash : ''}`,
      }
    }
  }
  if (LOOM_HOSTS.has(host) && ['share', 'embed'].includes(parts[0] ?? '')) {
    const id = parts[1] ?? ''
    if (LOOM_ID.test(id)) {
      const t = url.searchParams.get('t') ?? url.searchParams.get('start')
      const start = (t && parseTime(t)) || 0
      return {
        provider: 'loom',
        videoId: id.toLowerCase(),
        start,
        url: `https://www.loom.com/share/${id.toLowerCase()}`,
      }
    }
  }
  if (url.protocol === 'https:' && VIDEO_FILE.test(url.pathname)) {
    url.hash = ''
    return { provider: 'video', url: url.toString() }
  }
  // Any other web address: a link card (no live frame).
  url.hash = ''
  return { provider: 'link', url: url.toString() }
}

/** Where the player frame loads from (always the no-cookie host). */
export const PLAYER_ORIGIN = 'https://www.youtube-nocookie.com'

/** The frame's address; `enablejsapi` lets the app read the play time. */
export function playerSrc(videoId: string, start: number): string {
  const q = new URLSearchParams({
    start: String(Math.max(0, Math.floor(start))),
    enablejsapi: '1',
    playsinline: '1',
    rel: '0',
    autoplay: '1',
  })
  return `${PLAYER_ORIGIN}/embed/${videoId}?${q.toString()}`
}

/** Where a Vimeo player frame loads from (privacy: do-not-track on). */
export const VIMEO_ORIGIN = 'https://player.vimeo.com'
/** Where a Loom player frame loads from. */
export const LOOM_ORIGIN = 'https://www.loom.com'

/**
 * The frame address for a Vimeo or Loom card, from its stored address; null
 * when the address is not one of those (nothing else is ever framed).
 */
export function frameSrc(p: { url: string; start?: number }): string | null {
  const parsed = parseEmbedUrl(p.url)
  const start = Math.max(0, Math.floor(p.start ?? 0))
  if (parsed?.provider === 'vimeo') {
    const q = new URLSearchParams({ dnt: '1', autoplay: '1' })
    if (parsed.hash) q.set('h', parsed.hash)
    return `${VIMEO_ORIGIN}/video/${parsed.videoId}?${q.toString()}${start > 0 ? `#t=${start}s` : ''}`
  }
  if (parsed?.provider === 'loom') {
    const q = new URLSearchParams({ autoplay: '1', hide_owner: 'true' })
    if (start > 0) q.set('t', String(start))
    return `${LOOM_ORIGIN}/embed/${parsed.videoId}?${q.toString()}`
  }
  return null
}
