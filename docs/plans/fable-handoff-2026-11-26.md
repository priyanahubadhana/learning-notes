# Hand-over after the deep talk with Fable (26 Nov 2026)

**For the owner, to come back and continue. Also for a new Fable chat: read this page first.**

## How to continue

- **To go on with the build:** open Opus's chat and type "continue". Opus reads `docs/STATE.md` and goes on.
- **To go on with the planning:** open a new chat with Fable and type: "Read docs/plans/fable-handoff-2026-11-26.md and continue." The one planning step that is left is the short round on the last spec lines (below).
- The PC was switched off on your word after this page was saved. Nothing unsaved was left: everything is on GitHub.

## Where things stand

- **Phase 1A is live** since 26 Nov, 01:31 IST. Your reading check on the iPad passed. The close-out of 1A is done by Opus.
- **Why it would not go live, and what was changed:** the same code had to pass every test twice in a row, the full test set passed only about one time in ten, and a notes-only change on main could stop a publish. Now the same app code is tested in full once, and notes cannot stop a publish. The release then took 8 minutes.
- **The unsteady tests:** their causes were read from the recordings. Two were real faults in the app (a mouse click outside a box could drop the selection; the first pen stroke in a new box was saved late). Opus has fixed both on the code line; they are not live yet. The faults in the tests themselves, and the hosted machines that redraw the page about once a second, are Opus's work now. Until that is done, a full test run still passes only about one time in ten, so the next release waits for it.
- **The plan page has your yes** (26 Nov), with a review afterwards: [the plan after phase 1A](plan-after-1a.md). Opus works by it.
- **The notebook that Claude writes** (phase 1B): [the spec, fifth draft](phases/phase-1b-notebook-spec-draft.md). What you want is written down and every question you were asked is answered. The detailed lines of what the app does are not final yet.

## What you decided in this talk (25 and 26 Nov)

The full record is in the plan page and in [the talk notes](phases/phase-1b-notebook-talk.md). In short:

- **How the work runs:** you and Fable plan; Opus builds and decides by itself and writes its decisions down; goals and a few things that must always hold, no hard rules on how Opus works; your earlier decisions are never lost; two teams; the build machine cut down to the test gate.
- **The order of work:** fix the unsteady tests; the Pencil taps day; then phase 1B.
- **The notebook:** chapters with a Summary (led by a picture), Notes, a mind map and recall cards; made only with the app's own tools, so that you can change everything; a front page that opens when you tap the notebook's name; a tick on the Shapes tool so that a box, an oval or a triangle can hold text; the import of everything in stage 1, in two steps; a notebook brought in again gives three choices (replace the old one, make a new copy, drop it).
- **Features of Claude Code:** the advisor (Opus advising the Sonnet builders) as a trial; the built-in code review on each finished part; the deep review in the cloud only when the whole stage is done, and only after asking you; `/ship` and Code Mode not used.
- **For Opus's proofs:** the tests' sign-in switch may be used on the preview, to look only.

## What waits for you

1. **Opus's list of rule changes** (`docs/plans/rule-changes-2026-11-26.md`, when Opus has written it): for each item say "ok" or "put back". About 10 to 15 minutes.
2. **The short round with Fable on the last spec lines,** after Opus's read-only proofs in the real app. About 15 to 30 minutes. Then the planning of 1B is closed.
3. **Once, on the first build day of 1B:** type "/advisor opus" in Opus's chat.
4. **During the build:** the daily look on the real iPad (what you saw, what you expected); your yes to the look of one real chapter; the 10-minute Pencil session; signing in on the phone for the cards.
5. **At the end of stage 1:** Opus reminds you of the deep review in the cloud. Three runs are free; later ones are paid.

## Time left

- Closing the 1B planning: about one day (an estimate): Opus's proofs, then the short round.
- Phase 1B itself: not known yet. Opus gives an estimate after the proofs and corrects it after three measured days.
- The whole project: not known yet.

## For a new Fable chat

- **Read, in this order:** this page; `docs/STATE.md` ("Now"); the plan page; the spec draft, its sections 4 and 8; the talk notes from section 5I on. The reports on the unsteady tests are in `docs/qa/unsteady-tests-2026-11-26/`.
- **The next planning step:** take Opus's proofs (the list "For Opus to prove" in the spec's section 8), correct the lines of section 4 with them, ask the owner what the proofs open (all at once, easy words, with a pick), then set the spec to approved; Opus moves it to `docs/features/`.
- **Sentences in the spec that are still Fable's and not the owner's:** the tool's Oval counts as the owner's "circle" (NB-94); a tap on a shape's border picks it, like on a text box (NB-80); the list of what step one of the import carries (NB-41). In the plan: a step of the ladder that reaches Fable counts as one of the three daily questions.
- **How the owner wants to be answered:** plain words for a beginner; each message starts with Status, Time left and Needs you; "what I heard" after a free talk; 2 to 5 questions at once, each with the options, their sides and a pick; no ids, counts or tables in the chat; pages live in the repo, no hosted pages. A goal, not a condition: no limits or numbers of the planner's own. Never a hard rule on how Opus works. Anything that is Fable's own sentence is marked so.
- **How a docs page reaches main:** formatted with the project's prettier, committed on top of `origin/main` without touching a working copy, pushed so that the push guard runs, then read back from main. Only docs go straight to main.
- **How a release goes now:** a full run by hand on build/next ("full" ticked) is green; the owner says yes; the pull request from build/next to main is merged; the run on main finds that proof and publishes in about ten minutes; the live `version.json` is checked.
- **Mistakes of this talk not to repeat:** limits the owner never asked for; reading a reference picture as a model; drawn sample pictures instead of the real app; a hard rule for Opus; docs pushed to main during a release run (it stopped the publish; the release path no longer allows that to happen).
