# Copy and paste

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Moving words, pictures and whole pages in and out of the app without losing what matters, and a way to paste without formatting.

## How it works

- **Normal copy and paste** (Ctrl/Cmd+C, Ctrl/Cmd+V, long-press menus) is the editor's own: text, bold and other marks, links, pictures and card blocks stay when pasting into the same page, another page or another notebook. Pictures are kept in the app and travel as app picture references, so they work when pasting inside the same app.
- **Copy as plain text / Copy as Markdown** (`src/editor/clipboard.ts`, `copyAs`): in the block menu (⋮⋮ handle, for that block), in the docked bar's ⋯ Toolbar menu (for the selected words, or the block with the cursor), and in the page ⋯ menu as _Copy page as plain text / Markdown_ (whole page). Markdown comes from the editor's own export (lossy: some styles are dropped). Plain text is one block per line, links give their words, table rows are tab-separated.
- **Copy page with pictures** (page ⋯ menu and Toolbar menu): puts HTML and plain text on the clipboard together (`ClipboardItem`). Pictures are read and embedded as `data:` URLs so the page pastes into Word or Gmail with its pictures; internal ids and editor attributes are removed. If the browser blocks rich copy, the plain text is copied and the message says "text only".
- **Paste as plain text**: _Paste as plain text_ in the page ⋯ menu and the Toolbar menu reads the clipboard's text (Clipboard API `readText`) and inserts it as words; line breaks become new paragraphs. Ctrl/Cmd+Shift+V does the same without any permission (the key is noted, then the next paste event is read as `text/plain`). If the browser refuses, a message says to press Ctrl+Shift+V (Cmd+Shift+V on a Mac).
- **Cleaning pasted HTML** (`sanitizePastedHtml`): HTML from other apps and web pages is cleaned before the editor reads it. Allowed elements: text, headings, lists, quotes, code, links, pictures, tables. Scripts, styles, frames, objects, SVG, forms, buttons, comments and every attribute other than `href`, `src`, `alt`, `colspan`, `rowspan` are removed. Links must be http, https, mailto or tel; picture addresses must be http(s), `lnimg:` (this app) or `data:image` png, jpeg, gif or webp. Unknown elements are unwrapped (their words stay). The editor's own copies (marked `blocknote/html`) skip the cleaning so nothing is lost.
- **Notion and toggles:** `details` and `summary` are kept (attribute `open` only), so Notion toggles, nested toggles and toggle headings paste as Toggle list blocks with their children; `figure.callout` becomes a Callout (icon kept); empty paragraphs become one blank line. Text colour and highlight classes are dropped (not supported by the sanitiser).
- **Rows as text (9 Nov):** `tsvToRows` turns tab-separated text into a Table block (limits 500 rows, 50 columns, 200k characters); no heading is made from the first line.
- **Paste pipeline (9 Nov, `editor/pasteFlow.ts`, `pasteSources.ts`):** our own copies keep everything (BlockNote handler). Otherwise: text/html first (cleaned, and made structural by source: Google Docs spans and flat lists, Word `mso-list` paragraphs, Apple Notes big bold lines, Notion, ChatGPT / Claude / Gemini web: custom elements, code blocks, `role=heading`), then Markdown-looking text (headings, lists, pipe tables, fences, quotes, bold, links, task lists; also used when the HTML is flat but the text is Markdown, which is how Gemini copies often arrive), then tree drawings (`├── │ └──`) as a code block with spacing kept, then tab-separated rows (Table; Database when the HTML is a Notion database view: first column = title, header from `<th` or generated, column types guessed), then plain lines.
- **Paste chooser (9 Nov, `PasteChooser.tsx`):** a rich paste opens a small pop-up: Keep original format (default, Enter), Plain text, As table (only when tabular), each with a one-line preview; "Always use this" saves the choice; Esc cancels the paste. Settings › General › Paste: Ask each time / Keep format / Plain text (device). After the paste a chip "Pasted as" swaps the result (the paste is taken back with Undo, the other form put in). Ctrl/Cmd+Shift+V is still plain text. Not built: "As text box" on paper pages, "Clean up with AI" (DECISIONS).
- **A lone address (9 Nov):** a pasted YouTube address becomes the Embed block (start time kept, plays inline), another web address a Link card; the chooser offers Embed / Link card (default), Link, Plain URL, and the chip swaps them. Vimeo, Loom and direct .mp4 are not built yet (the Embed block knows YouTube and link cards only).
- Each copy ends with a short "Copied" message (toast); the paste menu item says "Pasted".
- **Copy writes every format (9 Nov, `src/editor/copyFormats.ts`):** Ctrl/Cmd+C or X of whole blocks, Lasso Copy, mini-bar Copy and block-menu Copy put rich HTML (headings, nested lists, tables, `<details>` toggles, cards as Q/A, links, code), clean Markdown and our own lossless format (`blocknote/html`) on the clipboard together; a single picture alone also goes as a PNG image. Pasting back into the app is identical blocks. The block menu has **Copy** and **Copy as…** (Markdown, Rich text, Plain text, HTML): one format each.
- **Paste chooser 4th row, Clean up with AI (9 Nov, `src/editor/cleanupAi.ts`, `CleanupDialog.tsx`):** shown when AI is on with a key and the pasted text is 40+ characters (rich) or 200+ (plain), up to 24,000. The dialog shows the editable library prompt "Clean up pasted text" and the cost first; the answer (Markdown, every fact kept, leftovers under "Not placed") is previewed with unplaced lines and missing numbers flagged; Insert runs the normal Markdown paste and the chip can swap back to Plain text. Nothing is sent before the cost is shown and the first-use privacy question is answered.
- **Paste chooser, As text box (9 Nov, `src/editor/pasteBox.ts`):** on a paper page a rich paste can go into a new box at the paste spot (the paper's `addBox` / `addBoxInOrder`), with a toast Undo (`removeBox`); not offered for an address or a database.

## Edge cases

- Safari asks for permission or a tap for the Clipboard API: the fallback messages explain what to do. Copying plain text falls back to the old copy command.
- Pictures pasted as `data:` URLs from outside stay as web addresses inside the block; they are not moved into the app's picture store (parked).
- A very big page with many pictures makes a big clipboard item.
- The Computer floating toolbar has no extra copy buttons; use the block menu, the page ⋯ menu or the shortcuts.

## Security check

- Pasted HTML is the only untrusted input: cleaned with an allow-list, parsed in a detached document (nothing runs or loads while cleaning), unsafe link and picture addresses removed. The editor's schema then limits what can exist.
- Validated: link and picture address schemes (`isSafeHref`, `isSafeSrc`).
- Data leaving the device: only what the user copies, to the system clipboard. Nothing is sent over the network.
- Deletes: none.

## Tests

- Unit: `src/editor/pasteSources.test.ts` (fixtures per source: Gemini, Google Docs, Word, Apple Notes, ChatGPT, Markdown, tree, Notion database), `src/editor/clipboard.test.ts` (plain text, cleaning, embedding pictures, copy results, paste key, plain insert).
- Browser: `e2e/pastePlaceholder.spec.ts` (no leftover "Enter text or type /" over a pasted address, in a page and in a new paper box), `e2e/pasteSources.spec.ts` (Gemini HTML, Markdown, tree, Notion database, chooser, chip swap, always-use), `e2e/copyPaste.spec.ts` (formatting, link and picture kept on the same page, another page and another notebook, also after a reload; block menu, page menu and Toolbar menu copy items with "Copied"; page with pictures has HTML with data: pictures and text; fallbacks when the browser blocks; Paste as plain text by menu and Ctrl+Shift+V; cleaned pasted HTML).
- Copy side: unit `src/editor/copyFormats.test.ts`; browser `e2e/copyFormats.spec.ts` (Ctrl+C formats and round trip, block-menu Copy, Copy as… Markdown).
- Clean up with AI: unit `src/editor/cleanupAi.test.ts`; browser (AI mocked) `e2e/pasteCleanup.spec.ts`.
- As text box: unit `src/editor/pasteBox.test.ts`; browser `e2e/pasteBox.spec.ts`.
