# Project instructions

This repository produces vertical motion-explainer videos (YouTube Shorts) with Remotion. Rules: `MASTER_PROMPT_FINAL.md` (v2.2, the single source of rules; do not change it unless the user asks; changes go to `docs/CHANGELOG.md`).

## Topics: one folder per topic
- Finished / current topic «Почему нам кажется, что время течёт быстро» lives in the root layout (`content/`, `public/audio/`, `src/scenes/`). Its state: `content/progress.md`, `content/decisions.md`.
- **A new topic** (the user writes «Новая тема: …», «Выполни MASTER_PROMPT_FINAL.md. Тема: …» or similar) never continues the root `content/progress.md`. Create it with `node scripts/new-topic.mjs <slug> "<Тема>"`, which makes:
  - `projects/<slug>/content/` — brief, sources, analysis, script, storyboard, sound map, reviews, `progress.md`, `decisions.md`;
  - `public/<slug>/` — voice files, sfx copies, fonts if new (Remotion serves static files only from `public/`);
  - `src/projects/<slug>/` — scenes, Main and Cover for this topic, registered in `src/Root.tsx` under composition ids `<Slug>Main` and `<Slug>Cover`;
  - `scripts/` and shared code (`src/lib`, `src/theme`, `src/components` incl. `Episode`, `src/illustrations`) are reused; extend them, do not copy them. Scripts take `--content`, `--timeline`, `--comp` flags for a topic (MASTER_PROMPT_FINAL §21).
- **Continuing** a topic: read that topic's `progress.md` and `decisions.md` first and continue from the recorded step; do not re-ask recorded decisions.
- Each topic gets its own working branch and PR.

## Always
- Metaphors only for accuracy (MASTER_PROMPT_FINAL §20): every scene has a mode and location in `visual-register.json`; every metaphor is justified, checked by `metaphor-auditor` and approved by the user at STOP 1. Interfaces, schemes and data are shown literally.
- Before the gate and before committing visual work, run `node scripts/audit.mjs` (no rendering) and fix every ERROR.
- For the gate, make 2 fps sheets and beat key frames with `node scripts/contact-sheet.mjs <outDir>`, and per-frame strips with `node scripts/frame-strip.mjs <from> <to>` for physics and anchors (stills only, no video render). Keep review notes in `content/reviews/notes.json` (id, severity, status); escalate a note open for 3 rounds to the user.
- After changing a scene, re-check its sfx and run `node scripts/audit.mjs --stamp-sfx`.
- Master: `node scripts/master.mjs` (render, loudness on the encoded AAC, format checks, cover, report).
- Before showing frames, covers or video to the user, run the `shorts-quality-gate` agent (§19) and fix every defect it finds; facts go through `fact-checker`.
- Do not reuse illustrations or locations from another topic without the user's consent (§4); shared kits (room, city, board) are building blocks, the scenes are designed anew.
- The user works from a phone: answer in Russian, keep messages short, send images and videos as files.
