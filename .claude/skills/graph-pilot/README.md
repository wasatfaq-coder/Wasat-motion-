# graph-pilot — вопросы о коде по графу Graphify

Скилл перенесён из репозитория Wasatofficial-Shop- и настроен под Wasat-motion.
[Graphify](https://github.com/safishamsi/graphify) (MIT/Apache-2.0) строит граф кода: функции, типы, файлы и
связи между ними. Claude идёт по этой карте к нужным файлам, а не перебирает весь проект.

## Как пользоваться с телефона

Напишите Claude в проекте, например:

> Используй скилл graph-pilot, разберись, как устроена ходьба персонажа.

> Через graph-pilot: что затронет правка `AnatomyStage`?

> Покажи граф сборки объектов на телефоне.

## Что установлено

| Файл | Что делает |
|---|---|
| `SKILL.md` | сам скилл: намерение → одна команда graphify, гарды |
| `CHEATSHEET.md` | шпаргалка команд |
| `phone_view.py` | страница с куском графа для телефона |
| `.claude/hooks/graphify-install.sh` | ставит graphify 0.9.75 при старте каждой облачной сессии, в фоне |
| `.claude/settings.json` | подключает этот хук к `SessionStart` |
| `.graphifyignore` | в граф идёт только код: `src/`, `scripts/` |

## Отличия от версии магазина

- Примеры и названия узлов — из кода видео (`AnatomyStage()`, `walkTo()`, `Kit()`).
- `.graphifyignore` исключает контент тем (`content/`, `projects/`), `public/`, `docs/`, markdown, `.claude/`,
  `.agents/`: в графе ≈ 1 100 узлов из `src/` и `scripts/`, строится за ~3 с.
