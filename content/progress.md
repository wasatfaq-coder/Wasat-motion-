# Progress

Rules: MASTER_PROMPT_FINAL.md v2.0 (from 2026-11-12). Decisions: content/decisions.md.

## Current stage
Preparation (§8) nearly done:
- Sources: content/sources.md (from web-search summaries; network now open, direct re-check of articles still TODO).
- Analysis: content/analysis.md. Script: content/script.json (12 scenes, 215 words, ~93.5 s speech, ~101 s video) built by scripts/build-script.py.
- Reviews: content/reviews/{facts,speech,retention}.md; fact-checker round 3 running.
- Concept and storyboard rewritten to the approved line-art room style (content/concept.md, content/storyboard.md).
Fact-checker round 4: принято. TODO before final: verify S3.3, S4.1–S4.2, S6.1 against primary sources.
STOP 1 passed (script, storyboard, voice budget ≤ 3200 credits). Next: style sheet + 6–10 s test fragment (scene 01 with voice).

## Environment
- 4 cores, 15 GB RAM. Node 22, ffmpeg 6.1, uv. Remotion 4.0.542 pinned (prototype used 4.0.543; not required).
- Render browser: /opt/pw-browsers headless shell via remotion.config.ts.
- Network open for remotion.media, huggingface.co, pubmed, etc. (since 2026-11-12). Node fetch ignores the proxy: download with curl.
- whisper.cpp 1.5.5 built in ./whisper.cpp; large-v3 model via curl.
- Earshot: not used (user decision).
- ElevenLabs MCP: voice 3EuKHIEZbSzrHGNmdYsx and eleven_v4 available. File download not tested yet.
- Delivery: SendUserFile works.

## Paid
- Voice (ElevenLabs flow 5guk5yVDQ8mSnxrLUeBU): scene-01 generated, 85 credits (1 take). Cost ≈ 1 credit/char (estimate_only). Records in content/assets.json.
