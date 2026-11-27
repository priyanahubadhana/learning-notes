# Working copies at the 1A close-out (26 Nov 2026)

A list only (plan-after-1a, section 5, step 2a). **Nothing is removed before the owner's yes to this list.** "Merged" means the branch is fully in main. "Not saved" counts the files with changes that are not committed (including new files).

## Hold work that is not in main (keep, or decide one by one)

| Working copy       | Branch                 | Not in main                                                | Not saved                                                                      |
| ------------------ | ---------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| ln-buildnext       | build/next             | merged                                                     | 131 (the old screenshot edits; never `git commit -a`, `git reset --keep` only) |
| ln-flaky           | fix/flaky-g1           | 8 commits (the stopped test fixes, kept for the test gate) | 0                                                                              |
| ln-s7              | slice/7-reader-v2      | 85 commits                                                 | 0                                                                              |
| ln-s15             | slice/15-study-v2      | 36 commits                                                 | 0                                                                              |
| ln-s9cost          | slice/9-ai-cost        | 20 commits                                                 | 0                                                                              |
| ln-s0g3            | slice/0g-parts-3       | 18 commits                                                 | 0                                                                              |
| ln-s9              | slice/9-ai-framework-6 | 15 commits                                                 | 0                                                                              |
| ln-s8b             | slice/8b-review-rest   | 4 commits                                                  | 0                                                                              |
| ln-livecheck       | slice/live-check-sha   | 2 commits                                                  | 0                                                                              |
| ln-2a16            | slice/b11-g5-tb28      | 1 commit                                                   | 35                                                                             |
| ln-redfix          | slice/fix-ci-red       | 1 commit                                                   | 0                                                                              |
| ln-sshell          | slice/shell-fixes      | 1 commit                                                   | 3                                                                              |
| ln-fix-pencil-base | (no branch)            | –                                                          | 0; removed only with the owner (earlier rule)                                  |

## Merged, but with files not saved (look before removing)

ln-barfix 104, ln-inkbox 62, ln-c22 51, ln-fix-pencil 24, ln-bbar 23 (and a stash, below), ln-c21 18, ln-c18b 18, ln-c21-iosbase 11, ln-cboxes 6, ln-u0d 4, ln-s1 3, ln-cboxes-base 2; with 1 file: ln-2a15, ln-2a4, ln-c21-base, ln-p1-preset, ln-p1-scrollbar, ln-p1-update, ln-sfix-scroll, ln-tb17. Mostly test pictures, not checked one by one.

## Merged and clean (safe to remove on the owner's yes)

ln-2a5 to ln-2a14, ln-2acfg2, ln-2a16b, ln-abar, ln-abar-dev, ln-c2, ln-c17, ln-c36, ln-c45, ln-c45x, ln-docs (in use), ln-fix-box, ln-fix-ci, ln-fix-ci2, ln-journal-merge, ln-m1, ln-m2, ln-m5, ln-m9, ln-names, ln-names2, ln-p1-f10, ln-p1-scrolllook, ln-p110, ln-p111, ln-p112, ln-p14-eslint, ln-picks, ln-red1, ln-rel-gate, ln-s12, ln-scen-cache, ln-u0b, ln-u0c, ln-wheel, learning-notes-mcp, .claude/worktrees/agent-a1656aa102a867aa7. With no branch and clean: ln-2a13, ln-release, ln-qa-antigravity, ln-qa-codex, ln-qa-cursor (the outside auditors' copies; keep while they are used).

## Old helper copies in chat scratch folders

Seven working copies sit in old chats' temporary folders (C:/Users/pc/AppData/Local/Temp/claude/...): five with thousands of changed files each (old, rv2a, wt, wt-next, wtcb), m8 clean, c19 with 3. They were made by helpers for one-off checks; none is a branch.

## Stashes

28 stashes in the shared list. Known: `stash@{0}` "popped by mistake 24 Nov 04:53, old screenshot changes" (from ln-bbar). The rest are older helper saves (WIP on old slices). None is applied or dropped without the owner.

## The main clone

`C:/Users/pc/Downloads/learning-notes` is on main, 1,621 commits behind. A fast-forward was tried on 26 Nov and **refused by git**: new pictures in its `screenshots/` folder (not committed) would be overwritten by files of the same name in main. By the plan, it stops here for the owner: the choice is to move those pictures aside (keep a copy) and then fast-forward. Until then the push guard runs its old copy of the script (lesson 31).

## Done on 26 Nov (the owner's yes: 2A and 1A)

- **Removed (45):** the working copies of the list "Merged and clean", each checked again just before (nothing unsaved, its commit in main), with `git worktree remove` (never forced): ln-2a5 to ln-2a14, ln-2acfg2, ln-2a16b, ln-abar, ln-abar-dev, ln-c2, ln-c17, ln-c36, ln-c45, ln-c45x, ln-fix-box, ln-fix-ci, ln-fix-ci2, ln-journal-merge, ln-m1, ln-m2, ln-m5, ln-m9, ln-names, ln-names2, ln-p1-f10, ln-p1-scrolllook, ln-p110, ln-p111, ln-p112, ln-p14-eslint, ln-picks, ln-red1, ln-rel-gate, ln-s12, ln-scen-cache, ln-u0b, ln-u0c, ln-wheel, ln-release and .claude/worktrees/agent-a1656aa102a867aa7. No branch was deleted.
- **Left behind:** in some of those folders a `node_modules` folder that Windows would not let go (files held open), and git's small notes about each removed copy in `.git/worktrees/` ("Permission denied"). Neither holds work; they can go after a restart of the PC.
- **Kept on purpose:** learning-notes-mcp (the app's connector for Claude runs from it), ln-docs (in use), ln-qa-antigravity, ln-qa-codex, ln-qa-cursor (the auditors' copies), and the copies of helpers that are working (ln-g1-tests, ln-rules, ln-flaky, ln-g1-app).
- **The main clone:** the 123 untracked pictures that main also holds were copied, with their folders, to `C:/Users/pc/Downloads/learning-notes-untracked-backup-2026-11-26/` (their list in LIST.txt there), then removed from the clone; the clone was fast-forwarded to main (fcc433f3) and `npm ci` was run. The other untracked files there were not touched.
