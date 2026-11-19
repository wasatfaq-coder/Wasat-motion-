# Progress: universal Anatomy kit (showcase gate)

Branch: `ccr-universal-showcase-gate`. Decisions (user, Grill Me 19.11.2026): hand-over at 40% context; the session
starts the next session itself; this file is the hand-over; the rule is in `CLAUDE.md`.

## Steps
1. [ ] Render the 24 frames of `AnatomyUniversal` (`node scripts/style-check.mjs --keep <dir>`), tile a sheet (ffmpeg).
2. [ ] `shorts-quality-gate` on the sheet and frames; every finding fixed in shared code with a root cause row in
   `docs/root-causes.md` and a guard.
3. [ ] PASS → `node scripts/gate-stamp.mjs --gate "<verdict>" <sheet>`; send the sheet to the user.
4. [ ] Frames changed → `node scripts/style-check.mjs --update`; PR; merge on green CI.
5. [ ] Rules numbering (§23 of PR #19 vs §24 in main): waits until PR #19 is merged (open on 19.11.2026).

## Open findings
(none yet)
