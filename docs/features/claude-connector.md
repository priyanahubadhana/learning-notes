# Claude connector (local A: read and write; online B)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

Plan: [plans/claude-connector-plan.md](../plans/claude-connector-plan.md). Local connector (A) built so far: slice 1 (shared crypto + Node tests), 2 (read tools), 3 (its own revocable device) and 4 (write tools). The Inbox, audit screen and rate limits come in slices 5-6.

## Purpose

Lets Claude Desktop read your notes, and add to them (new notebooks, new pages, text at the end of a page, recall cards; never delete, never change existing text): "what did I write about mitochondria?", "quiz me on my due cards". It runs only on your PC. Your notes stay end-to-end encrypted on the server; the key never leaves your PC.

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

5. **Choose what Claude may do (optional).** `setup` writes `%USERPROFILE%.learning-notes-mcpconfig.json` with everything on:

   ```json
   {
     "scopes": { "read": true, "write:append": true, "write:create": true },
     "deviceId": "mcp-yourpc"
   }
   ```

   Set a part to `false` to stop offering it: `write:create` = `create_notebook` and `add_page`; `write:append` = `append_to_page` and `add_cards`; `read` = the read tools (appending needs reading). A broken file turns writing off, never on. Restart Claude Desktop after a change.

6. **Restart Claude Desktop** (quit from the tray icon, then open it). Ask: "List my Learning Notes notebooks." Setup also lists this PC in the app as **Claude (PC)**: Settings > Account > **Connected computers** > **Revoke** cuts it off at once (run `setup` again to reconnect). The SQL for that (`supabase/migrations/20261113000001_connector_devices.sql`) must be run once in Supabase first.

Check any time with `node mcp/dist/index.js status` (shows the device id and what is allowed). To remove the key from this PC: `node mcp/dist/index.js logout`.

If a notebook you expect is missing, Claude's answer says "N notebooks are hidden because Allow AI is off". To let Claude read everything that is not locked, start it with the environment variable `LN_MCP_READ_ALL=1` (add `"env": { "LN_MCP_READ_ALL": "1" }` next to `args`). Locked pages stay hidden anyway.

## How it works

- `mcp/` is its own small package (own `package.json`, TypeScript). `npm run mcp:build` bundles it, together with the app's own `src/sync/crypto.ts`, `hlc.ts` and `wire.ts`, into `mcp/dist/index.js`. The code is shared, not copied, so the app and the connector cannot drift apart. The app's own build and size check do not include `mcp/`.
- Claude Desktop starts `node mcp/dist/index.js` and talks to it through its input and output (stdio). **Nothing listens on the network.** (Only `setup --google` opens a short-lived listener on 127.0.0.1 while you sign in.)
- On the first question it downloads your encrypted records from Supabase, opens them with the key (in memory only; nothing is written to disk), and keeps a cache. It refreshes at most every 10 seconds, and only fetches what changed.
- Read tools:

  | Tool             | What it gives                                                                               |
  | ---------------- | ------------------------------------------------------------------------------------------- |
  | `list_notebooks` | Readable notebooks and page counts                                                          |
  | `list_pages`     | Pages of a notebook (optionally the sub-pages of one page)                                  |
  | `search_notes`   | Pages whose title or text has all the words, with a snippet                                 |
  | `read_page`      | One page as Markdown plus a `version` (changes when the page changes; used by writes later) |
  | `list_cards`     | Recall cards (question, answer, due) for a page or notebook                                 |
  | `due_cards`      | Cards due for review now                                                                    |

