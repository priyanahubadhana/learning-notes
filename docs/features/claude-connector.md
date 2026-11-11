# Claude connector (read-only, slices 1-2)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

Plan: [plans/claude-connector-plan.md](../plans/claude-connector-plan.md). Built so far: slice 1 (shared crypto + Node tests) and slice 2 (read-only server). Writes, the device list, the Inbox and rate limits come in slices 3-6.

## Purpose

Lets Claude Desktop read your notes: "what did I write about mitochondria?", "quiz me on my due cards". It runs only on your PC. Your notes stay end-to-end encrypted on the server; the key never leaves your PC.

## Set it up (about 10 minutes, once)

You need: Node.js 20 or newer (check with `node -v` in a terminal), Claude Desktop, and the repo on your PC (this folder).

1. **Install and build.** In a terminal, in the repo folder:

   ```
   npm run mcp:install
   npm run mcp:build
   ```

2. **Sign in and unlock.** Run:

   ```
   node mcp/dist/index.js setup
   ```

   It emails a 6-digit code to your Learning Notes address (type it in the terminal), then asks for your **sync passphrase** (the one you made in the app; nothing is shown while you type). The key is then saved in **Windows Credential Manager** (or, if that is not available, in a file only your Windows user can open). Other ways to sign in: `setup --google` (opens your browser; needs the one-time Supabase step below) or `setup --password`.

3. **Allow Claude to read a notebook.** In the app: Settings > AI > Permissions > turn on **Allow AI** for each notebook Claude may read. Notebooks that are switched off are invisible to Claude. Locked pages stay hidden unless that notebook also has **Allow AI while locked**.

4. **Tell Claude Desktop about it.** Open `%APPDATA%\Claude\claude_desktop_config.json` (Claude Desktop > Settings > Developer > Edit Config) and add this (change the path to where your repo is; use double backslashes):

   ```json
   {
     "mcpServers": {
       "learning-notes": {
         "command": "node",
         "args": [
           "C:\\Users\\pc\\Downloads\\learning-notes\\mcp\\dist\\index.js"
         ]
       }
     }
   }
   ```

5. **Restart Claude Desktop** (quit from the tray icon, then open it). Ask: "List my Learning Notes notebooks."

Check any time with `node mcp/dist/index.js status`. To remove the key from this PC: `node mcp/dist/index.js logout`.

If a notebook you expect is missing, Claude's answer says "N notebooks are hidden because Allow AI is off". To let Claude read everything that is not locked, start it with the environment variable `LN_MCP_READ_ALL=1` (add `"env": { "LN_MCP_READ_ALL": "1" }` next to `args`). Locked pages stay hidden anyway.

## How it works

- `mcp/` is its own small package (own `package.json`, TypeScript). `npm run mcp:build` bundles it, together with the app's own `src/sync/crypto.ts`, `hlc.ts` and `wire.ts`, into `mcp/dist/index.js`. The code is shared, not copied, so the app and the connector cannot drift apart. The app's own build and size check do not include `mcp/`.
- Claude Desktop starts `node mcp/dist/index.js` and talks to it through its input and output (stdio). **Nothing listens on the network.** (Only `setup --google` opens a short-lived listener on 127.0.0.1 while you sign in.)
- On the first question it downloads your encrypted records from Supabase, opens them with the key (in memory only; nothing is written to disk), and keeps a cache. It refreshes at most every 10 seconds, and only fetches what changed.
- Tools (all read only):

  | Tool             | What it gives                                                                               |
  | ---------------- | ------------------------------------------------------------------------------------------- |
  | `list_notebooks` | Readable notebooks and page counts                                                          |
  | `list_pages`     | Pages of a notebook (optionally the sub-pages of one page)                                  |
  | `search_notes`   | Pages whose title or text has all the words, with a snippet                                 |
  | `read_page`      | One page as Markdown plus a `version` (changes when the page changes; used by writes later) |
  | `list_cards`     | Recall cards (question, answer, due) for a page or notebook                                 |
  | `due_cards`      | Cards due for review now                                                                    |

- Markdown covers headings, text styles, links, lists (nested, numbered, to-do), quotes, code, tables, formulas and cards. Pictures, ink, mind maps and databases show as a short placeholder.
- The sign-in renewal token is also kept in the vault. The server's refresh tokens are single use, so each renewal saves the new one at once.

## Edge cases

- Not set up, or the sign-in was ended (for example "sign out everywhere"): the tools say to run `setup` again.
- Offline: the tool answers with a plain "could not reach the server" message; the cache from earlier stays.
- Records Claude cannot open (another key, damaged): skipped and counted, never an error for the whole call.
- Deleted pages and notebooks, pages under a deleted page, paused pages (for cards), and the hidden database notebook are never shown.
- First read downloads everything once, including ink and other large records (they are opened and dropped). A very large library can take a while; later calls are fast.
- The iPad cannot run this (PC only).

