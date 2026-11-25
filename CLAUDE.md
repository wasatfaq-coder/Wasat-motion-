# Project instructions

This repository produces vertical motion-explainer videos (YouTube Shorts) with Remotion in one house style, Anatomy. Rules: `MASTER_PROMPT_FINAL.md` (v3.0, the single source of rules; change it only when the user asks; changes go to `docs/CHANGELOG.md`, then `node scripts/rules-split.mjs`). Read rules by section: `docs/rules/INDEX.md` → `docs/rules/NN.md` (generated; CI checks sync; never edit by hand). Style cheat sheet: `styles/anatomy/STYLE.md`.

## Topics: one folder per topic
- **A new topic** (the user writes «Новая тема: …» or similar): `node scripts/new-topic.mjs <slug> "<Тема>" --format how|why|history|numbers|faith` (add `--sensitive religion|politics|health` when it applies). It makes `projects/<slug>/content/` (brief, concept, register with the format's chapters, storyboard, sound map, reviews, `progress.md`, `decisions.md`), `public/<slug>/` (voice, sfx copies) and `src/projects/<slug>/` (Main, Cover, covers, motion, data), registered in `src/Root.tsx` as `<Slug>Main` and `<Slug>Cover`.
- Shared code (`src/lib`, `src/theme`, `src/components`, `scripts/`) is reused and extended, never copied. Topic scripts take `--topic <slug>`; there is no root topic.
- **Continuing** a topic: read its `progress.md` and `decisions.md` first and continue from the recorded step; do not re-ask recorded decisions.
- Each topic gets its own working branch and PR.

## Always
- **Before drawing any real object** (a device, a building, a tool, a place), look up in the internet how it really looks: photos and the manufacturer's parts diagram («getting to know your …» in a manual). Write down its parts and where each one sits, then build from that list, never from memory.
- Ask the user one question at a time with options (the grill-me way) when a decision is theirs.
- Subagents may not be able to write files or open some sites: they return the full report as text, the main session saves it.
- **Agents** (`.claude/agents/*.md`, six, each sets `model:`): image-architect and shorts-quality-gate on Opus; researcher, fact-checker, metaphor-auditor and speech-sound-editor on Sonnet. A new agent must set a model. Contact sheets for agents at scale 1×.
- **Checks in two levels** (regulation section 15): after an edit `node scripts/audit.mjs --topic <slug> --quick`; at a STOP `node scripts/pregate.mjs <slug>` (full level, also CI). Run `node scripts/object-audit.mjs --settle <file>` after any geometry change.
- **Sketches** go to the user without the gate: render them to `out/sketch/eskiz-*` (no stamp in the frame). Frames, covers and videos at a STOP or for the master go through the `shorts-quality-gate` agent first; facts through `fact-checker`. After a PASS: `node scripts/gate-stamp.mjs --gate "<verdict>" <files>`; the hook `.claude/hooks/require-gate.mjs` blocks sending an unstamped image or video outside `out/sketch/`.
- **Root cause** (`docs/root-causes.md`): a first-time defect is fixed in the topic and noted; a repeated (`repeat: true`) or BLOCKER defect is fixed in shared code with a guard and a self-test case.
- Never merge a PR that adds or changes a video (a render, a demo or a master) until the session merging it has watched the new video itself (contact sheets and `node scripts/review-video.mjs`); green CI alone is not enough. A PR without a video is merged on green CI.
- Mechanisms, heroes and locations of another topic are not reused (image journal `docs/style/images-log.json`, unless one declared series); kit bricks are reused, scenes are designed anew. Another topic's code only with the user's consent in `src/lib/catalog.json`.
- Code map: for questions about how the code is wired or what a change in shared code affects, use the `graph-pilot` skill (Graphify; `graphify update .`, code-only commands, never `graphify install`).
- The user works from a phone: answer in Russian, keep messages short, send images and videos as files.
