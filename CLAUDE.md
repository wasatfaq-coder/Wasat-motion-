# Project instructions

This repository holds one motion-explainer video project driven by `MASTER_PROMPT_FINAL.md` (version 2.0, replaces the old MASTER_PROMPT.md entirely).

- At the start of every session, read `content/progress.md` and `content/decisions.md` if they exist and continue from the step recorded there. Do not restart finished stages and do not re-ask decisions already recorded.
- If `content/progress.md` does not exist, wait for the user to give the topic and source, then follow `MASTER_PROMPT_FINAL.md` from the start.
- `MASTER_PROMPT_FINAL.md` is the single source of rules. Do not change it unless the user asks.
- Before showing frames, covers or video to the user, run the `shorts-quality-gate` agent (§19) and fix every defect it finds.
- The user works from a phone: answer in Russian, keep messages short, send images and videos as files.