## Security check

- **Key:** only in Windows Credential Manager (or a DPAPI-locked file). Never in a config file, a log or chat. The raw key bytes are dropped after the key is opened; the server process keeps only a usable key object.
- **Account:** the same owner-only account and the same server row rules (RLS) as the app. The connector only reads (`select`); it has no write code yet.
- **Logs** go to stderr only, never contain notes or secrets. Tool errors are plain messages.
- **Privacy:** respects Allow AI and Allow AI while locked, as the app's own AI does (`src/ai/aiLock.ts`).
- **Prompt injection:** a note could contain text that tries to steer Claude. With read-only tools the worst case is that Claude reads other allowed notes. Writes (slice 4) get scopes and the Inbox.
- **Not done yet (later slices):** the connector does not yet appear in Settings > Connected devices and cannot be revoked from the app (slice 3); revoke for now by signing out everywhere in the app, then `logout`. Rate limits are slice 6. `npm audit` in CI covers the app only, not `mcp/`; run `npm --prefix mcp audit` yourself.
- **One-time step for `setup --google`:** add `http://127.0.0.1:53682/callback` to Supabase > Authentication > URL configuration > Redirect URLs. The email-code way needs nothing.

## Tests

- `npm test` (app): `src/sync/nodeInterop.test.ts` - Node's own `node:crypto` opens a record the app code sealed, and the reverse; a passphrase bundle unlocks to the same key; the shared files import only portable code.
- `npm run test:mcp`: `mcp/test/*` - tools against fixture data sealed with the real encryption (hiding, locks, deleted items, version changes, cards, cache), the server over the MCP protocol, sign-in and token renewal, key storage, the DPAPI file (Windows only).
- `npm run smoke:mcp`: starts the server as a real child process and calls it like Claude Desktop would. Add `-- --inspector` to also run the MCP Inspector command line (downloads it once).

## Online connector (B)

Plan: [plans/claude-connector-plan.md](../plans/claude-connector-plan.md), section B. **Built so far: slice 1 (the notebook spec) and slice 2 (sign-in door + an empty server).** Nothing is deployed yet. Claude can connect and run `ping`; every other tool says "not enabled yet" until slices 3 to 7.

### What it is

A Supabase Edge Function called `mcp` that claude.ai (web, desktop and phone) can use as a custom connector. It needs no PC to stay on. Claude never sees your password: you sign in with Learning Notes on a consent screen inside the app, tap **Allow**, and Claude gets a short-lived pass. It costs nothing on the free plan (about 500k calls a month). A free project pauses after 7 days of no use at all; the first call after that is slow, or you wake it in the dashboard.

### Set it up later (owner steps, about 15 minutes, once)

1. **Make the tables.** Supabase > SQL Editor > paste `supabase/migrations/20261111000001_oauth.sql` > Run. (Safe to run again.) Nobody's browser can read these tables.
2. **Deploy the function.** In a terminal in the repo folder:

   ```
   npx supabase functions deploy mcp --project-ref eludllranljtyasdoyaj --no-verify-jwt
   ```

   `--no-verify-jwt` is needed because claude.ai sends our own pass, not a Supabase one; the function checks it itself. Supabase fills in `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` by itself. Optional: `npx supabase secrets set ALLOWED_EMAIL=you@example.com` so only that account can approve (without it, any account that can sign in to the app can; today that is only you).

