# AI (Phase P, bring your own key)

**Status:** built 2026-11-07 (CR4 + Phase P parts 1 and 2). Off by default; off per notebook by default.

## Audit 9 Nov

Found and fixed (owner feedback, PC):

1. Settings > APIs said "Connections to AI services arrive in a later phase... Nothing is connected yet" while two keys were saved. Now **Connections**: each key with company, status, this month, Test, links to make a key, Manage in AI.
2. "Turn on AI features" off while keys exist gave no hint. Now an "AI is off" card (Turn on AI, Add a key) at the top of the AI page and in Ask this book, Prompts, Skills, Clean up with AI and Convert to text. Page actions (Summarise, Key points, cards) still hide when AI is off (open: no card there).
3. Monthly limit was typed in US$ while costs show the chosen currency. Now typed in the chosen currency and kept in US$ inside (also the per-key limit; fromCurrency / limitToInput in costCurrency.ts).
4. No place to see spend. New **Usage and cost** (UsageSection.tsx): bar, by key / model / feature / notebook, recent calls (time, feature, model, tokens in/out, cost), Export CSV; from the no-content send log, which now also keeps key id, model and tokens.
5. The AI intro said keys are "never synced" although opt-in key sync exists. Reworded.
6. Page order was mixed (limit between models and currency, usage after). Now: on/off, keys + models, spending, usage, then a button to Permissions.
7. Clean up with AI was logged as "prompt". Now "cleanup".
8. Not changed: Permissions still repeats spend per key and the sent table (kept as the privacy record); model picker has no separate off state beyond the top card.

Code: src/ai/{AiOffCard,aiOffStore,UsageSection,usageReport,ConnectionsSection}. Tests: usageReport.test.ts, e2e/aiUsage.spec.ts.

## What it does

The user's own API key calls the provider straight from the browser. No server of ours, the user's account pays.

