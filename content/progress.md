# Progress

Rules: MASTER_PROMPT_FINAL.md v2.1 (§19: density, pacing, retention, covers, agent shorts-quality-gate). Decisions: content/decisions.md.

## Current stage
- STOP 1 passed; voice for all 12 scenes generated and approved by the user.
- Cover A chosen (out/cover.png = frame 0); 3 variants in src/Cover.tsx.
- Scenes reworked after user feedback: no empty sheets, several detailed locations (room, city square + info stand, bus stop, beach, head cabinet, cake/films, notebook, city block), shot changes every 1.5–3 s, sound map 52 events.
- PR #1 (draft → main) contains everything.
- Half-scale draft rendered (out/draft.mp4, 243 s render). Audio check done (content/reviews/audio.md).
- Next: shorts-quality-gate + fact-checker on out/qa/gate2 → fix → STOP 3; after delivery: restructure to projects/<slug>/ and merge PR #1.

## Environment
- 4 cores, 15 GB RAM. Node 22, ffmpeg 6.1, uv. Remotion 4.0.542 pinned (prototype used 4.0.543; not required).
- Render browser: /opt/pw-browsers headless shell via remotion.config.ts.
- Network open for remotion.media, huggingface.co, pubmed, etc. (since 2026-11-12). Node fetch ignores the proxy: download with curl.
- whisper.cpp 1.5.5 built in ./whisper.cpp; large-v3 model via curl.
- Earshot: not used (user decision).
- ElevenLabs MCP: voice 3EuKHIEZbSzrHGNmdYsx and eleven_v4 available. File download not tested yet.
- Delivery: SendUserFile works.

## Paid
- Voice (ElevenLabs flow 5guk5yVDQ8mSnxrLUeBU): all 12 scenes generated, 1 take each, 1577 credits of 3200 budget. Total speech ≈ 114.6 s. Records in content/assets.json. Not yet listened to by the user.
