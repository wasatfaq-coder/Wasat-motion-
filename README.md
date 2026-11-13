# Wasat Motion

Вертикальные моушн-эксплейнеры для Shorts на Remotion.

- Правила: `MASTER_PROMPT_FINAL.md` (v2.2), журнал: `docs/CHANGELOG.md`, инструменты: §21.
- Агенты-проверяющие: `.claude/agents/` (обязательные — `shorts-quality-gate` и `metaphor-auditor`).
- Новая тема: откройте сессию Claude Code на этом репозитории и напишите «Новая тема: … Источник: …» — тема создаётся в `projects/<slug>/` (`node scripts/new-topic.mjs <slug> "<Тема>"`).
- Продолжить тему: «Продолжи тему <slug>» (или «Продолжи по content/progress.md» для ролика про время).
