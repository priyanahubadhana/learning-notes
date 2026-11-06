# Reading mode

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

The owner reads books and notebooks mostly. Reading mode turns a page (or a whole notebook, one page after another) into something calm to read: themes, fonts, size, spacing, a full-screen reader like Kindle, read aloud, bookmarks and "where I stopped". Built in batch 3; the Read tool set of batch 2d and the ribbon View tab items that said "coming" are real now. Toolbar side: [toolbar-ribbon.md](toolbar-ribbon.md). Lock: [lock.md](lock.md).

## How it works

- **Two ways in, both always there; Settings › Reading › _The Read button opens_ chooses which one the 📖 Read part of the Write · Draw · Read switch uses** (default: the page itself):
  - **In place** (`view = inPlace`): the open page itself with the Read tool set on the short bar. The editor stays (never rebuilt), with the reading look (colours, font, size, line spacing, margin, width), a progress chip ("42% · about 5 min left"), the ruler and the Read panels. Editing still works unless **Lock to reading** is on.
  - **Full-screen reader** (`view = reader`, tool _Full-screen reader_, page ⋯ menu, or the setting above): a fixed layer over everything (sidebar and top bar hidden), only the title and text. A tap in the middle shows or hides the top controls (close, contents, read aloud, look) and the bottom bar (seek slider, progress text); taps on the left and right quarter turn pages; swipes turn pages in paged mode; keys ← → PageUp PageDown turn pages; Esc leaves. The text is read-only. It is also the answer to "Lock to reading".
  - A **page or notebook can be set to "always open in Reading"** (switches in the Look panel; flags `readFirst` on the record, in backups). A page that is not set turns off a Reading mode that was turned on that way.
- **State** (`app/reading/readingState.ts`): `readingView` (`off | inPlace | reader`), `readingLocked`, kept in memory only. `useReadingSync` keeps the switch and Reading mode in step: Read on → on; Write or Draw → off (unless locked: the Read set stays and a message says why); a tool that starts Reading moves the switch to Read; the bar never switches sets by itself while reading.
- **Looks** (device settings, Settings › Reading, found by "reading", "dyslexia", "ruler" …): theme **Same as the app, Day, Night, Sepia, Paper, Dark contrast** (all pass 4.5:1, unit-tested); font **Same as notes, Serif, Sans-serif, OpenDyslexic** (free, SIL OFL 1.1, `@fontsource/opendyslexic` 5.3.0, loaded only when picked and kept for offline); text size 80–250 %; line spacing; margin; line width; **scroll or pages**; line focus; blanks; read aloud speed; keep screen awake. The Look panel (_Text size_, _Font_, _Zoom_ tools) changes the same settings while reading.
- **Scrolling or paged:** paged applies to the full-screen reader (CSS columns the width of the screen, moved by a transform; pages counted again whenever size, font or pictures change). In place a page always scrolls (the docked bar and the section chips live inside the page flow). Decision logged.
- **Progress** (`readingMath.ts`): scroll share, or page index; minutes left from the words still ahead at 220 words per minute ("about N min left", "finished").
- **Resume and bookmarks** (`readingMarks.ts`, this device only, per page): the block at the top of the screen (found again by id; share of the page as a fallback) is saved a moment after reading stops moving, when the app is hidden and when the page closes, and restored when Reading starts. At most 400 pages are kept. **Bookmarks** (up to 50 per page, one per block) are added from the Contents panel, listed, followed and removed.
- **Outline:** the _Contents and bookmarks_ panel lists the page's headings (nested by level); a tap jumps there.
- **Line focus / ruler:** _Line focus_ dims everything except about two lines; the _ruler_ marks one line. The band follows the mouse, or the last place tapped; Alt+↑ and Alt+↓ move it by a line. It never takes a tap.
- **Highlight while reading:** selecting words shows a small bar (Highlight, Look up, Read from here). Highlight puts the normal yellow highlight mark on the words through the editor even while the text is frozen, so it is saved with the page, and a message offers **Undo**. **Look up** opens the Wiktionary page of the first word in a new tab, only on that tap (an extra, see below).
- **Read aloud** (`readAloud.ts`, `speechChunks.ts`, `domSpeech.ts`, `aloudController.ts`; the free Web Speech API): speed 0.5–2× (Settings and panel), a choice of the device's voices, pause and resume, **words marked as they are spoken** (CSS Custom Highlight API; sentence marking where a voice gives no word events; nothing in the page is changed), **read from where you tap** (while reading, or "Read from here" on a selection), **keeps reading into the next page of the notebook** like an audiobook (`nextPage.ts`, depth-first with sub-pages), and a **sleep timer** of 10, 20, 30 or 60 minutes. Safari quirks handled: text is spoken in pieces of up to 180 characters (long utterances get cut off); a piece with no word-boundary events after 1.2 s is marked by sentence; `pause()` is replaced by a stop and a restart of the piece (Safari's resume is unreliable); changing speed or voice restarts the piece; our own `cancel()` errors ("canceled", "interrupted") are ignored and late events of an old utterance are dropped by a token; when the screen comes back after a lock and speech stopped or sits paused, the piece starts again. Speech stops when Reading mode ends or the page locks again.
- **Blanks (recall words):** softly marked by default (the same dashed tint as in the editor), so reading is smooth. The Read tools' _Self-test (hide blanks)_ switch (also in the Look panel and Settings) hides them; a tap shows or hides one again. Read aloud says "…" for hidden ones.
- **Tools made real:** View › Read group: Reading mode, Full-screen reader, Line focus, Read aloud, Contents and bookmarks, Self-test, Find, Lock (to reading), Exit reading; Home/View: Font, Text size, Zoom (all open the Look panel; if Reading is off they turn it on in place first). The Read set's default list is now Undo, Redo, Text size, Font, Theme, Find, Read aloud, Contents, Line focus, Lock, Exit reading, New line (people who edited their Read set keep theirs and can add the new tools in Edit bar). Pressed tools show an "on" mark and `aria-pressed`.
- **Extras from the research** (logged in DECISIONS.md): a daily **reading streak** (days with a minute of reading, on this device, shown in the Look panel and the reader), **Look up** a word, and **keep the screen awake** while reading (Screen Wake Lock, released on exit, asked again when the app returns).
- Every panel is a pop-up with a ✕ and follows the shared pop-up rule (outside tap, Esc, one at a time); scrolling the page does not close the Reading panels.

