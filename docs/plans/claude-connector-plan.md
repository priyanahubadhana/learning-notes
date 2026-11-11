# Claude connector (MCP) plan (11 Nov 2026, Opus)

Recommendation: a LOCAL stdio MCP server on the PC (`node mcp/dist/index.js`, later maybe `npx learning-notes-mcp`). The key stays on the PC in Windows Credential Manager, and nothing new is hosted, so the cost is ₹0. A remote endpoint is rejected (it breaks E2E encryption). The browser bridge is rejected (WebSocket hijack risk, iPad unfriendly).

The connector registers as its own revocable device (Settings › Connected devices › Revoke).

- Scopes: read, write:append, write:create; no delete.
- Risky edits go to an in-app Inbox (Accept/Reject).
- Writes are new blocks or a version-checked append; HLC merge; an audit log in Settings › Claude activity.
- Rate limits: 60 reads/min, 20 writes/min, 500 writes/day.
- Tools: list_notebooks, list_pages, search_notes, read_page, list_cards, due_cards, create_page, append_to_page, add_card, propose_edit.

Slices:

1. A shared crypto/HLC module + Node round-trip tests.
2. A read-only server.
3. The device registry + Revoke + RLS.
4. Writes.
5. The Inbox + audit screen.
6. Rate limits, the setup guide, a security review.

Limits: PC only (the iPad can't run it). The key is on the PC (OS keychain). Prompt-injection risk is mitigated by scopes + the Inbox.

Owner questions (picks): see PENDING OWNER TO-DO.

## B: online remote connector (main path), Opus 11 Nov

- **Hosting**: a Supabase Edge Function `mcp` (₹0, about 500k calls a month). Transport: MCP Streamable HTTP (POST /mcp). Note that free projects pause after 7 days of no use.
- **OAuth 2.1** as claude.ai custom connectors require: metadata, dynamic client registration, /authorize with PKCE S256, redirects locked to claude.ai, short access tokens and rotating refresh tokens. Use Supabase's OAuth server if it's ready, otherwise our own (`_shared/oauth.ts`).
- **Opt-in key escrow** (`claude_escrow`): the client wraps the master key with a server secret. Each call unwraps it in memory and drops it. Turning it off deletes the row and revokes the tokens. Off by default; the privacy text says so plainly.
- **Tools**: create_notebook(spec), add_page, add_cards, create_database, apply_style, search, read, refine_page. The notebook spec JSON Schema in `src/connector/spec.schema.json` is shared with A.
- **Safety**: no delete; a big change (over 30% of a page, or any change to cards) goes to the Inbox; an audit log (no content); rate limits; note content treated as untrusted data.
- **Slices**: 1 shared spec/crypto/HLC → 2 OAuth + an empty MCP server in claude.ai → 3 the escrow opt-in → 4 read tools → 5 create_notebook/add_page → 6 cards/db/style → 7 refine + Inbox + audit → 8 limits, guide, review.
- **Owner questions (picks)**: Supabase hosting; the escrow expires after 30 days of no use; Inbox thresholds as above; opt-in scope chosen at opt-in (default all); build B first, then A.
