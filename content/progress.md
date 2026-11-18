# Progress

Rules: MASTER_PROMPT_FINAL.md. The snapshot below was written against v2.1; the rules file is now v2.4.2 (docs/CHANGELOG.md). Decisions: content/decisions.md.

## Сверка 18.11.2026

Снимок ниже оставлен как запись 12–13.11.2026. Эти строки расходятся с файлами, если читать их как текущее состояние:

- Строка про quality gate («4 rounds, round 4 verdict можно показывать», со ссылкой на `content/reviews/quality-gate.md`) описывает файл на коммите 8a63ab8 (12.11.2026, вердикт круга 4 черновика). Сейчас `content/reviews/quality-gate.md` — раунд 5 переделки (13.11.2026), вердикт «брак — показывать нельзя». Текст того вердикта не переписан; дополнение в конце файла сверяет его с `content/reviews/notes.json`.
- «Gate on 2 fps sheets is next» — круги переделки по листам 2 fps уже записаны в quality-gate.md (раунд 5).
- «Not yet listened to by the user» — в `content/decisions.md` (12.11.2026) голос всех 12 сцен принят после прослушивания.
- «merge PR #1» как следующий шаг — PR #1 влит в main 12.11.2026. Тема по-прежнему в корневой раскладке: так и задано для ролика «время».
- Мастер как следующий шаг — `content/reviews/toolkit-audit.md` фиксирует, что ролик доведён до мастера по формату и громкости. `content/reviews/audio.md` мерил черновик (−17,7 LUFS), не этот мастер.
- Fact-checker, круг 6, «принято» — по-прежнему так в `content/reviews/facts.md`.

По `content/reviews/notes.json` после вердикта раунда 5: G5-N2 и G5-N3 — fixed (код в коммите 34c54bb, повторного круга gate нет). Открыты G5-N1 (MINOR) и G-PHYS (MAJOR). Аудит метафор `content/reviews/metaphors.md` (13.11.2026), вердикт «нужны правки»: M-1 escalate, M-2 open, M-3 open, M-4 escalate, M-5 escalate, M-6 open.

## Current stage (снимок 12–13.11.2026, не текущее состояние)
- STOP 1 passed; voice for all 12 scenes generated and approved by the user.
- Cover A chosen (out/cover.png = frame 0); 3 variants in src/Cover.tsx.
- Scenes reworked after user feedback: no empty sheets, several detailed locations (room, city square + info stand, bus stop, beach, head cabinet, cake/films, notebook, city block), shot changes every 1.5–3 s, sound map 52 events.
- PR #1 (draft → main) contains everything.
- Half-scale draft rendered (out/draft.mp4, 243 s render). Audio check done (content/reviews/audio.md).
- Quality gate: 4 rounds, round 4 verdict «можно показывать» (content/reviews/quality-gate.md). Fact-checker round 6: принято.
- Draft 117.1 s (half scale) sent to the user at STOP 3.
- Next: user feedback → final polish → master render (full size, png) → loudness 2-pass → ffprobe → deliver; then restructure to projects/<slug>/ and merge PR #1.

## Environment
- 4 cores, 15 GB RAM. Node 22, ffmpeg 6.1, uv. Remotion 4.0.542 pinned (prototype used 4.0.543; not required).
- Render browser: /opt/pw-browsers headless shell via remotion.config.ts.
- Network open for remotion.media, huggingface.co, pubmed, etc. (since 2026-11-12). Node fetch ignores the proxy: download with curl.
- whisper.cpp 1.5.5 built in ./whisper.cpp; large-v3 model via curl.
- Earshot: not used (user decision).
- ElevenLabs MCP: voice 3EuKHIEZbSzrHGNmdYsx and eleven_v4 available. File download not tested yet.
- Delivery: SendUserFile works.

## Paid
- Voice (ElevenLabs flow 5guk5yVDQ8mSnxrLUeBU): all 12 scenes generated, 1 take each, 1577 credits of 3200 budget. Total speech ≈ 114.6 s. Records in content/assets.json. Listening: approved 12.11.2026 (content/decisions.md). The earlier note «not yet listened» was wrong against that decision.

## Visual rework (after STOP 3)
- Palette: bg, ink, neutrals, one coral accent (tokens only).
- System detail on every Box (bevel, hatching, base line); detailed city kit.
- Desk layout without collisions.
- Physics for the flying page.
- Scene 8: isometric head-shaped memory cabinet, suitcase, cards flying into drawers, tape measure.
- Next: sample (scenes 1, 8, 9) for approval → convert scenes 3–4, 10, 11 to detailed isometry → full draft → STOP 3 again.
- Rework 2 done: all 12 scenes isometric, collisions fixed, single coral accent, archive/catalogue, cover in iso. Gate on 2 fps sheets is next, then frames to the user; video render only on request.
