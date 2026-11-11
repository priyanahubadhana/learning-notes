// Entry point only; the logic is in ../_shared/driveTokenHandler.ts (tested).
import { corsHeaders } from '../_shared/cors.ts'
import { handle } from '../_shared/driveTokenHandler.ts'

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  const res = await handle(req, {
    ...Deno.env.toObject(),
    GOOGLE_CLIENT_ID:
      Deno.env.get('GOOGLE_CLIENT_ID') ??
      '278292583025-a3u2gqfea0lp8a4j1nuqf133hseuh12n.apps.googleusercontent.com',
    ALLOWED_EMAIL:
      Deno.env.get('ALLOWED_EMAIL') ?? 'priyanahubadhanalegends@gmail.com',
  })
  const headers = new Headers(res.headers)
  for (const [k, v] of Object.entries(cors)) headers.set(k, v)
  return new Response(res.body, { status: res.status, headers })
})
