# Recall cards

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Turn notes into flashcards. A Card block is a question with its answer nested inside. Selected words in a sentence can be made blanks, one card per blank.

## How it works

- `src/recall/cardService.ts`: `CARD_BLOCK_TYPE` is `'card'`. `cardParts(block)` lists the cards a block makes: `main` for a Card block plus one per blank id (`blankIds` in `src/editor/mapping.ts`).
- `syncCardRecords(db, pageId)` creates a scheduling record (`newCard`: due now, step 0, 0 reps) for each live card part that has none. Existing records are never touched. It is called after saves (`pageSync.ts`, `pendingStash.ts`, `PageEditor.tsx`) and after copy, template, version restore, journal, sample and Anki imports.
- `hasQuestion` is false for a Card block with no question text. `maskedText` shows a blank as "…".
- `src/editor/cardActions.tsx`: `makeCard` turns a text block (paragraph, heading, list item, quote, callout) into a Card; its children become the answer, or an empty answer line is added. `cardSlashItem` is the "/card" menu item; inside another card's answer it asks whether to nest or go to the next line.
- `src/editor/blankActions.ts`: `toggleBlank` gives selected words the `blank` style with a new id, or removes every blank the selection touches. `snapToWords` widens a selection to whole words (by code point, so emoji and other scripts work).
- `src/recall/cardList.ts`: `listCardRows` feeds the Card list block (a page and optionally its sub-pages, reading order). `cardStatus` is new, due, later or suspended; `dueLabel` formats the due date.
- `src/recall/emptyCards.ts`: `removeEmptyCards` soft-deletes empty Cards and moves their answer lines up; `restoreEmptyCards` undoes it.

## Edge cases

- Turning a card back into text (Undo) keeps its record and history; reviews skip it while it is not a live card.
- An empty Card is saved but left out of reviews and card lists until a question is typed. Blank cards always count.
- `makeCard` refuses blocks without text (for example code).
- Each conversion or blank change is one editor step, so Ctrl+Z undoes it.
- The selection must sit in one text block; across blocks nothing happens.
- Removing an empty Card skips ones that got a question meanwhile.

## Security check

- Input: card text and blank ids live in block content and go through the normal block save. `makeCard` checks the block type; `toggleBlank` ids come from `createId`.
- Data leaving the device: none found in these files.
- Deletes: card records are never deleted. Removing empty Cards is a soft delete (`deletedAt`) inside one transaction, with the old blocks kept for Undo.

## Tests

- `src/recall/cardService.test.ts`, `cardList.test.ts`, `emptyCards.test.ts`
- `src/editor/cardActions.test.ts`, `blankActions.test.ts`, `pageSync.test.ts`
- `e2e/cards.spec.ts`, `blanks.spec.ts`, `cardTools.spec.ts`

## Pictures in answers (E2)

A picture block inside a Card block shows in Review after Show answer (`CardFace.answer[].image`, an `lnimg:` reference). Ink sketches in answers: not yet (G0).
