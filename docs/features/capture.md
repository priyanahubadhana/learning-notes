# Capture (sources inbox)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Bring a link, a video, an article or pasted text into the app as a source page you can read, highlight and turn into notes and cards. Master plan phase CR (CR1 here; CR2 to CR4 are added below as they are built).

## How it works

- **Screen:** Library › Capture, or the address `#/capture?url=&title=&text=` (prefilled; text is cut at 20,000 characters in an address). Fields: link (https only), title, text. The kind is detected: a YouTube link is a video (video id and start time `t=` are kept), another link an article, text alone a pasted text.
- **Result:** `captureSource` makes a page in the "Sources" notebook (kind `sources`, created once) with `Page.source` and the text as ordinary blocks (Markdown or plain text through `editor/textBlocks.ts`; pasted HTML is cleaned by `sanitizePastedHtml` first). The page shows the same header as a book, with "Open the original" for the link.
- **Honest limit (said on the screen):** a web app cannot read a video's transcript or most articles by itself (browsers block it), so the app fetches nothing. Ways in that cost nothing: paste; drop text or a link on the Library (computer); a Shortcut on iPhone and iPad (the screen gives the recipe and the capture address, because Safari has no Web Share Target); a bookmarklet for computers (title, link and up to 8,000 characters of selected text).

## Edge cases

- Non-https links are refused; empty input is refused; text over 2,000,000 characters is refused.
- The bookmarklet is set on the link by hand (React refuses `javascript:` addresses).

## Security check

- Nothing is fetched; no network call is made by Capture (a unit test replaces `fetch` and checks).
- Pasted HTML is sanitised; links in text are kept only if https.

## Tests

- `src/capture/capture.test.ts` (YouTube parsing, text and HTML to blocks, source creation, refusals, no fetch, bookmarklet), `e2e/library.spec.ts` (paste to a source page, prefilled address, filter chips).
