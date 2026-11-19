# Источники

Каждый факт: S<n>, ссылка, страница/раздел, границы применимости (§7). Первичные — страницы и статьи Anthropic; вторичные пересказы не используются для фактов.

| Id | Источник | Что берём | Границы |
| --- | --- | --- | --- |
| S1 | Anthropic, «Tracing the thoughts of a large language model», 27.03.2025 — https://www.anthropic.com/research/tracing-thoughts-language-model | Планирование рифмы заранее («rabbit»), подавление и подмена понятия («green»); общие понятия для разных языков; метод circuit tracing | Метод видит лишь часть вычислений модели; исследована конкретная модель (Claude 3.5 Haiku), не «все Claude» |
| S2 | Bai et al., «Constitutional AI: Harmlessness from AI Feedback», 2022 — https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback | Две фазы: самокритика и правка ответа; обучение с подкреплением на оценках ИИ по принципам (RLAIF) | Метод статьи 2022 г.; детали обучения текущих моделей не раскрыты полностью |
| S3 | Anthropic, «Claude's Constitution» — https://www.anthropic.com/news/claudes-constitution (новая версия 21.01.2026) | Конституция — явный набор ценностей, применяется в обучении | Сверить формулировки с текстом страницы перед сценарием |
| S4 | Anthropic docs, «Context windows» — https://platform.claude.com/docs/en/build-with-claude/context-windows | Контекстное окно считается в токенах; включает историю и ответ; размер зависит от модели | Цифры размера окна менять вместе с моделями; брать на дату сценария |
| S5 | Vaswani et al., «Attention Is All You Need», 2017 — https://arxiv.org/abs/1706.03762 | Архитектура трансформер, внимание | Общая архитектура; точное устройство Claude не опубликовано |
| S6 | Anthropic, Glossary — https://platform.claude.com/docs/en/resources/glossary (сверено 19.11.2026) | Tokens: «words, subwords, characters, or even bytes»; текст «encoded into a series of tokens». Pretraining: «pretrained to predict the next word, given the previous context». Temperature: «controls the randomness of a model's predictions»; низкая — «most probable phrasing» | ~3,5 англ. символа на токен — только для Claude 4.7+, в ролик не брать |

Сверка S1 (19.11.2026, страница открыта): модель — «Claude 3.5 Haiku»; «Claude writes text one word at a time»; двустишие «He saw a carrot and had to grab it, / His hunger was like a starving rabbit»; «Claude plans ahead»; подавили «rabbit» → новая строка на «habit»; вставили «green» → осмысленная, но уже не рифмующаяся строка на «green»; «our method only captures a fraction of the total computation»; разбор занимает «a few hours of human effort».

Было нужно найти до сценария (если ракурс потребует): определение токена в глоссарии Anthropic (https://platform.claude.com/docs/en/resources/glossary); предобучение на предсказании следующего токена (первичный источник).