3. **Publish the app** (push to main as usual) so the consent screen exists at `https://learning-notes-app.pages.dev/#/connect`.
4. **Check it is alive.** Open `https://eludllranljtyasdoyaj.supabase.co/functions/v1/mcp/.well-known/oauth-authorization-server` in a browser. You should see a short JSON list of addresses.
5. **Add it in Claude.** claude.ai > Settings > Connectors > **Add custom connector**. Name: Learning Notes. URL: `https://eludllranljtyasdoyaj.supabase.co/functions/v1/mcp`. Leave the advanced client fields empty (it registers itself). Click **Connect**: a Learning Notes page opens, showing what Claude may do. Be signed in to Learning Notes in that browser first. Tap **Allow**; you return to Claude.
6. **Try it.** In a chat: "Use the Learning Notes connector to ping." The reply should say "pong".
7. **Disconnect** any time in claude.ai > Settings > Connectors. (A "Connected apps" list with a Revoke button inside the app comes with a later slice. Until then, signing out everywhere in the app does not end Claude's pass; delete the rows in `oauth_tokens` to cut it at once.)

### How it works

- **One address, three jobs** (`supabase/functions/mcp/index.ts`): the sign-in door and its metadata (`_shared/oauth.ts`), the tool server (`_shared/mcpHandler.ts`), and the tables behind them (`_shared/oauthStore.ts`, the migration). The logic files use only web-standard calls, so the same code runs in Node tests.
- **MCP Streamable HTTP, stateless:** claude.ai POSTs a JSON message and gets one JSON answer. No sessions and no open streams, so any copy of the function can answer.
- **Sign-in (OAuth 2.1):** claude.ai finds the door by itself (`/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server`, announced in the 401 reply), registers itself (`/oauth/register`), and sends the browser to `/oauth/authorize`, which checks the request and forwards it to the app's consent screen. The consent screen asks `/oauth/consent` (with your Learning Notes sign-in) for the details, shows what Claude may do, and on Allow gets a one-time code that goes back to claude.ai. claude.ai trades the code for a pass at `/oauth/token`.
- **Rules:** PKCE with S256 only; codes live 10 minutes and work once; the access pass lasts 1 hour and only works for this one address (audience); the refresh pass lasts 30 days and is replaced on every use, and using an old one cancels the whole chain (it means a copy was stolen). Only SHA-256 hashes of passes are stored. Redirects are limited to `https://claude.ai/api/...` and `https://claude.com/api/...` callbacks that match the registered ones exactly.
- **Permissions (scopes):** `notes:read` and `notes:write`. Write never includes delete. The tool list only shows what the granted scopes allow.
- **Tools registered now:** `ping` (works), and `search`, `read`, `create_notebook`, `add_page`, `add_cards`, `create_database`, `apply_style`, `refine_page` (say "not enabled yet"). There is no delete tool and there will not be one.
- **The notebook spec** (`src/connector/spec.schema.json`, checked by `src/connector/spec.ts`): one JSON document for a whole notebook (pages, blocks, cards, databases, style). Text is inline Markdown. Limits: 256 KB, 50 pages, 200 blocks per page, 500 cards. Unknown fields, non-https links, control characters and bad references (a page link to a page that is not in the spec) are refused with a message naming the exact place, e.g. `/pages/2/blocks/5/level: Must be 1, 2 or 3.` The local connector (A) can use the same file.
- **Why our own OAuth and not Supabase's built-in OAuth server:** Supabase now offers one (dynamic client registration, PKCE, refresh tokens). We did not use it because (a) it must be switched on in the dashboard and we could not confirm it is out of beta, (b) its passes are ordinary Supabase sign-in tokens for the whole project, not limited to one address, so a leaked pass could do more, (c) we need our own scopes and a hashed table to cut access in one step, and (d) it still needs a consent screen in the app, so most of the work is the same. `oauth.ts` is small and tested; we can switch later.
- **Why the consent screen is in the app:** Supabase Edge Functions on the default address cannot serve web pages (HTML is turned into plain text), so the function only redirects to the app.

### Edge cases

- Signed out when the consent screen opens: it says to sign in to Learning Notes first, then connect again from Claude (the request is not kept).
- Offline or the function is paused: the screen says it could not connect; nothing is stored.
- A wrong or tampered link: "This connection link is not valid"; the browser is never sent anywhere except a `claude.ai` or `claude.com` address.
- A pass used after an hour: 401 with the pointer, and claude.ai renews it by itself.
- Open registration: anyone can register a client, but only with a Claude callback, and registrations stop at 2,000 (a cleanup of old ones is a later job; `oauth_cleanup()` already removes expired codes and passes).
- A code that is used twice is refused (limit: the second use does not cancel the pass the first use made).

### Security check

- No secrets in code: the service key and anon key come from Supabase's own environment. The publishable key in `connectors/config.ts` was already public.
- RLS on, no policy, no rights for the app roles on the three new tables; only the function (service role) reads them.
- Content from notes is never put in errors or logs. The server instructions tell Claude that note text is data, not orders.
- Not yet built (later slices): the key escrow opt-in, the Inbox for big changes, the audit log, rate limits, the Connected apps list with Revoke. Do not put real notes behind this until slices 3 to 8 are done and reviewed.

### Tests

- `src/connector/spec.test.ts`: valid and invalid specs, every limit at its edge, exact error paths, 3,000 fuzz mutations (never throws), and checks that block types, column types and colours match the app's own registries and the JSON Schema.
- `src/connector/oauth.test.ts`: the RFC PKCE example, plain refused, registration (good and bad redirects, confidential clients refused), consent (needs sign-in, wrong account, deny), the whole code-to-token flow, single-use codes, expiry, audience, refresh rotation, replay cancels the chain, scope cannot widen, revoke, metadata, safe 500, and the Supabase requests (one atomic delete, one conditional update).
- `src/connector/mcp.test.ts`: 401, expired and wrong-audience tokens, origin guard, size limit, protocol versions, notifications, batches, scope-filtered tool list, `ping`, "not enabled yet", safe tool errors.
- `src/connector/connectRoute.test.ts`: the consent address and the Claude-only redirect check.
- The Deno side was not run (Deno is not installed on this PC); the tests run the same files in Node.
