# Handoff, 27 Nov 2026 evening (chat pc-95 to the next chat)

Written because the owner switches Claude accounts (usage limit). The next chat continues the same work in the same project and folder. Read this page, then `docs/STATE.md` ("Resume here", item 1, the newest update block), both from `origin/main`.

## For the owner, in short

- We are still on the **test gate**: the preview waits for one fully clean full test run (your choice, 27 Nov). Each run finds a few new rare failures; each one is hunted to its real cause.
- Fixed today in this chat: six failures, two of them real app bugs (the "Restart now" button vanished during an update; a dropped box stayed untappable on iPad).
- Open when this page was written: two, both nearly done. B11 is a third real app bug: a pen line written right after coming back from the Text tool could be lost. TB-11 was a test fault. The helpers stopped with the old chat; their work is saved (see below), and the new chat finishes the proofs, reviews and merges.
- Nothing needs you now. The two iPad checks (Calm edge look, 5-minute Pencil test) come after the preview is up.

## Where the code stands

- **Test branch:** `slice/g1-test-causes` = `628808ec` (all reviewed fixes of today merged by fast-forward).
- Today's merged fixes on it, each reviewed once by Opus (pc-95):
  - F8 test waits for the turn (`d134a657`); TB-02 records the held name (`9c6f48e1`); C22 app fault, red-first unit test and fix (`7ea320ec`, `043b49b1`).
  - C15 test fault: reads heights only after the saved height and the words show (`2b49e184`).
  - newLine test fault: waits for the bar's start chevron (`2cd5be3e`).
  - TB-14 app fault: `playGlide` (src/paper/v2/boxDrag.ts) now lands by a 200 ms wall-clock timer; WebKit moves both `finished` and `currentTime` only at a paint (`2a47a516`, `74d40998`, `c0aed404`, `628808ec`). The first fix (`74d40998`) still waited on `currentTime` and could wait forever: the review missed it; check every new wait for an end.
- **Last full run:** 45990737316 on `74d40998`: red (TB-14 before its second fix; B11; TB-11 pass on retry). No full run yet on `628808ec`.
- Rare reds per full run so far: 2, 6, 1, 4, 2, 3. Opus said it will put the choice (keep waiting for a clean run, or not) back to the owner if the next run does not show fewer.

## Open work (left by the helpers)

Neither item below is reviewed or merged yet.

- **TB-11** (e2e/tb2-move.spec.ts:98, chromium, a pass on retry). **Test fault, proven.** The 120 ms hold counts from the press; on a slow runner the gap between two awaited mouse steps passed it, so the flick lifted and dragged the box (a 150 ms gap locally gives exactly CI's 101.34 px). Fix `be193718` on `slice/g1-tb14` (pushed; parent `628808ec`, so it fast-forwards): the page sends press, moves and lift in one task; new guards (the drag started, the moves came inside the hold, nothing left lifted); the under-3 px check unchanged; with a 150 ms pause the same path drags 202.67 px, so it cannot pass on nothing. **Left:** TB-11 20x on ipad-webkit (`--retries=0`, the lock), then the review.
- **B11** (e2e/b11TextNoInk.spec.ts:152, ipad-webkit, red both tries). **App fault: a stroke written right after Text back to Pen was lost (data loss).** Back from Text the page grows again (942 px) but the ink pad keeps the text's height (30 px) until WebKit's late resize report (about 250 ms locally, over 640 ms in the CI trace); a stroke below the text falls outside the pad. Commits on `slice/g1-b11` (worktree `ln-g1-b11`, parent `74d40998`, so it needs a rebase on `slice/g1-test-causes`): `85b2ad85` red-first test (red 5 of 5 on the old code), `c97ec65e` fix, marked "WIP, not proven": the pad is placed again in the same frame the room changes the page height. Proven: chromium 100/100; ipad-webkit run alone 99/100, the one fail being the new test (a Pen/Text tool click timing out after 10 s, cause not found). **Left:** check the branch reached GitHub (`git ls-remote origin slice/g1-b11`; if not, push it from `ln-g1-b11`: the commits are there), find the cause of that click timeout, 20/20 on ipad-webkit, a careful review (a data-loss path).
- The B11 helper briefly deleted the other helper's lock file and put it back; no lock is held now. Check that `C:/Users/pc/Downloads/webkit.lock` does not exist before the first local ipad-webkit run.

## Next steps for the new chat

1. Read the two helper branches above (`git log origin/slice/g1-test-causes..origin/slice/g1-tb14` and `..origin/slice/g1-b11`). Finish what is not proven (new Opus helper per item, same rules: root cause first, no added waits or retries or raised limits, never weaken a check, app fault = red-first test then a separate fix, 20/20 locally with `--retries=0`, the one-at-a-time lock `C:/Users/pc/Downloads/webkit.lock`).
2. Review each fix once, fast-forward `slice/g1-test-causes`, start a full run by hand: `gh workflow run ci.yml --ref slice/g1-test-causes -f full=true`; read it, including passes on retry (`grep "retry #"`). The ✘ rows tagged @fail / `test.fail` (S6, S7, S9, selectionBarButtons, LS-33) are expected.
3. If fully clean: the pull request `slice/g1-test-causes` into `build/next` (merge main into build/next then), its full run, then `slice/look-calm-edge` (`cba7e938`) into build/next = the preview. Then ask the owner for the two iPad checks.
4. Keep `docs/STATE.md` current after each step (docs-only push to main, the scratch-folder way in the repo-layout memory).

## Facts the new chat needs

- Worktrees of today: `ln-g1-r5`, `ln-g1-c15`, `ln-g1-newline`, `ln-g1-tb14`, `ln-g1-b11` (all under C:/Users/pc/Downloads). Removing any needs the owner. `ln-g1-tb14` has unrelated changed screenshot files: do not commit them.
- Do not touch `ln-buildnext` or `ln-docs`; never `git commit -a`, never `reset --hard`.
- `git fetch` prints many "Permission denied" lines about old worktree records: harmless (STATE item 5).
- A job that is cancelled uploads no trace; a job that fails normally does.
- The owner's chat rules: plain words, no ids or tables in chat, start with Status / Time left / Needs you.
