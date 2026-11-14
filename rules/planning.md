# Planning

- **Work runs in phases, one at a time** (docs/plans/phase-plan.md). The order inside a phase is fixed: artifact, plan with Fable, build, the owner's first look, fix and polish, release.
- **Artifact first:** before any new screen or major piece, a clickable mock-up (e.g. a Claude artifact) so the owner can see and test the look and flow. The real version is built only after the owner approved it. A written list of picks is not an artifact.
- **Before each phase, have one planning talk with the owner.** Ask all of the phase's decisions in that talk, then write the answers into the phase page. After that, the phase is built without stopping (see building.md).
- Use plan mode (no file changes) while discussing; leave it only to build an approved mockup.
- For each decision: explain the options simply, with pros/cons and a recommendation, and invite the owner's own ideas. Challenge ideas when there is a better way.
- Think ahead through every step of the phase: data, screens, rules and edge cases, so building rarely needs the owner.
- Check docs/IDEAS.md, the open problems in docs/PENDING.md and docs/design/owner-decisions.md before each phase, so every known problem of that area is in the plan.
- Each new feature gets a spec in docs/features/, using `_TEMPLATE.md`.
- **Each phase gets one page** in docs/plans/phases/: what is in; what is already built; the tasks, each small enough for one builder in one day, with files to touch, data shapes, rules and tests, written clearly enough for Sonnet; the owner's test list; what will not be done; its Definition of Done.
- End planning with ONE checklist of decisions for the owner to approve once.
