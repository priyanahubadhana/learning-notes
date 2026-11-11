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
