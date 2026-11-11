// Entry point only; the logic is in ../_shared/ (oauth.ts, mcpHandler.ts, tested).
// NOT deployed yet. Deploy with `--no-verify-jwt`: claude.ai sends our own OAuth
// token, not a Supabase one (see docs/features/claude-connector.md, "Online connector (B)").
import { handleOAuth } from '../_shared/oauth.ts'
import {
  supabaseOAuthStore,
  supabaseVerifyUser,
} from '../_shared/oauthStore.ts'
import { handleMcp } from '../_shared/mcpHandler.ts'
import { supabaseClaudeBackend } from '../_shared/claudeStore.ts'
import { handleAppRoutes } from '../_shared/escrow.ts'

const APP_URL =
  Deno.env.get('APP_URL') ?? 'https://learning-notes-app.pages.dev'

Deno.serve(async (req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return new Response(JSON.stringify({ error: 'not_configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  // The public address of this function: https://<project>.supabase.co/functions/v1/mcp
  const baseUrl = `${supabaseUrl}/functions/v1/mcp`
  const store = supabaseOAuthStore(supabaseUrl, serviceKey)
  const oauth = {
    store,
    baseUrl,
    appUrl: APP_URL,
    allowedEmail: Deno.env.get('ALLOWED_EMAIL') ?? undefined,
    verifyUser: (token: string) =>
      supabaseVerifyUser(supabaseUrl, anonKey, token),
  }
  const res = await handleOAuth(req, oauth)
  if (res) return res
  // Slices 3-5: the key escrow, the Connected apps list and the notes tools.
  // CLAUDE_ESCROW_SECRET is set by the owner (supabase secrets set); without
  // it the escrow is unavailable and the notes tools say so.
  const claude = {
    backend: supabaseClaudeBackend(supabaseUrl, serviceKey),
    secret: Deno.env.get('CLAUDE_ESCROW_SECRET') ?? undefined,
  }
  const rel = new URL(req.url).pathname.slice(new URL(baseUrl).pathname.length)
  const app = await handleAppRoutes(
    req,
    {
      ...claude,
      store,
      now: Date.now,
      appUrl: APP_URL,
      allowedEmail: oauth.allowedEmail,
      verifyUser: oauth.verifyUser,
    },
    rel || '/',
  )
  if (app) return app
  return handleMcp(req, { store, baseUrl, claude })
})