- Write tools (each needs its scope; every one starts from a fresh copy of the server and fails if the connection was revoked):

  | Tool                                                    | Scope        | What it does                                                                                                                                      |
  | ------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `create_notebook(spec)`                                 | write:create | A whole new notebook from a notebook spec (checked by `src/connector/spec.ts`, exact error places). Gets Allow AI on so Claude can keep using it. |
  | `add_page(notebookId, page, parentId?, parentVersion?)` | write:create | One new page, optionally a sub-page                                                                                                               |
  | `append_to_page(pageId, markdown, expectedVersion)`     | write:append | Markdown added at the END of a page. `expectedVersion` comes from `read_page`; if the page changed, nothing is written                            |
  | `add_cards(pageId, cards, expectedVersion)`             | write:append | Recall cards (question and answer, or cloze) at the end of a page                                                                                 |

  How a write is saved: new records only (never an overwrite), sealed with the shared crypto under the device id (`mcp-<pc>`) with a hybrid-clock stamp, so the app merges them like another device's changes. An append first touches the page record (compare-and-swap on the revision the version check used), then adds the blocks in one all-or-nothing call. A created notebook is saved last, so a stop half way leaves only invisible records. Blocks are marked as AI results ("Remove this AI result" removes them). One audit line per write goes to `connector_audit` (tool, ids, counts, never content). There is no delete tool and no way to edit existing text.

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
- **Revoke (slice 3):** each setup registers its sign-in session as a device (`connector_devices`). Revoke in the app marks it; the database then hides all records and key copies from that session and refuses every save, even while its pass is valid, and a revoked session can never register again. The connector checks the status before each server pull and each write and drops its in-memory notes. "Sign out on all devices" also still cuts it off.
- **Writes and prompt injection:** a note could try to steer Claude into writing. Writes can only ADD (no delete, no overwrite), scopes limit them, appends are version-checked, and the audit shows every write. Read results are not yet wrapped as untrusted data (B does that); slice 6 should add it. Rate limits are slice 6; the Inbox for edits of existing text is slice 5. `npm audit` in CI covers the app only, not `mcp/`; run `npm --prefix mcp audit` yourself.
- **One-time step for `setup --google`:** add `http://127.0.0.1:53682/callback` to Supabase > Authentication > URL configuration > Redirect URLs. The email-code way needs nothing.

## Tests

