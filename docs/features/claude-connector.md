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
