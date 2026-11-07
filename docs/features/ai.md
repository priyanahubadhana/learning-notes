# AI (Phase P, bring your own key)

**Status:** built 2026-11-07 (CR4 + Phase P part 1). Off by default; off per notebook by default.

## What it does

The user's own API key calls the provider straight from the browser. No server of ours, the user's account pays.

- **Settings › AI:** on/off, provider (Anthropic default, Gemini, OpenAI), model (default `claude-haiku-5-5`, $0.10 / $0.50 per million tokens), key, monthly cap (default $5, changeable), Allow AI per notebook.
- **Page actions** (book and note pages): Summarise and Key points (preview: Apply, Edit, Cancel), Cards from this page and **Cards from highlights** (an approval list: each card ticked or unticked on its own, then Make cards). Results are marked "Made with your AI" (Keep as mine, Remove); one Undo takes the whole result back.
- **Lasso › Convert to text:** the selected ink becomes a PNG. The sheet shows that picture and says only it is sent and where. Send (English and Hindi; each word kept in its own script) or **Maths to formula** (the model answers with LaTeX, inserted as a Formula block). Preview is editable: **Insert below** (after the block the ink sits on), **Replace the ink** (inserts and deletes the strokes), **Copy**. A toast offers Undo (removes the text; with Replace also brings the ink back).
- **Write pad › Read with: Scribble / AI:** AI mode is a canvas that records real strokes with pen pressure (mouse or finger = even pressure). Read sends a black-on-white PNG of the strokes and gets text back. Strokes are grouped into words by gaps (line by line); each word's mean pressure is normalised between the lightest and firmest word and mapped onto the weights the font has (Kalam: Light, Normal, Bold; Caveat: Normal, Bold). Even pressure (spread under 0.12) keeps the chosen weight. If the model's word count differs from the drawn words, every word gets the chosen weight. The preview shows each word's weight; Insert/Replace is one Undo step. `aiEngine` is a `WritePadEngine`.

## Technical

- `src/ai/provider.ts`: `AiCall` takes `images` (base64 PNG/JPEG with size). `imageTokens(w, h)` = w×h/750 after fitting 1568 px, +85 (errs high). `MAX_IMAGE_SIDE` 1568.
- `src/ai/providers.ts`: plain `fetch`. Anthropic: image blocks before the text, header `anthropic-dangerous-direct-browser-access: true`. OpenAI and Gemini (OpenAI-style): `image_url` with a `data:` URL. Text-only calls still send a string. **Retry:** 2 retries on 429, 5xx and dropped connections (about 1 s, then 3 s); a refused key (401/403) or a 400 is not retried. 90 s timeout per try. No cookies, no referrer.
- `src/ai/usage.ts`: `withinCap(…, images)` counts picture tokens before every call.
- `src/ai/vision.ts`: `runVision(config, 'handwriting' | 'latex', image)` with every check (on, key, cap), records usage, cleans fences, quotes and `$`. `blobToImage` scales to 1568 px.
- `src/ai/ConvertInk.tsx` (lazy from `ink/InkSurface.tsx`, portalled to the body), `src/ai/padRead.ts` (lazy from `editor/writePad/AiCanvas.tsx`), `editor/writePad/pressure.ts` (pure, unit-tested). The pad session carries `pageId` so the notebook's Allow AI is checked.
- **Key:** only in `localStorage` (`learning-notes:ai.key.<provider>`); never in Dexie, so never in a backup or sync (e2e checks the backup zip and every IndexedDB store).
- **CSP:** `connect-src` lists only the three provider hosts for AI.
- **First load:** all AI code is in late chunks (`npm run check:size`).

## Tests

Unit: `src/ai/ai.test.ts`, `src/ai/vision.test.ts` (vision body for each provider, retry, image cost, cap blocks the call), `src/editor/writePad/pressure.test.ts`. E2E (mocked Anthropic): `e2e/ai.spec.ts` (incl. cards from highlights), `e2e/aiVision.spec.ts` (Convert to text Insert/Undo, Replace + maths, notebook without AI, Write pad AI engine, key never in a backup).

## Not built yet (next steps)

Streaming (answers are short; DECISIONS), Ask this book, Story so far, a separate Settings › Permissions screen (the notebook list lives in Settings › AI), the learning companion, the local MCP server, the `NoteMaker` hook.
