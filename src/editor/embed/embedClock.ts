import { formatTime, PLAYER_ORIGIN } from './embedUrl'

/**
 * The play time of the video that is playing in a page (G2a). The player
 * frame talks to us with messages (the IFrame API's "widget" channel, no
 * script from YouTube is loaded). This is best effort: if nothing arrives,
 * the user types the time instead. Nothing here stores anything.
 */

interface Tick {
  videoId: string
  seconds: number
  at: number
}

let last: Tick | null = null

/** Messages older than this mean the video is paused or not reporting. */
const FRESH_MS = 5000

/** The newest play time reported by a player, if it is recent. */
export function currentVideoTime(
  videoId?: string,
  now = Date.now(),
): { videoId: string; seconds: number } | null {
  if (!last || now - last.at > FRESH_MS) return null
  if (videoId && last.videoId !== videoId) return null
  return { videoId: last.videoId, seconds: last.seconds }
}

/** Pulls the play time out of one message from the player, or null. */
export function timeFromMessage(data: unknown): number | null {
  let msg: unknown = data
  if (typeof data === 'string') {
    try {
      msg = JSON.parse(data)
    } catch {
      return null
    }
  }
  if (!msg || typeof msg !== 'object') return null
  const { event, info } = msg as { event?: unknown; info?: unknown }
  if (event !== 'infoDelivery' && event !== 'initialDelivery') return null
  if (!info || typeof info !== 'object') return null
  const t = (info as { currentTime?: unknown }).currentTime
  return typeof t === 'number' && Number.isFinite(t) && t >= 0 ? t : null
}

/**
 * Starts listening to a player frame. Returns a function that stops. The
 * "listening" greeting is repeated for a few seconds until the player
 * answers (it may not be ready when the frame first loads).
 */
export function listenToPlayer(
  frame: HTMLIFrameElement,
  videoId: string,
  onTime?: (seconds: number) => void,
): () => void {
  const onMessage = (e: MessageEvent) => {
    if (e.origin !== PLAYER_ORIGIN || e.source !== frame.contentWindow) return
    const seconds = timeFromMessage(e.data)
    if (seconds === null) return
    last = { videoId, seconds, at: Date.now() }
    onTime?.(seconds)
  }
  window.addEventListener('message', onMessage)
  const greet = () =>
    frame.contentWindow?.postMessage(
      JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }),
      PLAYER_ORIGIN,
    )
  let tries = 0
  const timer = window.setInterval(() => {
    if (++tries > 10) window.clearInterval(timer)
    else greet()
  }, 1000)
  return () => {
    window.removeEventListener('message', onMessage)
    window.clearInterval(timer)
  }
}

// ---- Stamping pasted pictures with the video time ----

/** Pictures added while a video plays: picture reference → caption. */
const pending = new Map<string, string>()

/** The caption for a picture taken now, e.g. "▶ 12:34", or null. */
export function stampLabel(videoId?: string): string | null {
  const now = currentVideoTime(videoId)
  return now ? `▶ ${formatTime(now.seconds)}` : null
}

/** Remembers that a picture was added while a video played. */
export function stampPicture(url: string, label: string): void {
  pending.set(url, label)
}

/** Takes (and forgets) the caption waiting for a picture. */
export function takeStamp(url: string): string | undefined {
  const label = pending.get(url)
  pending.delete(url)
  return label
}

export const hasStamps = (): boolean => pending.size > 0

/** Tests only. */
export function resetEmbedClock(): void {
  last = null
  pending.clear()
}
