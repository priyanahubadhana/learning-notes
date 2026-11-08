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
- Each copy ends with a short "Copied" message (toast); the paste menu item says "Pasted".

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

- Unit: `src/editor/clipboard.test.ts` (plain text, cleaning, embedding pictures, copy results, paste key, plain insert).
- Browser: `e2e/copyPaste.spec.ts` (formatting, link and picture kept on the same page, another page and another notebook, also after a reload; block menu, page menu and Toolbar menu copy items with "Copied"; page with pictures has HTML with data: pictures and text; fallbacks when the browser blocks; Paste as plain text by menu and Ctrl+Shift+V; cleaned pasted HTML).