## Fonts (H1, 6 Nov 2026)

- One small font set for reading (Aa › Font) and notes (Aa › Style › Font), shown as tiles that preview your own sentence: Literata, Source Serif 4, Atkinson Hyperlegible Next, Lexend, OpenDyslexic, Caveat, Kalam (also Hindi), Patrick Hand, Shantell Sans. The old system Serif and Sans stay valid saved values but have no tile.
- `@fontsource/*` 5.3.0 (all OFL 1.1, exact versions), Latin plus Devanagari where the font has it; each is a lazy chunk (`app/reading/fonts.ts`) loaded only when picked or previewed and precached for offline. Licence text: `public/licenses/fonts-OFL.txt`.
- **Import font** (.ttf, .otf, .woff2, up to 10 MB): kept in the new `fonts` table (Dexie 15), in Everything backups, registered with the FontFace API when in use. Checked by its first bytes (`OTTO`, 00 01 00 00 or `true`, `wOF2`), never by its name. The picker says the user is responsible for the licence. Remove = soft delete. The saved font setting is `custom:<id>`.
- Tests: `src/core/fonts.test.ts`, `e2e/fonts.spec.ts`.

## Edge cases

- No speech support: the Read aloud panel says so; nothing else is affected.
- A page with no headings: "No headings on this page."; bookmarks still work.
- Pictures change the page length after load: paged mode and the progress measure again (resize observers).
- Hidden blanks in a card page: reading does not change cards or schedules.
- Reader on a database row page: only title and text show; row properties are hidden in the reader.
- The reader never shows a locked page (the lock screen comes first).

## Security check

- Device settings are validated on read (`isOneOf` lists); nothing is saved with the notes except the optional `readFirst` flag and highlight marks the person made.
- Look up sends only the one tapped word, only on a tap, to Wiktionary (opened in a new tab with `noopener,noreferrer`). Read aloud uses the device's own voices; no text is sent by this app. No new network traffic otherwise.
- New dependency `@fontsource/opendyslexic` 5.3.0 (OFL 1.1, fonts only, no code; pinned exactly; more than two weeks old); `npm audit` unchanged.
- Deletes: none. Highlight is one editor change with Undo.

## Tests

- Unit: `src/app/reading/readingMath.test.ts` (progress, minutes left, taps and swipes, theme contrast, speech pieces, reading order), `readingMarks.test.ts` (resume, bookmarks, streak), `readAloud.test.ts` (pieces, word marks, speed and voice, sentence fallback, pause and resume, errors, locked-screen restart, stop), `readingKeys.test.ts` (every text in English, Hindi and Spanish; the tools are real).
- Browser: `e2e/reading.spec.ts` (both ways in and the setting, every look setting and persistence, OpenDyslexic, progress, outline jump, bookmark add/use/remove, resume after leaving and reload, line focus and ruler, Lock to reading, always open in Reading, highlight while reading with Undo and reload, Look up, paged turns by tap, swipe and keys, scrolling reader and seek, read aloud with a pretend voice (marks, speed, voice, pause, stop, tap to read from, into the next page, sleep timer), blanks soft/hidden/tap, ribbon and control panel, phone fit in three themes). The WebKit project runs these too. The real iPad voices, screen lock and Safari's page behaviour are owner checks.
