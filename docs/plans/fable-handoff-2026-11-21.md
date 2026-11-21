# For Fable: where everything stands (21 Nov 2026, evening)

The owner has **paused all development** to talk with Fable about something important. Everything below is saved in the repo. Nothing is lost. Read this first, then only what the talk needs.

## State in one look

- **Phase:** phase-2-finish (docs/plans/phases/phase-2-finish.md), lean mode, Opus main chat + one Sonnet builder. Estimate before the pause: 15 to 18 days, plus 1 to 2 days for the customisers (estimate).
- **Code line:** `build/next` (preview: https://build-next.learning-notes-app.pages.dev). The live app has had no new code since 12 Nov.
- **Done on 21 Nov:** B1 (button list), B2 pictures (now approved), B10 leftovers, most of B11 test health (see docs/CHANGELOG.md, 21 Nov entries). Real app fixes that came out of B11: model card drag, micro bar place, phone drawer 24 px jump, big library load (16 s → 1 s on the iPad stand-in).
- **Paused mid-work (builder):** B11 rest. The hold-pen rule rework (tremor-safe numbers, DECISIONS 21 Nov), TB-28, and 30 more runs on five tests that did not fail again. Branch states: see "Builder at the pause" below.

## What the owner decided today (all logged in docs/design/owner-decisions.md, end of file)

- **Smart selection bar pictures approved** (C3, docs/mockups/smart-bar/png, pictures 1 to 22):
  - Cut, Copy and Delete join at the end; Link moves under ⋯.
  - The box ⋯ tab is removed; Thickness sits on the bar.
  - Five-place order: below, above, upright on the right, upright on the left, then under the top tool bar.
  - Names show on hover (not on hold).
  - Font strip uses the three existing quick fonts; size strip with a live sample.
  - **Customise bar…** reuses the tool bar's customiser ("do not build another thing, reuse what is built").
  - The Lasso gets a Customise entry; its options come later.
- **Spec to confirm:** docs/features/selection-bar.md now carries all of this, with a plain-words "Read this first". It waits for the owner's confirm.
- **HOLD-MOVE: A.** Writing never opens the press-and-hold strip. Our numbers (Pencil: 4 px radius, or steps of 1 px or more adding up past 10 px) are a decision to review (docs/DECISIONS.md).
- **Handles (C1a findings):** rules added to docs/features/text-select.md:
  - only the dragged handle moves;
  - the page stays still while a handle is dragged;
  - bigger grab area.
- **C1a findings:** 8 items in docs/PENDING.md (C1A-1 to C1A-8), each with its phase. Paste is the worst ("1/"-like text after a paste in the same box; a picture paste lands somewhere unclear).

## Owner tests still pending (the owner said: consider them pending)

- **C1b, the bar and paste test.** Two short tests, written in the chat of 21 Nov (bar motion: appear, slide while a handle moves, size taps; paste: same box, other box, a drawing). The owner is doing Test 1 now.
- **Hold checks:** a still Pencil hold opens the strip; small letters written slowly do not.
- **Other checks:**
  - Today opens quickly?
  - Bug 1, paste and hold re-checks; the Thickness tap; C0 items 3 to 11; the Journal rename tap.
  - Notion setup (docs/IDEAS.md, memory notion-mirror).
- **C1a trace:** it held only 3 idle events, and no stuck Lasso outline was seen. The recorder stays on. Next time, copy the trace right after something odd.

## Open questions for the talk

- What the owner wants to discuss: not known yet. They asked for this pause themselves.
- Is "Aa" clear enough for Font, or does it need a word next to it? (open)
- The scope added today (customise entries, font and size strips) changes the estimate by about 1 to 2 days (estimate).

## Builder at the pause

To be filled from the builder's stop report (see the next commit to this file).

## Where to read more

docs/BUILD-STATE.md, docs/PENDING.md, docs/CHANGELOG.md (21 Nov), docs/DECISIONS.md "Decisions to review", docs/design/owner-decisions.md (end), docs/features/selection-bar.md, docs/features/text-select.md. The full chat is in the Claude Code session log on the PC (session bf1dbcb8).