- `npm test` (app): `src/sync/nodeInterop.test.ts` - Node's own `node:crypto` opens a record the app code sealed, and the reverse; a passphrase bundle unlocks to the same key; the shared files import only portable code.
- `npm run test:mcp`: `mcp/test/*` - tools against fixture data sealed with the real encryption (hiding, locks, deleted items, version changes, cards, cache), the server over the MCP protocol, sign-in and token renewal, key storage, the DPAPI file (Windows only).
- `mcp/test/write.test.ts`: every write tool against fixture data (the app's own `openRecord` opens what was saved, clock stamps, order after hidden siblings, audit without content, a failed audit, the version check, a save by another device in between, edit locks, hidden and locked notebooks, a revoked device refused on every read and write, scopes and a broken config, the Markdown reader). `src/connector/mcpWriteParity.test.ts`: the generated record builder is current, appended order keys are valid for the app. `src/sync/connectors/connectorDevices.test.ts`: the list and Revoke calls.
- `npm run smoke:mcp`: starts the server as a real child process and calls it like Claude Desktop would. Add `-- --inspector` to also run the MCP Inspector command line (downloads it once).

## Online connector (B)

Plan: [plans/claude-connector-plan.md](../plans/claude-connector-plan.md), section B. **Built (all eight slices): the notebook spec, the sign-in door, the opt-in key escrow with Settings › Claude and Connected apps, the read tools, `create_notebook` and `add_page`, `add_cards`, `create_database`, `apply_style`, `refine_page` with the Inbox and the Activity list, rate limits, and the security review.** Nothing is deployed yet (deploying needs the owner's OK).

### What it is

A Supabase Edge Function called `mcp` that claude.ai (web, desktop and phone) can use as a custom connector. It needs no PC to stay on. Claude never sees your password: you sign in with Learning Notes on a consent screen inside the app, tap **Allow**, and Claude gets a short-lived pass. It costs nothing on the free plan (about 500k calls a month). A free project pauses after 7 days of no use at all; the first call after that is slow, or you wake it in the dashboard.

### Set it up later (owner steps, about 20 minutes, once)

You need: your Supabase project, a terminal in the repo folder, and the app published (push to main as usual). Nothing here costs money. Every step can be repeated safely.

1. **Make the tables.** Supabase > SQL Editor > New query. Paste one file, press Run, then the next (this order): `supabase/migrations/20261111000001_oauth.sql` (the sign-in tables), `supabase/migrations/20261112000001_claude_escrow.sql` (the escrow, the audit log and the write door) and `supabase/migrations/20261113000001_claude_rate_limit.sql` (the rate-limit counters; **without this one Claude's tools refuse to run**, on purpose). All are safe to run again. Nobody's browser can read these tables.
   1b. **Make the server secret** (needed for the key escrow). In a terminal, `openssl rand -base64 32` prints a long random text. Then run `npx supabase secrets set CLAUDE_ESCROW_SECRET=<that text> --project-ref eludllranljtyasdoyaj`. Keep a copy in your password manager only (never in this folder, a chat or a file in the repo). If you lose or change it, anyone who had turned Claude on must turn it off and on again (the old key copies cannot be opened); nothing else is lost.
2. **Deploy the function.** In a terminal in the repo folder:

   ```
   npx supabase functions deploy mcp --project-ref eludllranljtyasdoyaj --no-verify-jwt
   ```

   `--no-verify-jwt` is needed because claude.ai sends our own pass, not a Supabase one; the function checks it itself. Supabase fills in `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` by itself. Optional: `npx supabase secrets set ALLOWED_EMAIL=you@example.com` so only that account can approve (without it, any account that can sign in to the app can; today that is only you).

3. **Publish the app** (push to main as usual) so the consent screen exists at `https://learning-notes-app.pages.dev/#/connect`.
4. **Check it is alive.** Open `https://eludllranljtyasdoyaj.supabase.co/functions/v1/mcp/.well-known/oauth-authorization-server` in a browser. You should see a short JSON list of addresses.
5. **Add it in Claude.** claude.ai > Settings > Connectors > **Add custom connector**. Name: Learning Notes. URL: `https://eludllranljtyasdoyaj.supabase.co/functions/v1/mcp`. Leave the advanced client fields empty (it registers itself). Click **Connect**: a Learning Notes page opens, showing what Claude may do. Be signed in to Learning Notes in that browser first. Tap **Allow**; you return to Claude.
6. **Try it.** In a chat: "Use the Learning Notes connector to ping." The reply should say "pong".
7. **Turn Claude on inside the app.** Settings › Claude: read the privacy text, pick the notebooks (all by default), type your sync passphrase, tap **Turn on**. Until you do, every notes tool answers "Claude is not allowed to open your notes".
8. **Try the tools.** In claude.ai (one at a time):
   - "List my Learning Notes notebooks." / "Search my notes for mitochondria."
   - "Create a notebook about photosynthesis with a summary, three pages, a mind map and 10 recall cards."
   - "Add 5 recall cards to my page Mitochondria." (adds only)
   - "Make a database of my plants with columns Height, Kind and Last watered."
   - "Make my Biology notebook blue with the tab layout and grid paper."
   - "Read my page Mitochondria and tidy it up." Small tidy-ups apply at once; bigger ones wait in the **Inbox**.
9. **Check what Claude did.** In the app: Settings › Claude has three tabs. **Settings** (the switch and the privacy text), **Inbox** (changes waiting for you: tap _Show changes_ to see old text struck through and new text in green, then **Accept** or **Reject**) and **Activity** (every write, newest first; **Undo** next to a change that was applied at once opens the page's History, where the copy "before a change by Claude" is the one to restore).
10. **Disconnect** any time: Settings › Claude › Connected apps › **Revoke** (that one app), or **Turn off** (the key copy is deleted and every Claude pass stops), or claude.ai > Settings > Connectors.

#### If something does not work

| What you see                                    | What it means                                                              | What to do                                                 |
| ----------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------- |
| "Claude is not allowed to open your notes"      | Step 7 was not done, or it ran out after 30 days without use               | Settings › Claude › Turn on                                |
| "Claude access is not set up on the server yet" | The secret `CLAUDE_ESCROW_SECRET` is missing                               | Step 1b, then deploy again                                 |
| "Temporarily unavailable" (503)                 | The rate-limit table is missing or Supabase is down                        | Run the third SQL file (step 1); check the Supabase status |
| "Too many requests" (429)                       | More than 60 reads or 20 writes in a minute, or 500 writes in a day        | Wait the seconds it says; Claude retries by itself         |
| A page Claude changed is not updated            | The app syncs now and then                                                 | Open Settings › Sync › Sync now, or wait a moment          |
| First call after a long pause is slow           | A free Supabase project sleeps after 7 days unused                         | Wait, or wake it in the dashboard                          |
| A change "waits in the Inbox"                   | It was big, touched recall cards, or the page changed after Claude read it | Settings › Claude › Inbox                                  |

### How it works

- **One address, four jobs** (`supabase/functions/mcp/index.ts`): the sign-in door and its metadata (`_shared/oauth.ts`), the tool server (`_shared/mcpHandler.ts`, tools in `_shared/claudeTools.ts`), the app's own addresses `/escrow` and `/connections` (`_shared/escrow.ts`), and the tables behind them (`_shared/oauthStore.ts`, `_shared/claudeStore.ts`, the migrations). The logic files use only web-standard calls, so the same code runs in Node tests.
- **MCP Streamable HTTP, stateless:** claude.ai POSTs a JSON message and gets one JSON answer. No sessions and no open streams, so any copy of the function can answer.
- **Sign-in (OAuth 2.1):** claude.ai finds the door by itself (`/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server`, announced in the 401 reply), registers itself (`/oauth/register`), and sends the browser to `/oauth/authorize`, which checks the request and forwards it to the app's consent screen. The consent screen asks `/oauth/consent` (with your Learning Notes sign-in) for the details, shows what Claude may do, and on Allow gets a one-time code that goes back to claude.ai. claude.ai trades the code for a pass at `/oauth/token`.
- **Rules:** PKCE with S256 only; codes live 10 minutes and work once; the access pass lasts 1 hour and only works for this one address (audience); the refresh pass lasts 30 days and is replaced on every use, and using an old one cancels the whole chain (it means a copy was stolen). Only SHA-256 hashes of passes are stored. Redirects are limited to `https://claude.ai/api/...` and `https://claude.com/api/...` callbacks that match the registered ones exactly.
- **Permissions (scopes):** `notes:read` and `notes:write`. Write never includes delete. The tool list only shows what the granted scopes allow.
- **Tools:** read: `ping`, `list_notebooks`, `list_pages`, `search`, `read`, `list_cards`. Write: `create_notebook`, `add_page`, `add_cards`, `create_database`, `apply_style`, `refine_page`. There is no delete tool and there will not be one.
- **The app's own addresses** (only the signed-in app may call them): `GET/POST/PUT/DELETE /escrow`, `GET /connections`, `POST /connections/revoke`, `GET /activity` (the audit list: tool, time, ids and counts, never text).
- **The notebook spec** (`src/connector/spec.schema.json`, checked by `src/connector/spec.ts`): one JSON document for a whole notebook (pages, blocks, cards, databases, style). Text is inline Markdown. Limits: 256 KB, 50 pages, 200 blocks per page, 500 cards. Unknown fields, non-https links, control characters and bad references (a page link to a page that is not in the spec) are refused with a message naming the exact place, e.g. `/pages/2/blocks/5/level: Must be 1, 2 or 3.` The local connector (A) can use the same file.
- **Why our own OAuth and not Supabase's built-in OAuth server:** Supabase now offers one (dynamic client registration, PKCE, refresh tokens). We did not use it because (a) it must be switched on in the dashboard and we could not confirm it is out of beta, (b) its passes are ordinary Supabase sign-in tokens for the whole project, not limited to one address, so a leaked pass could do more, (c) we need our own scopes and a hashed table to cut access in one step, and (d) it still needs a consent screen in the app, so most of the work is the same. `oauth.ts` is small and tested; we can switch later.
- **Why the consent screen is in the app:** Supabase Edge Functions on the default address cannot serve web pages (HTML is turned into plain text), so the function only redirects to the app.

#### The key escrow (slice 3): "Let Claude work with my notes"

- **Why it exists.** Notes are end-to-end encrypted, so the server cannot read them. For Claude on claude.ai (web, phone) to read or write, the server must be able to open the key for a moment. That is an honest trade of some privacy for convenience, so it is **off by default** and the Settings text says so in plain words: what is sent, who can open the notes while it is on, that Anthropic handles the text Claude reads, that it switches itself off.
- **Turning on** (Settings › Claude): the person picks the notebooks (default all) and types the sync passphrase. The app checks it on the device (it opens the key copy from the server with Argon2), then sends the key once over HTTPS to `/escrow`. The passphrase itself never leaves the device. The function checks that the key really is this person's (it must open one of their records), wraps it with AES-256-GCM under a key made by HKDF-SHA-256 from the server secret (`CLAUDE_ESCROW_SECRET`) and the user id, and stores only the wrapped copy in `claude_escrow` (RLS on, no policy, no rights for the app roles, so no browser can read the table). Without the secret, a database leak opens nothing.
- **Each Claude call** unwraps the key in memory (as a non-extractable key; the raw bytes are wiped at once), reads or writes, and drops it. Nothing decrypted is kept between calls.
- **Turning off** deletes the row and all of the person's Claude passes at once.
- **Expiry:** 30 days without a Claude call deletes the row and the passes (checked on every use, and by `claude_escrow_cleanup()`, which the function calls at most once an hour). A call after the expiry says why and how to turn it on again.
- **Notebook choice:** a list of notebook ids kept with the escrow (`null` = all). Claude sees and writes only those. A notebook Claude creates is added to the list. The choice can be changed any time without the passphrase.
- **Connected apps** (`/connections`, `/connections/revoke`): the live connections of this person (name, last active, permissions) with **Revoke**; only your own connections can be revoked.
- **Who may call these addresses:** only the signed-in app (a Supabase sign-in token checked with Supabase Auth, plus `ALLOWED_EMAIL` if set); CORS only for the app's address.

#### Read tools (slice 4)

- Each call pulls the person's encrypted records, opens them in memory with the shared code (a small Deno copy of the app's record crypto: `_shared/e2e.ts`, `wire.ts`, `markdown.ts`; `src/connector/parity.test.ts` proves the copies behave exactly like the app's and the local connector's), and answers. Rules as the local connector and the app's AI: only the chosen notebooks; locked pages and notebooks stay hidden unless the notebook allows AI while locked; deleted items, pages under a deleted page, paused pages (cards) and the hidden database notebook never show.
- **Note text is data.** Every result that carries note text is wrapped: a header saying it is untrusted data and not instructions, then an `untrusted_note_content` element around the text. A note cannot close the envelope: any spelling of the marker inside the text is defused. `read` returns the page as Markdown (cut at 60,000 characters with a note) plus a `version` (changes when the page changes).
- Limit: at most 60,000 records per call (a bigger library is told to use the local connector). Each call downloads all records: fine for a normal library, slow for a huge one (a lighter pull needs a server change).

#### Write tools (slice 5)

- `create_notebook(spec)`: the spec is checked by `spec.ts` first (the Deno copy `_shared/spec.ts` is generated from it with `node scripts/sync-connector-spec.mjs`; a test fails if it is out of date). A bad spec is refused whole with the exact place (`/pages/2/blocks/5/level: ...`) and **nothing is written**. Mind maps, databases and database blocks are refused with a plain message (slice 6).
- `add_page(notebookId, page, parentId?, parentVersion?)`: one new page (the page shape of a spec) in a chosen notebook, optionally as a sub-page. The notebook must be in the person's choice and not edit-locked; the parent must be in the same notebook and readable. If `parentVersion` (the `version` from `read`) is given and the parent changed since, nothing is written ("Read it again").
- **What is written:** the app's own records (notebook with the default tabs, pages, blocks, recall cards) in the app's shapes (`src/core/types.ts`), new ids only, saved as sealed records with "must be new" (`base_rev` 0), so an existing record can never be overwritten. Each record carries the device id `claude-remote` and a hybrid-logical-clock stamp (time, a counter that keeps one call's records in order, the device id), so the app merges them like any other device's. Blocks, cards and pages are saved first and the notebook (or page) last: a stop half way leaves only records nothing points to, never a notebook with holes. The save (`claude_push`) is all or nothing per chunk of 1,000 records.
- **Marked as an AI result:** blocks have `source: 'ai'` and one `batchId` per call, so the app's "Remove this AI result" can take a whole creation away.
- **Text:** inline Markdown (bold, italic, code, https links) becomes the editor's rich text, the same as the app's own import; nothing else is read as markup (no HTML, no scripts, no non-https links). Code blocks are literal. `{{word}}` in a cloze card becomes a blank with its own card record; a question and answer becomes a Card block with the answer as a child. The notebook summary becomes a callout at the top of the first page; recall cards go under a "Recall cards" heading on the page they name (or the first page).
- **Audit log:** one line per write in `claude_audit`: time, tool, which connection, the notebook and page ids (at most 60) and counts. Never any content.
- **No delete and no overwrite** exists in these tools: new ids only, saved as "must be new".

#### Slice 6: mind maps, databases, cards, styles

- **Mind maps and databases in `create_notebook` / `add_page`.** A `mindMap` block takes an indented outline and becomes an editable tree (not a picture), exactly as the app builds it from an outline (`_shared/mindmap.ts` is a copy of `fromOutline`; `parity.test.ts` compares the trees). A spec's `databases` list becomes real databases in the new notebook and `database` blocks show them on a page.
- **A database** is saved as the app stores one: the database, its columns (text, number, date, checkbox, choice, choices, url; choices become options with ids), the three starter views (Table, Dashboard, Board), and one row page per row (`Page.databaseId`, cells by column id, choice cells hold option ids, empty cells and unticked boxes are left out). A `database` block also gets its own Table view. The database record is saved last of its parts. Row pages are not listed by `list_pages` (they are rows, not notes); `search` still finds them.
- **`add_cards(pageId, cards[], pageVersion?)`**: question/answer cards and fill-in-the-blank cards go at the end of an existing page under a "Recall cards" heading (not repeated). Only adds new blocks and card records; the page record is not touched. Validated by `spec.ts` (the cards part of a spec).
- **`create_database(notebookId, database, pageId?)`**: one database (the spec database shape) in a notebook, optionally shown at the end of a page.
- **`apply_style(notebookId, style?, pageId?, tabColour?)`**: `style` is the spec style. Layout and theme of the notebook: `colour` (cover), `view` (shelf/tabs), `pathStyle`. Paper of its pages (or one page): `sheet` (A4/Letter) and `inkBg` (lined/grid/dots). `tabColour` for one page. This edits existing records, so each edit names the revision it was made from (`baseRev`): a record that changed meanwhile makes the whole call fail with "Something changed while saving" and nothing is written. Values that are already set are skipped. The paper boxes and the ink are never touched (the box layout is being redesigned).

#### Slice 7: `refine_page`, the Inbox and the Activity list

- **`refine_page(pageId, ops[], baseRevision)`**: `read` now also returns the block ids (inside an envelope) and the page `version`. Each operation changes **one block**: `{op:"add", block, parentId?}` (at the end of the page or of a block's children), `{op:"insert", afterBlockId | null, block}` and `{op:"replace", blockId, block}` (the block keeps its id, place and children; a replacement has no children). At most 50 operations; every block is checked by the spec rules, with error paths like `/ops/2/block/level`; database and page-link blocks cannot be made here. There is no delete operation.
- **Applied at once** only when the change is small (replaced + added blocks are 30% or less of the page after the change), touches no recall card, and the page is still as Claude read it (`baseRevision` equals the current `version`). Then the page as it was is saved first as a History copy (`pageVersions`, reason "before a change by Claude", in the same all-or-nothing save), the blocks are written against the revisions that were read, and the page record is bumped. A block the person wrote is **never** marked as an AI result (so "Remove this AI result" cannot take it away); new blocks are.
- **Goes to the Inbox** when the change is over 30%, **or** touches cards (a card block or a block with blanks is replaced, a card block is added, or anything is added under a card), **or** the version is stale, **or** the save finds the page changed between the read and the save. Claude is told plainly that it was _not_ applied. The Inbox item is an ordinary **end-to-end encrypted synced record** (table `claudeInbox`, written by the function with the same key as every other record), so no new server table holds note text and it works offline once synced.
- **The Inbox** (Settings › Claude › Inbox): each item shows the page, why it waits, and _Show changes_ (the new block in green, a replaced block's current text struck through, where a new block goes). **Accept** saves the page to History first (the app's own `recordVersion`), applies the operations in one step (new blocks get their place from the current neighbours), makes the recall cards, marks only the new blocks as an AI result and closes the item. If a block Claude wanted to replace is gone the item says so and only Reject remains. **Reject** closes it and changes nothing. Accepting twice does nothing more.
- **A server-made History copy cannot include ink.** It is marked `inkKept`: restoring it leaves the page's ink as it is (otherwise a restore would have soft-deleted the ink).
- **The Activity list** (Settings › Claude › Activity) asks `/activity` for the audit lines and looks the titles up on the device. **Undo** appears for a change applied at once and opens the page's History dialog.
- Both screens and the tab bar are loaded only when Settings › Claude is opened (first download stays under the limit).

#### Slice 8: rate limits

- 60 reads a minute, 20 writes a minute and 500 writes a day, **per person**, counted in the table `claude_rate` by the function `claude_rate_hit` (one atomic step, so two calls at the same instant cannot both slip under). `ping` is free. A call over the limit is refused with **HTTP 429 and `Retry-After`** before anything runs; a refused call is not counted; a batch is refused whole. If the counter cannot be reached the request gets **503** and nothing runs. Old counters (and audit lines older than 90 days) are removed by `claude_rate_cleanup()`, which the hourly cleanup calls.

### Edge cases

- Claude is not turned on in the app (or it expired): every notes tool says so in one sentence and how to fix it. `ping` still works.
- The server secret is missing: Settings › Claude says "This is not set up on the server yet" and the tools say the same.
- The server secret was changed: the tools say to turn Claude off and on again.
- The workspace has not synced yet (a brand new account): `create_notebook` asks to open the app once first.
- A save that fails half way: nothing is visible (see above) and Claude is told "Nothing was changed".
- A wrong passphrase: the red line of the normal unlock box (3 tries, then waits). The key is never sent.
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
- **Escrow (slices 3 to 5):** the key reaches the server once, over HTTPS, only from the signed-in app after the passphrase; it is stored only wrapped with a secret that is not in the database; the raw bytes are wiped after use; `claude_escrow`, `claude_audit` and the OAuth tables have RLS on with no policy and no rights for app roles; `claude_push` and `claude_escrow_cleanup` are not callable by app roles. Nothing is logged except the audit line (no content). Error messages never carry note text or key material.
- **Honest limits:** while it is on, whoever controls the Supabase project and the function secret can open the chosen notebooks (that is the trade, said in the Settings text). A note could try to steer Claude (prompt injection): reads are wrapped as untrusted data, nothing can be deleted, edits of existing pages are small and undoable (History) or wait for the person. The review below is done; deploy only with the owner's OK.

#### Security review (OWASP API Security Top 10, 2023), 12 Nov

| #     | Risk                                            | How it is covered                                                                                                                                                                                                                                 | Found and fixed                                                                                                                    |
| ----- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| API1  | Broken object-level authorization               | Every record is read by the account id of the access pass; ids from Claude are only looked up inside that person's records, inside the chosen notebooks; locked pages hidden; the app's own addresses act only on the signed-in person's own rows | Row pages of databases no longer pad lists                                                                                         |
| API2  | Broken authentication                           | OAuth 2.1 with PKCE S256, single-use codes, audience-bound 1-hour passes, rotating refresh passes with replay detection; hashes only stored                                                                                                       | none                                                                                                                               |
| API3  | Broken object property-level authorization      | Specs and operations reject unknown fields; only whitelisted fields are written; replaced blocks keep their id, place and children                                                                                                                | A replaced block was marked as an AI result, so "Remove this AI result" could have removed text the person wrote: no longer marked |
| API4  | Unrestricted resource consumption               | Body 300 KB, spec 256 KB, 50 operations, 50 pages, 500 cards, 1,000 rows, 60,000 records per call, **rate limits**, 429 with Retry-After                                                                                                          | Rate limits added (slice 8)                                                                                                        |
| API5  | Broken function-level authorization             | Each tool needs its scope; write tools only with `notes:write`; `/escrow`, `/connections`, `/activity` need the signed-in app (Supabase token, `ALLOWED_EMAIL`) and CORS only for the app                                                         | none                                                                                                                               |
| API6  | Unrestricted access to sensitive business flows | The escrow is off by default, needs the passphrase typed in the app, expires after 30 days, and turning it off cancels all passes                                                                                                                 | none                                                                                                                               |
| API7  | Server-side request forgery                     | The function never fetches an address from a note or a tool call; embeds and links are only stored (https only)                                                                                                                                   | none                                                                                                                               |
| API8  | Security misconfiguration                       | RLS on with no policy on every Claude table, rights revoked for app roles, secrets only in the environment, Origin check, `nosniff`, no stack traces, plain error messages                                                                        | `X-Content-Type-Options: nosniff` added; the counter failing closed (503)                                                          |
| API9  | Improper inventory management                   | Every address is listed in this file ("How it works"); one function, one version                                                                                                                                                                  | `/activity` documented                                                                                                             |
| API10 | Unsafe consumption of APIs                      | Supabase answers are parsed defensively; `retry_after` is clamped; a failing audit write never undoes a save                                                                                                                                      | none                                                                                                                               |

Also reviewed, "untrusted note content": **(1)** the page title and notebook title were printed _beside_ the envelope in `read` (a title is note text): now inside it; **(2)** `add_page` repeated the notebook title in its answer: now the id; **(3)** the envelope's end marker could be guessed: it now carries a random mark per answer (`id="…"`) on both ends, and every spelling of the marker inside note text is still defused; **(4)** the block index (a preview of each block) is inside its own envelope. Not covered by any code: Claude itself deciding to follow an instruction hidden in a note. What limits the damage is that nothing can be deleted, edits are undoable or wait in the Inbox, and writes are rate limited and audited.

### Tests

- `src/connector/spec.test.ts`: valid and invalid specs, every limit at its edge, exact error paths, 3,000 fuzz mutations (never throws), and checks that block types, column types and colours match the app's own registries and the JSON Schema.
- `src/connector/oauth.test.ts`: the RFC PKCE example, plain refused, registration (good and bad redirects, confidential clients refused), consent (needs sign-in, wrong account, deny), the whole code-to-token flow, single-use codes, expiry, audience, refresh rotation, replay cancels the chain, scope cannot widen, revoke, metadata, safe 500, and the Supabase requests (one atomic delete, one conditional update).
- `src/connector/mcp.test.ts`: 401, expired and wrong-audience tokens, origin guard, size limit, protocol versions, notifications, batches, scope-filtered tool list, `ping`, "not enabled yet", safe tool errors.
- `src/connector/connectRoute.test.ts`: the consent address and the Claude-only redirect check.
- `src/connector/claudeTools.test.ts` (slices 6 to 8 at the end): mind maps, databases (every column type, option ids, views, row pages, database block and its view), `add_cards`, `create_database`, `apply_style` (revisions, locks, "nothing to change"), `refine_page` (apply at once with the History copy saved first, exactly 30%, over 30%, every card case, stale version, a change landing between read and save, every bad operation, no delete), rate limits (60 reads, 20 writes, 500 a day, Retry-After, free ping, per person, batch, counter down), `/activity` (no content, owner only). Earlier: the escrow on, off and after 30 days; a wrong or junk key; another person's sign-in; Connected apps and Revoke (only your own); every read tool against a library sealed with the app's own crypto (locked, deleted and hidden notebooks, the notebook choice, the envelope and a note that tries to close it); `create_notebook` and `add_page` (every field of every record, the clock stamp, save order, the audit line with no content, invalid and unsupported specs write nothing, a failed save writes nothing, the version check, edit locks, existing records never rewritten).
- `src/connector/parity.test.ts`: a record sealed by the server opens with the app's crypto and the reverse; swapped ids, wrong revisions and other keys are refused; the key wrapping; the generated spec copy is current; the server Markdown and inline Markdown equal the local connector's and the app's; order keys are valid for the app's library.
- `src/connector/claudeClient.test.ts`: the app's calls to the function (method and address, the key sent once and wiped even when offline, plain reasons) and the notebook choice rules. `e2e/claudeSettings.spec.ts`: Settings › Claude off and on, a wrong passphrase, Revoke, Turn off (asks first), not set up on the server, phone width.
- The Deno side was not run (Deno is not installed on this PC); the tests run the same files in Node.
