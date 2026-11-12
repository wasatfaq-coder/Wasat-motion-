# Style sheet

Approved direction (MASTER_PROMPT_FINAL §3): detailed isometric line-art room, light solid background, dark outlines, one coral accent.

| Item | Value |
| --- | --- |
| Background | `#F5F0E8` solid |
| Outline (ink) | `#25242B` |
| Secondary lines | `#6B6770` |
| Accent (coral) | `#E8604C` — novelty and the key meaning only |
| Fills | light tones close to the background, occlude back lines |
| Line widths at 1080 px | main 3.5 px, secondary 2.5 px, micro 1.75 px (`src/theme/tokens.ts`) |
| Projection | one isometric projection per scene (`src/lib/iso.ts`); text and charts frontal |
| Font | Rubik (OFL), local woff2 in `public/fonts/`; preview title 96 px; captions 68 px semi-bold, ink on background, active word = soft coral underline; no other headings |
| Room | walls, window with blinds, bookshelf, desk with lamp, notebook, cup, card tray, wall clock, tear-off calendar, armchair, rug, plant |
| Memory metaphor | calendar page → card in the tray; novel card has a coral mark; dashed coral outline = "possible", not measured |
| Idle motion | clock second hand (6 s per turn), blinds and plant sway, steam line; no glow, no heavy shadows |
