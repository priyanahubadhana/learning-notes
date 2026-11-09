// Entry point only; the logic is in ../_shared/driveTokenHandler.ts (tested).
import { handle } from '../_shared/driveTokenHandler.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  const res = await handle(req, {
    ...Deno.env.toObject(),
    GOOGLE_CLIENT_ID:
      Deno.env.get('GOOGLE_CLIENT_ID') ??
      '278292583025-a3u2gqfea0lp8a4j1nuqf133hseuh12n.apps.googleusercontent.com',
    ALLOWED_EMAIL:
      Deno.env.get('ALLOWED_EMAIL') ?? 'priyanahubadhanalegends@gmail.com',
  })
  const headers = new Headers(res.headers)
  for (const [k, v] of Object.entries(CORS)) headers.set(k, v)
  return new Response(res.body, { status: res.status, headers })
})
