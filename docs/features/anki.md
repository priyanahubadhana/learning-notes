# Anki import and export

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Move cards between this app and Anki: read an Anki package (.apkg) into a new notebook, and save a notebook's cards as a package Anki can import.

## How it works

- Import, `src/anki/readApkg.ts`: unzips the package (fflate), reads `collection.anki21b` (zstd-compressed, via fzstd), `collection.anki21` or `collection.anki2`, opens it with sql.js (`sqlite.ts`, loaded only when needed) and reads notes, deck names and each note's first card deck. Pictures, sounds and review history are not read; the number of media files is counted so it can be reported.
- `importApkg.ts` (`importAnki`) makes one new notebook, one page per deck (a deck over 300 notes is split into pages, `NOTES_PER_PAGE`), "Basic" notes as Card blocks (front = question, other fields = answer lines) and "Cloze" notes as lines with blanks. Cards start New; Anki schedules are not carried over. Sub-decks "A::B" become the title "A › B".
- `ankiHtml.ts` keeps only text plus bold, italic and underline from Anki's HTML.
- Export, `exportApkg.ts`: a notebook's cards as an older-format .apkg every Anki version can import; one deck per page; blanks as Cloze; every card arrives New. A notebook with no cards is refused.
- `DataScreen.tsx` is the entry point and shows progress.

## Edge cases

- Notes with an empty front are skipped and counted.
- A package holding only Anki's "please update" placeholder note is refused.
- Old packages list media in JSON; new ones use a binary list, so the media count may be 0 there.
- Without a deck table, notes go in a deck called "Imported".

## Security check

- File size over 400 MB is refused before reading; the unzipped collection is also limited to 400 MB, and zstd data is unpacked in pieces so a "bomb" stops at the limit. Only the collection and a media list under 50 MB are unpacked.
- Not a zip, no collection, not a SQLite file, or no notes table gives a clear error.
- Imported HTML is reduced to text and three styles, so no markup or script reaches a note.
- Nothing leaves the device; the SQLite engine file is served by the app.
- Deletes: import only adds a notebook; nothing existing is changed.

## Tests

`src/anki/anki.test.ts`, `src/anki/ankiHtml.test.ts`; e2e: `anki.spec.ts`.
