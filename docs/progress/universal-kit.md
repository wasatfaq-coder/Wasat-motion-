# Progress: universal Anatomy kit (showcase gate)

Branch: `ccr-universal-showcase-gate`. Decisions (user, Grill Me 19.11.2026): hand-over at 40% context; the session
starts the next session itself; this file is the hand-over; the rule is in `CLAUDE.md`.

## Steps
1. [x] Render the 24 frames of `AnatomyUniversal` (`node scripts/style-check.mjs --keep <dir>`), tile a sheet (ffmpeg).
2. [ ] `shorts-quality-gate` on the sheet and frames; every finding fixed in shared code with a root cause row in
   `docs/root-causes.md` and a guard.
3. [ ] PASS → `node scripts/gate-stamp.mjs --gate "<verdict>" <sheet>`; send the sheet to the user.
4. [ ] Frames changed → `node scripts/style-check.mjs --update`; PR; merge on green CI.
5. [ ] Rules numbering (§23 of PR #19 vs §24 in main): waits until PR #19 is merged (open on 19.11.2026).

## Gate round 2 (19.11.2026, last round): FAIL → escalated to the user (§15)
Machine checks green (audit 0 errors, regress, frame checks on 24 frames). Verified: U-01, U-03 bolts, U-10, U-17,
U-18, U-21. Escalated majors (open two rounds): U-16 cutaway (page 19: the cut drops whole parts, a bar hangs),
U-12 drops (page 15: grey beads, no drop shape), U-13 flow (page 16: 8 px dots, no route line).
(A) minors: U-11 monitor cable plug in the air, U-14 flame only on the zoom page, U-04 tube gaps, U-06 bloom ring,
U-20 map post ring, U-19 plan line over a raised island (needs a numeric check), U-22 grape bunch on its tip,
U-23 plate maybe under the glass on page 22, U-24 floor patch reads as a hatch, U-25 ticks on island outlines.
(B) user's design calls: U-27 13 of 24 pages without coral, U-07 trapdoor reads as a pallet, U-02, U-05, U-08, U-15,
U-26 drops and cash on the same object, U-28 flame shape, U-29 cloud outline, U-30 balance level with a coral pan,
U-31 faded plate on the scale page, U-09 small figures.

## Where to continue (paused 19.11.2026 by the user; one session from now on)
1. Run the one consolidated check (it was stopped before it finished): `node scripts/object-audit.mjs --selftest`
   (passed), `node scripts/audit.mjs`, `node scripts/regress-checks.mjs`, `node scripts/style-check.mjs --keep <dir>`
   (drift against the old refs is expected: the frames changed on purpose; every frame-check ERROR must be zero), then
   tile the sheet.
2. ONE shorts-quality-gate round on the sheet and frames, giving it this file's open list; design items it still
   flags go to the user in one list (do not iterate per fix: user's rule).
3. PASS → `node scripts/gate-stamp.mjs`, send the sheet, `node scripts/style-check.mjs --update`, commit the refs: CI
   style-check stays red until then, so the PR waits for this step.
4. The svgFaded fix changes every topic that fades moving parts: re-check the elektromotor stand reel
   (`node scripts/motion-check.mjs`, contact sheet) before its STOP 2.
5. Rules numbering (§23 of PR #19 vs §24): still waits for PR #19.
Design items left for the gate/user: trapdoor (#1), swatches (#3), chron gear board (#4), tangle joints (#5), bloom
sparks/ring (#6), crowd heads (#7), map post ring (#10).

## Status after the consolidated fix pass (user: fix every finding at once, then one gate round)
Fixed in shared code with guards: S1, S2, S3, S4 (bleed pages declared), S5, U-01, U-03 (bolts wide + coral), U-09,
U-11 (screen ui), U-12, U-13, U-14 (svgFaded layers, tripod height, flame), U-17, U-18, U-19 (plan line in depth order).
Still open going into gate round 2: U-02 chron gear board, U-04 tube gaps, U-05/06 bloom sparks and ring, U-07 trapdoor
hinges, U-08 heads, U-10 phone cable end, U-15 swatches, U-16 cutaway, U-20 map post ring, U-21 doc touching cabinet.

## Gate round 1 (19.11.2026): FAIL
style-check was green: the refs recorded the same defects (root cause of «style-check passed»: refs were taken without a
gate; guard idea: `style-check --update` refuses unless the frames are gate-stamped).
Pages: 0 fruit, 1 data, 2 balance, 3 docs, 4 map, 5 chron, 6 storm, 7 tangle, 8 bloom, 9 bloomhalf, 10 trapdoor,
11 crowd, 12 people, 13 phone, 14 monitor, 15 drops, 16 cash, 17 lab, 18 swatches, 19 cutaway, 20 zoom, 21 pullout,
22 scale, 23 mapplan. Order of work: S1+S2, S3, S5, S4, then U-items.

### Systemic (fix in shared code, each with a guard + selftest + row in docs/root-causes.md)
- S1 MAJOR hero too small (~25% of safeRect area, norm §19.2 35–40%) on 0–19, 23: `boxOf()` (UniversalKitSample.tsx
  43–50) uses axis boxes of all recorded solids, wider than the drawn outline. Fix: camFit by the drawn screen bounds
  (`Assembly.screenBounds`). Guard: still-check / motion-check ERROR when hero bounds < 0.7·fill of safeRect.
- S2 MAJOR things added in `svg()` (extra, string concat) are not in the frame box: f7 thread tail off right edge,
  f16 loose note at x 1025 and cut by mask, f22 hero under the button column (x>904). Guard: pixel bounds of
  non-background inside safeRect in still-check.
- S3 MAJOR raw SVG appended after `Assembly.svg()` bypasses depth order (lines 97,102,106,111,116; f23 plan ring over
  raised land, f16 flow dots). Fix: lines on planes as `extra` Dyn parts. Guard: audit refuses `.svg() + '<'` /
  `.svg() + fn(` in samples and topics.
- S4 MAJOR mask fade (y≈240 / y≈1190) cuts the object mid-body on f16, f20, f21, f22; zoomInto/pullOut cams ignore
  safeRect. Guard: still-check ERROR if a row at the mask edge crosses non-background over >30% width.
- S5 BLOCKER(f1)/MAJOR coral discipline: f1 two corals (bar + pie sector); no coral on 0,6,7,8,9,10,14,17,18,20,21,22;
  meaningless coral f13 (side button); invisible 3 px coral f3, f19. Guard: still-check exactly one connected coral
  region ≥0.3% of frame, unless page marked `coral: 'none'` with reason.
- S6 MAJOR not recognisable without a label: f6, f15, f17–f21 (states shown where meaning does not read; particles
  hidden by bodies or same tone). Guards: Dyn part visible <10% of its area = ERROR; device screen without content in
  the showcase = ERROR; parts with no support within 1 unit in stateSweep states = ERROR; catalog `minVisiblePx`.

### Per page
- U-01 BLOCKER f1: two corals (data.parts.ts).
- U-02 f5 chron: thin diagonal, flag ~10 px on phone, gear board detached.
- U-03 f6 storm: reads as marshmallow; lightning 40 px zigzag; stray grey disc outline left (x290–330,y620–700).
- U-04 f7 tangle: tail off frame; white gaps between tube segments (x220–250,y690–790) → lint rule tube continuity.
- U-05 minor f8: sparks read as paper scraps; comment line 89 says half open, flower is full; f8≈f9.
- U-06 minor f8,f9: grey ring behind stem (x462–520,y600–660).
- U-07 f10 trapdoor: reads as pallet; hinges float in opening; pit as thin wireframe.
- U-08 minor f11: heads as grey caps, all from the back.
- U-09 f12 people: figures ~20 px on phone; levitating figure not distinct (no gap/shadow).
- U-10 minor f13: cable ends mid-air; coral on side button.
- U-11 f14 monitor: blank screen (empty data-screen), floating pin at x725–740,y785–800, no coral.
- U-12 f15 drops: same tone as coins, read as beads.
- U-13 f16 cash: flow dots 2–3 px, route pipe invisible; loose note off frame.
- U-14 f17 lab: fire/gas invisible (inside bodies / svgFaded), burner unreadable, no coral.
- U-15 f18 swatches: materials differ only by tone; reads as keyboard.
- U-16 f19 cutaway: lid floats without walls, unexplained brown plates, drawer invisible, stamp lost its handle.
- U-17 f20,f21: near-identical, mask cut, bottom 40% empty.
- U-18 f22 scale: inner bowl model inside the glass (inner.at line 74 collides with LAB glass) → assert in
  scale.tsx that inner box does not intersect outer solids, with selftest.
- U-19 f23: plan line over raised parts; polygon unreadable.
- U-20 minor f4,f23: open grey ring over first route post (x395–435,y510–535).
- U-21 minor f3: 3 px coral; document touches cabinet corner.

Frames: render with `node scripts/style-check.mjs --keep <scratch>/frames`; sheet:
`ffmpeg -i frames/f%d.png -vf "scale=270:480,tile=6x4:padding=6:color=white" -frames:v 1 sheet.png`.
After fixes: gate round 2 (max 2 rounds per set, 3rd open item → user), stamp, send sheet, `style-check --update`, PR.
