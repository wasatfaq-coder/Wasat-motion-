# Progress

Rules: MASTER_PROMPT_FINAL.md v2.0 (from 2026-11-12). Decisions: content/decisions.md.

## Current stage
Preparation (§8) nearly done:
- Sources: content/sources.md (from web-search summaries; network now open, direct re-check of articles still TODO).
- Analysis: content/analysis.md. Script: content/script.json (12 scenes, 215 words, ~93.5 s speech, ~101 s video) built by scripts/build-script.py.
- Reviews: content/reviews/{facts,speech,retention}.md; fact-checker round 3 running.
- Concept and storyboard rewritten to the approved line-art room style (content/concept.md, content/storyboard.md).
Fact-checker round 4: принято. TODO before final: verify S3.3, S4.1–S4.2, S6.1 against primary sources.
STOP 1 passed. Voice for all 12 scenes generated. Transcripts + timeline: 236/239 words verified, total 6924 frames = 115.4 s.
Test fragment (scenes 01–02, 12.4 s, with voice and sfx) rendered: out/test_fragment.mp4 (not in git). Shown to user at STOP 2.
Fragment reworked after user feedback (no headings except preview title, Rubik 68 px captions, Shorts preview cover, closer framing, memory icon, new lamp). Audit: content/reviews/visual-audit.md; art review: content/reviews/art.md.
Next: user approval of the reworked fragment, then scenes 03–12 per audit §5, full draft (STOP 3).
Render speed: 743 frames in 48 s at full size, png frames (~0.065 s/frame) → full video ≈ 8–15 min.

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
