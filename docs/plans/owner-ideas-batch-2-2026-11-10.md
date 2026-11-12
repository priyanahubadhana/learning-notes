# Owner ideas, batch 2 (10 Nov 2026)

Noted while batch 1 is being built. Test batch 1 first, then decide which of these are needed.

1. **Update progress as a thin top bar** (alternative to the corner pill of item 24): a slim bar at the top of the app showing "Updating 62% · about 10 s left", never covering the page. Compare with the pill after batch 1 ships and keep one.
2. **Acrobat-style PDF tools (owner asked what to add).** Recommendation:
   - Add: Organize pages (reorder, rotate, delete, extract, insert blank), Combine files into one PDF, Scan to PDF (camera → pages, already have camera), Recognize text / OCR for scanned PDFs (free Tesseract.js, lazy-loaded, on device), Fill & Sign (type into fields, saved signature drawn once, uses our ink), Export with my notes (PDF with highlights/ink flattened), Summarise/Ask (already have).
   - Skip for now: full Edit PDF text (heavy, fragile), Compress (little value), Set password (weak support in free libraries), Request e-signatures from others (needs a server and legal terms).
3. **Every bar customizable (after the current test-and-approval round).** One system for all bars (main tool bar, ribbon tabs like Text, the floating selection/format bar, micro text bar, reader bar, Lasso/picture strips): add, remove, reorder and group buttons, choose icon or icon+label, pin favourites, save per device or sync, reset to default, share presets. Builds on the existing toolbar layout record and Edit toolbar sheet (R7-10/R7-11). Owner screenshot: selection bar with Bullet List, B/I/U/S, align, colour, indent, link, Key point, Keyword, Must know, Formula, Blank, Card, Summary — user should choose which appear.
4. **Layers like GoodNotes (11 Nov 2026, after Friday review).** Put text over a picture, hide/show layers, tools act only on the active layer, export only visible layers. Start smaller: per-box bring to front / send to back and a hide toggle. Rework now (bugs-only allowed): Text tool box = one block for many lines (Enter adds a line inside the box; items inside move with it); waiting on owner's GoodNotes screenshots.
   - Owner reference (11 Nov, GoodNotes "How To Read Books" screenshot): one framed text box holding many lines and blank lines, side handles to resize width, floating bar (colour, size 26, font, B/I, align, list, cut/copy/delete). Copy this text box. GoodNotes' picture insert does NOT suit the owner; keep our picture approach. Build it after the owner finishes this round of bug testing and the results are recorded (owner, 11 Nov). Layers wait for the Friday review.
5. **Shrink box below its content (parked 11 Nov).** Drag a box smaller than its content to scale the text and pictures down, with a warning first ("Text and pictures will get smaller"). Default for now: not allowed.
6. **Text box ideas parked (11 Nov):** link two boxes with an arrow (mind-map style); send a box to the Summary; link a box to another page or a book highlight; ask AI about one box (explain, shorten, quiz). Later.
7. **Rotate a text box (parked 11 Nov).**
8. **Overlapping boxes like GoodNotes (parked 11 Nov).** After the basics.
9. **Interactive playground / guided tutor (parked 12 Nov).** In Help, a practice "playground" where a guide bot walks users through building a database, a dashboard and other advanced features hands-on (like a game's tutorial level), instead of reading docs.

## 10. Tags for everything (just "Tags"; never call them AI tags) (owner, 12 Nov 2026), decided

- Tag ANYTHING: books, articles, YouTube videos, LinkedIn posts, notes, highlights, cards, database rows, so one tag (e.g. "AI agents") gathers them all.
- The AI suggests tags; once the owner accepts a tag the first time, it is remembered and applied automatically next time (no re-asking for known tags). Everything stays editable.
- AI: Claude via the connector by default (₹0, own plan); option to use any AI later (paid AI only with cost approval).
- Structure: single tags grouped under categories; up to 3 levels (Category › Tag › Sub-tag); categories suggested by the AI, approved by the owner. A "tag map" (mind-map style tree) to view/edit the nesting.
- Tags section: hidden by default; Professional adds it with "+" (the full tag database). Search can filter by existing tags (already exists, extend it to all item types).

## 11. Universal AI bar + merged Knowledge (owner, 12 Nov 2026)

- One universal AI bar (always available at the top, every space) that holds every AI action: copy a ready prompt, paste the AI answer back, suggest tags, summarise, make cards, send to Claude via the connector. It replaces scattered buttons like the book page's "Copy prompt"/"Paste notes".
- Library: merge "Bank" into Knowledge. Knowledge gets sort/filter views for Daily Highlights, Study prompts and Export, plus an optional dashboard at the top (stats) that the user can switch off. No separate Bank tab.

## 12. AI mode (owner, 12 Nov 2026), decided so far
- Professional only. Its own "AI" space in the sidebar + the universal AI button/bar on every screen.
- Features: Ask my notes (chat with citations), Tutor/quiz me, Playground, Auto-organise, and the MAIN one: Jobs, where Claude turns captured sources (YouTube video transcript + frames, articles, posts) into app content (Library entry, notebook notes with frames, mind map, cards, tags) using the app's own tools.
- Destination: every job chooses where it goes (Library / an existing notebook / a new notebook / a section inside a notebook, under Advanced). The app remembers the path per tag/topic and routes similar items there automatically next time.
- Approval: Preview → Apply by default; a Settings switch "Apply automatically" once trusted.
- Prompt library = recipes kept in the existing database, filtered by tags (per AI and per job type), with a rating/success score per recipe, plus a Claude "prompt checker" that reviews recipes regularly and suggests updates when rules change (e.g. no need to tell it to compact).
- Engine: Claude via the connector first (₹0); built-in AI later only with cost approval; the same buttons for both.
- Capture path (phased): 1) now: drop transcript + frames into a job card; 2) our own small Chrome extension "Send to Learning Notes" (one click: URL, title, transcript, current-frame screenshots) → the app's Inbox; 3) automatic: Claude processes the Inbox via the connector (or a scheduled routine) and drafts the jobs for Preview.
