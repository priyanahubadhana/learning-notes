/**
 * Embed addresses (G2a). Pure functions: recognise a YouTube link (watch,
 * youtu.be, shorts, embed, live; with a start time), accept any other
 * web address as a plain link card, and refuse everything else (no
 * javascript:, data:, file: or addresses with a password).
 */

export type ParsedEmbed =
  | { provider: 'youtube'; videoId: string; start: number; url: string }
  | { provider: 'link'; url: string }

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
