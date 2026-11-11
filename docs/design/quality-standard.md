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
- **Leica / premium craft**: every control feels precise. Motion is smooth (150 ms) and nothing jitters, flickers or jumps.
- **Linear / Things 3**: speed is a feature. Instant response, keyboard and Pencil shortcuts, no loading spinners for local actions.
- **Stripe docs / Notion onboarding**: plain words. Every setting says what it does in one line, with a preview where it helps.

## Checklist for every feature (builders and reviewers)

1. **Purpose**: it solves a real need. Options are grouped by task, with one name and one place each (no duplicates).
2. **Simplicity**: Beginner sees the essentials. Professional gets everything, purpose-driven, with advanced options one tap away. No existing feature is ever dropped.
3. **Reliability**: reproduce, then fix the root cause, then add a regression test. Test the edge cases: fast taps, Pencil vs finger, offline, reload, app switch, small screen, a big notebook. Undo works. No data loss.
4. **Premium feel**: the design tokens, 44 pt targets, smooth motion respecting reduced motion, dark and light, consistent icons (Lucide 1.6 stroke).
5. **Safety**: no surprise costs (AI spends only with consent and within limits), privacy by default, secure inputs.
6. **Speed**: the first-load budget is respected, new UI is lazy-loaded, 60 fps scrolling and inking.
7. **Clarity**: plain-language labels, a one-line explanation, and toasts only for errors or unseen actions.
8. **Review**: an Opus quality review before the owner's iPad test.