- **Settings › AI:** on/off; **Your keys** (several, each named, e.g. "Claude main", "Gemini free": Add, Rename, Replace key, Test, Delete with a confirm; masked `sk-…abcd`; a monthly cap per key, the default cap is the field below); **Models** (one card per model: cost badge High / Medium / Low / Free tier, speed, "Reads pictures", short good and not-so-good lines, price per million tokens, which key serves it; drag the cards with finger, Pencil or mouse, or use Move up / Move down; the first card with a key is the default and the order after it is the fallback when a key fails or reaches its cap); this month's use per key.
- **Settings › Permissions** (Phase P): every notebook with its Allow AI switch (off by default) and **Uses: key and model**; spend this month per key; **Everything AI sent this month**: one row per request with date, notebook, feature, host and estimated cost (no content, no key; `ai.sendLog` on this device, at most 500 rows, this month only).
- **Allow AI while locked (R8-6):** a locked page, or any page of a locked notebook, is never sent to AI. Settings › Permissions shows "Allow AI while locked" under a notebook once its Allow AI is on (off by default); on, AI may read that notebook's locked pages when asked. Blocked actions say: "This page is locked, so AI will not read it. To allow it, turn on Allow AI while locked for this notebook in Settings › Permissions." Checked in `callAi` (`where: {db, pageId}`, `src/ai/aiLock.ts`), so every entry point obeys it; field `Notebook.allowAiLocked`, no new Dexie version.
- **Ask this book** (PDF and EPUB readers, ✦ Ask AI in the top bar while AI is on): ask about a chapter (from the PDF outline or the EPUB spine) or about pages you choose (PDF). **Show what will be sent** lists the words, which part, the host and the most it can cost, with the exact text to look at; only then Send. The answer streams in (Stop keeps what came) with citations `[p. 12]` / `[ch. 3]` as links that jump the reader. **Save to Summary** (under the book page's Summary heading, one Undo) and **Make cards** (the approval list).
- **Story so far:** a summary of what was read up to the reading position, nothing after it (PDF: pages 1 to the current page; EPUB: the chapters before and the read part of the current one; when that part is not known it is left out). Too long: the most recent reading is kept and the preview says so.
- **Streaming:** Ask this book and Story so far stream (Anthropic SSE, and the OpenAI-style SSE Gemini and OpenAI use). Stop counts the tokens sent and received so far toward the cap. Once part of an answer has shown, no fallback key is tried.
- **Choosing the key and model:** a notebook's own choice only (no silent fallback to another company, so a Private notebook never goes to a free Gemini key); otherwise the global order. Fallback applies to refused keys (401/403), no credit or rate limit (429), busy (5xx), no connection and a key at its cap. A refused request (400) stops at once.
- **Page actions** (book and note pages): Summarise and Key points (preview: Apply, Edit, Cancel), Cards from this page and **Cards from highlights** (an approval list: each card ticked or unticked on its own, then Make cards). Results are marked "Made with your AI" (Keep as mine, Remove); one Undo takes the whole result back.
- **Lasso › Convert to text:** the selected ink becomes a PNG. The sheet shows that picture and says only it is sent and where. Send (English and Hindi; each word kept in its own script) or **Maths to formula** (the model answers with LaTeX, inserted as a Formula block). Preview is editable: **Insert below** (after the block the ink sits on), **Replace the ink** (inserts and deletes the strokes), **Copy**. A toast offers Undo (removes the text; with Replace also brings the ink back).
- **Write pad › Read with: Scribble / AI:** AI mode is a canvas that records real strokes with pen pressure (mouse or finger = even pressure). Read sends a black-on-white PNG of the strokes and gets text back. Strokes are grouped into words by gaps (line by line); each word's mean pressure is normalised between the lightest and firmest word and mapped onto the weights the font has (Kalam: Light, Normal, Bold; Caveat: Normal, Bold). Even pressure (spread under 0.12) keeps the chosen weight. If the model's word count differs from the drawn words, every word gets the chosen weight. The preview shows each word's weight; Insert/Replace is one Undo step. `aiEngine` is a `WritePadEngine`.

- **Cost currency (Settings > AI):** pick any currency (searchable) and type its rate per 1 US dollar (default INR 90; others 1 until edited). All cost lines show it, formatted for the app language, plus tokens. Synced setting `ai.currency`; code in `src/ai/costCurrency.ts`, test `costCurrency.test.ts`, `e2e/costCurrency.spec.ts`. No live rates.

## Technical

- `src/ai/provider.ts`: `AiCall` takes `images` (base64 PNG/JPEG with size). `imageTokens(w, h)` = w×h/750 after fitting 1568 px, +85 (errs high). `MAX_IMAGE_SIDE` 1568.
- `src/ai/providers.ts`: plain `fetch`. Anthropic: image blocks before the text, header `anthropic-dangerous-direct-browser-access: true`. OpenAI and Gemini (OpenAI-style): `image_url` with a `data:` URL. Text-only calls still send a string. **Retry:** 2 retries on 429, 5xx and dropped connections (about 1 s, then 3 s); a refused key (401/403) or a 400 is not retried. 90 s timeout per try. No cookies, no referrer.
- `src/ai/usage.ts`: `withinCap(…, images)` counts picture tokens before every call.
- `src/ai/vision.ts`: `runVision(config, 'handwriting' | 'latex', image)` with every check (on, key, cap), records usage, cleans fences, quotes and `$`. `blobToImage` scales to 1568 px.
- `src/ai/ConvertInk.tsx` (lazy from `ink/InkSurface.tsx`, portalled to the body), `src/ai/padRead.ts` (lazy from `editor/writePad/AiCanvas.tsx`), `editor/writePad/pressure.ts` (pure, unit-tested). The pad session carries `pageId` so the notebook's Allow AI is checked.
- **Keys:** `src/ai/keyStore.ts`, in `localStorage` (`learning-notes:ai.keys`, a list of {id, provider, name, key, capUsd}); a key saved by the one-key version (`ai.key.<provider>`) moves in once. Never in a backup (the `secrets` table is in `share/fullFile.ts` `NEVER_SAVED`; e2e checks the backup zip). The notebook stores only a key **id** (`Notebook.aiChoice = {keyId, model}`), no secret; with keys on all devices the ids match everywhere, otherwise the default is used.
- **Keys on all devices (R6-2, opt-in):** Settings › AI › "Keep my AI keys on all my devices (locked with your sync passphrase)" (`src/ai/keySync.ts`; the switch is the device pref `ai.keysSync`, greyed out until Sync is set up). On: the list is mirrored into one `secrets` record (Dexie 22, fixed id `stableId('secret:aiKeys')`, value `{on, keys}`), which the sync engine locks with the master key like any record (`sync/tables.ts` rule `record`). A local change writes the record (`onKeysSaved`); a pulled record replaces the local list (`replaceKeys`, no echo) and the screens refresh (`onKeysArrived`). The switch travels in the record: off on one device → `{on: false, keys: []}` → every device turns its switch off and keeps the keys it has; on → the record's keys joined with this device's (by id, this device's copy wins). The mirror starts with the sync service (`startKeySync`), so it works without opening Settings.
- **Models:** `src/ai/models.ts` is the one table (id, provider, cost badge, speed, vision, price, `MODELS_CHECKED` = 2026-11-07). Prices come from the providers' pricing pages (Anthropic and Google read on 7 Nov; OpenAI's page refused the fetch, so its two models are marked "~" unverified). Gemini cards carry "Free; Google may use data to improve products." The order is the pref `ai.modelOrder`; `ai.modelKeys` maps a model to the key that serves it when a provider has several.
- **Routing:** `src/ai/route.ts`: `readAiConfig()` (candidates), `forNotebook(config, notebook)`, `callAi` (cap check per key, call, usage per key, fallback), `testKey`. `runAi` and `runVision` both go through `callAi`. Usage is per key (`ai.usageByKey`).
- **UI:** `AiKeys.tsx`, `ModelCards.tsx` (pointer-event drag on a `touch-none` grip; the cards stay put while dragging and a line shows the landing place), `AiSection.tsx`. No pop-up lists of our own (native selects only).
- **Book AI:** `src/ai/bookAsk.ts` (pure: marks, limits 60,000 characters, prompts, citations, reading position from the EPUB CFI, PDF chapters), `src/ai/bookText.ts` (PDF page text; EPUB opened again with foliate's EPUB class, section text), `src/ai/AskBook.tsx` (lazy from `reader/BookReader.tsx`, a side panel). `src/ai/providers.ts` `stream()`; `callAi` takes `onText`, `signal` and `log`. `src/ai/sendLog.ts`; `src/ai/PermissionsSection.tsx` (lazy from Settings).
- **CSP:** `connect-src` lists only the three provider hosts for AI.
- **First load:** all AI code is in late chunks (`npm run check:size`).

- **Prompt library and skills:** [prompt-library.md](prompt-library.md). `AiRequest.cachePrefix` / `AiCall.cachePrefix` puts a long text first and marks it for Claude prompt caching (cached tokens are counted in the usage); other companies get it in front of the prompt.

## Cost additions (built in AI framework slice 6)

Item 5 (prompt caching) and item 6 (real token count). Code: `src/ai/usage.ts` (`costOf`, `worstCost`), `src/ai/countTokens.ts`; tests `src/ai/costAdditions.test.ts` and `e2e/aiBook.spec.ts`. The count call is made for the Ask this book preview; the guess is shown as a muted "estimated" after the count in the cost line. A key already at its monthly limit sends no count call.

- When I send a long text with a cached prefix, the reusable part is marked for caching, and the cost shown includes any storage charge, so it is never lower than the real cost.
- When I open the preview of a page, the true token count is asked from the provider, if the provider offers one; the preview then shows that count.
- When I am offline, or the count call fails, the preview uses the 4-characters-per-token guess and says "estimated".
- The count call sends note text, so it follows every rule of a real call: AI on, a key present, the notebook's Allow AI switch, locked pages never sent, and a row in the send log.
- Providers without caching or counting work exactly as now.

### Won't do

- No count call when the notebook does not allow AI, even if the preview was opened.
- No estimate lower than the real cost (a cheaper re-read price alone does not count).
- No count call for locked pages, and no note text sent that the send log does not show.
- No new provider or key handling.

## Tests

Unit: `src/ai/picker.test.ts` (key storage and never in backup/sync code, model order, fallback on a refused key and on a cap, Test, per-notebook choice), `src/ai/keySync.test.ts` (keys reach the other device locked, the server holds no key text, off on one device is off everywhere and keys stay, turning on joins the lists), `src/ai/ai.test.ts`, `src/ai/vision.test.ts` (vision body for each provider, retry, image cost, cap blocks the call), `src/editor/writePad/pressure.test.ts`. Unit `src/ai/book.test.ts` (marks and cuts, citations, CFI and chapters, Claude and Gemini streams, Stop keeps the text and counts the cost, the cap blocks a streamed call, the log holds no content). E2E (mocked): `e2e/aiBook.spec.ts` (Ask on PDF pages with preview, stream, page link and the log; Story so far sends nothing ahead and Stop; the cap blocks with no request; EPUB chapter), `e2e/aiPicker.spec.ts` (keys, cards, keyboard and pointer order, notebook choice; chromium and ipad-webkit), `e2e/ai.spec.ts` (incl. cards from highlights), `e2e/aiLocked.spec.ts` (locked page blocked with no request, then allowed; unit block in `ai.test.ts`), `e2e/aiVision.spec.ts` (Convert to text Insert/Undo, Replace + maths, notebook without AI, Write pad AI engine, key never in a backup).

## Not built yet (next steps)

The learning companion and the local MCP server (later work, IDEAS); the `NoteMaker` hook; streaming for the page actions (Summarise, Key points, cards: short answers).
