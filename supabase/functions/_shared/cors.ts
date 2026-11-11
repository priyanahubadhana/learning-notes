// CORS for the drive-token function: only the app's own origins may call it
// from a browser. (The function also needs a signed-in session, so this is a
// second lock, not the only one.)

const APP_ORIGIN = 'https://learning-notes-app.pages.dev'
/** Local development: any port on localhost or 127.0.0.1, plain http. */
const DEV_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/

export function isAllowedOrigin(origin: string | null): boolean {
  return origin === APP_ORIGIN || (!!origin && DEV_ORIGIN.test(origin))
}

/** Headers to add to a reply; none for an origin that is not the app's. */
export function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !isAllowedOrigin(origin)) return { Vary: 'Origin' }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}
