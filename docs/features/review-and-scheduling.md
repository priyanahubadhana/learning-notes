# Review and scheduling

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Show the cards that are due, take a rating (Again, Hard, Good, Easy) and decide when each card comes back.

## How it works

- `getReviewQueue` (`src/recall/reviewService.ts`) takes a scope (all, notebook, page with optional sub-pages, "wrong", or given blocks) and returns due reviews, most overdue first, then new cards. Limits: new cards per day, an optional reviews per day, counting what was already done today (`doneToday`, using the study-day start hour).
- `reviewable` keeps only cards that are not suspended, whose block is live and still makes that card part, that have a question, and that are not in a Templates notebook.
- `rateCard` rates in one transaction: it writes one append-only `ReviewLog` and updates the card. If `countsAsReview` is false (not due, or a new card past today's limit) it is logged as `cram` and the schedule is unchanged.
- Practice anyway: `getPracticeCards` returns up to 50 active cards, soonest due first, optionally shuffled (Settings).
- "Got wrong" (`wrongCardIds`): cards rated Again in the last 7 study days.
- Schedulers (`scheduler.ts`): a pure `Scheduler` interface (`next`, `adopt`). `fixedStepsScheduler` climbs a Good ladder; `fsrsScheduler` (`fsrsScheduler.ts`, library `ts-fsrs`) keeps stability and difficulty in `card.schedulerData` and aims for the "Target memory" percent. `getScheduler` picks by setting, defaulting to FSRS.
- Switching schedulers: `readyFor` calls `adopt`, which rebuilds state from the review log and keeps the due date.
- `reviewSession.ts` is the in-memory session: cards due again within minutes wait hidden, then come back first; a practised Again card returns 3 cards later.
- `suspendCard` / `unsuspendCard` set `suspendedAt`. `rebuildCardFromLog` rebuilds a schedule from its log. The Review screen is `ReviewScreen.tsx`; its suspend toast has Undo.

## Edge cases

- Damaged FSRS data counts as none and gives a fresh start (`isFsrsData`).
- Review log entries marked `purgedAt` are skipped when finding the last answer.
- A card whose block is gone gives no face (`getCardFace` returns null).
- A forgotten card counts a lapse only if it had been learned (interval above 0).
- FSRS gaps start at the study-day boundary; minute steps use exact time. Longest gap is 36500 days.
- Rating a card that does not exist throws "Card not found".

## Security check

- Input: ratings are one of four fixed values and settings are read through typed settings. FSRS state is validated before use.
- Data leaving the device: none found. FSRS runs locally.
- Deletes: nothing is deleted on review. Suspending is reversible and keeps history. Review logs are append-only.

## Tests

- `src/recall/reviewService.test.ts`, `scheduler.test.ts`, `reviewSession.test.ts`
- `e2e/review.spec.ts`
