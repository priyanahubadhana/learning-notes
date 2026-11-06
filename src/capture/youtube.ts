/**
 * YouTube links: the video id and the start time only. Nothing is fetched.
 */

const HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'youtu.be',
])

const ID = /^[\w-]{11}$/

/** "90", "90s", "1m30s", "1h2m3s" → seconds (0 when it is not a time). */
export function parseStartTime(value: string | null | undefined): number {
  if (!value) return 0
  if (/^\d{1,6}$/.test(value)) return Number(value)
  const m = /^(?:(\d{1,3})h)?(?:(\d{1,4})m)?(?:(\d{1,6})s)?$/.exec(value)
  if (!m || (!m[1] && !m[2] && !m[3])) return 0
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)
}

/** "1:05" or "1:02:03" for a number of seconds. */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** The video id and start second of a YouTube link, or null. */
export function parseYoutube(
  url: string,
): { videoId: string; startSec: number } | null {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  if (u.protocol !== 'https:' || !HOSTS.has(u.hostname.toLowerCase())) {
    return null
  }
  const host = u.hostname.toLowerCase()
  const id =
    host === 'youtu.be'
      ? (u.pathname.split('/')[1] ?? null)
      : u.pathname === '/watch'
        ? u.searchParams.get('v')
        : (/^\/(?:embed|shorts|live|v)\/([\w-]{11})/.exec(u.pathname)?.[1] ??
          null)
  if (!id || !ID.test(id)) return null
  const hash = new URLSearchParams(u.hash.replace(/^#/, ''))
  const startSec = parseStartTime(
    u.searchParams.get('t') ?? u.searchParams.get('start') ?? hash.get('t'),
  )
  return { videoId: id, startSec }
}
