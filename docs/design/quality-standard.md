# Quality standard: the bar every feature must meet (owner-approved 11 Nov 2026)

It's fine to go above this bar. Nothing ships below it.

## Brand values we borrow

- **Apple**: deep capability that feels effortless. Smart defaults, progressive disclosure (essentials first, more behind ▾ / tap again / hold), the same patterns on iPad, PC and phone, and calm visuals.
- **Toyota**: reliability.
  - Stop the line when any test is red.
  - Mistake-proof designs (poka-yoke): the wrong action is impossible.
  - Find the root cause (5 whys).
  - Small steady improvements (kaizen).
  - Standard work for every builder.
  - Go and see: the real iPad is the truth.
- **Dieter Rams / Braun**: good design is as little design as possible. Useful, understandable, unobtrusive, honest, thorough down to the last detail.
- **Muji**: quiet, no clutter, materials first. The notes are the hero, not the chrome.
- **Leica / premium craft**: every control feels precise. Motion is smooth, on the one motion scale of docs/design/system.md §6 ("about 150 ms" retired 22 Nov), and nothing jitters, flickers or jumps.
- **Linear / Things 3**: speed is a feature. Instant response, keyboard and Pencil shortcuts, no loading spinners for local actions.
- **Stripe docs / Notion onboarding**: plain words. Every setting says what it does in one line, with a preview where it helps.

## Checklist for every feature (builders and reviewers)

1. **Purpose**: it solves a real need. Options are grouped by task, with one name and one place each (no duplicates).
2. **Simplicity**: Beginner sees the essentials. Professional gets everything, purpose-driven, with advanced options one tap away. No existing feature is ever dropped.
3. **Reliability**: reproduce, then fix the root cause, then add a regression test. Test the edge cases: fast taps, Pencil vs finger, offline, reload, app switch, small screen, a big notebook. Undo works. No data loss.
4. **Premium feel**: the design tokens, smooth motion respecting reduced motion, dark and light, consistent icons (Lucide). Passing means every value comes from docs/design/system.md (the one table of numbers, owner's answers of 22 Nov 2026), the frame sizes from docs/design/shell-spec.md §8 and the Tool bar's from docs/features/toolbar-v8.md; a value typed by hand or taken from an older document fails. The bar lines (22 Nov 2026):
   - Icons: one stroke everywhere, the system.md §7 value (Q1).
   - Motion: only the system.md §6 tokens and named uses (Q2).
   - Glass: frame glass on bars and the sidebar, card glass on cards and selection bars, never a third recipe (Q3, system.md §5).
   - Radii: only the system.md §3 table (Q4).
   - Toasts: as shell-spec.md §7, with the ✕ to close and Undo on the other side (Q5).
   - Frame: sidebar and sheet widths from shell-spec.md §8 (Q6, Q9); ✕ top left and ✓ top right on sheets (Q8); Undo and Redo at the top left, no Back and Forward arrows (Q10); the Tool bar height from toolbar-v8.md (Q11).
   - Icons in the rail as system.md §7 (Q7); quick fonts as system.md §4 (Q13); Day is the default theme (Q14, system.md §1).
   - Hover names are an extra: shown with a mouse or the Pencil, a held finger shows nothing for now, and no action is hover-only (Q12).
   - Names: Tool bar, Action bar, selection bars, Hold menu, the same in the app, Settings and specs (Q15).
   - Red only for Delete and the Review's "Again" (Q16).
   - Targets: 44 pt always; Compact tightens spacing only and never shrinks a target (Q17).
   - More: one control, last, with ▾ when more options exist (Q18).
5. **Safety**: no surprise costs (AI spends only with consent and within limits), privacy by default, secure inputs.
6. **Speed**: the first-load budget is respected, new UI is lazy-loaded, 60 fps scrolling and inking.
7. **Clarity**: plain-language labels, a one-line explanation, and toasts only for errors or unseen actions.
8. **Review**: an Opus quality review before the owner's iPad test.
