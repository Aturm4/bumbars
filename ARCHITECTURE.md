# Архитектура Bumbars

## Цель

Bumbars — постоянно живущий многопользовательский мир, где люди описывают намерения естественным языком, ИИ помогает их интерпретировать, а сервер гарантированно и воспроизводимо меняет состояние игры.

## Границы ответственности

ИИ ведёт свободный разговор, отделяет вопрос/уточнение от намерения, формирует только семантический черновик, создаёт повествование, выбирает релевантные доменные playbook и объясняет только знания, доступные персонажу. ActionProposal с числами формирует backend.

Детерминированный backend хранит истину, валидирует предложения, рассчитывает стоимость и вероятность, выполняет RNG, ведёт ledger, запускает persistent jobs, проверяет права и атомарно применяет эффекты. ИИ не получает инструмента для произвольных SQL-изменений.

## Целевая топология

Telegram Bot, Mini App и PWA обращаются к одному API. Модульный монолит содержит Game API, Action Engine, Scheduler, Event Engine и AI Orchestrator. Истина хранится в PostgreSQL; очередь задач переживает перезапуски; audit log и ledger неизменяемы.

## Основные primitives

Entity, ComponentDefinition, EntityComponent, Player, Character, ActionProposal, Action, Schedule, RecurringAction, Effect, Event, Goal, Knowledge, Claim, Relationship, Reputation, Skill, ExperienceEvent, Credential, Organization, Employment, Ownership, Contract, Asset, InventoryItem, Wallet, LedgerEntry, Market, Location, StoryThread, CapabilityGap и AgentRun.

Динамический мир расширяется компонентами с JSON Schema и registry/ontology-слоем. ИИ не создаёт новые production-таблицы.

## Поток действия

1. Пользователь описывает намерение.
2. Оркестратор загружает только релевантные playbook.
3. ИИ создаёт структурированное ActionProposal.
4. Engine проверяет ресурсы, capacities, права, cooldown и допустимые диапазоны.
5. Пользователь видит стоимость, длительность, требования и риск.
6. После подтверждения создаётся persistent job с due_at и idempotency key.
7. Scheduler выполняет воспроизводимый roll.
8. Engine атомарно применяет effects и пишет audit event.
9. ИИ при необходимости создаёт повествовательный итог.

## Время и деньги

Игровая зона — Asia/Tashkent, timestamps хранятся в UTC. Долгие sleep запрещены. Личные и корпоративные финансы — разные ledgers. Зарплата и владение — разные модели. Market Engine рассчитывает экономику, Narrator лишь объясняет результат.

## Текущий вертикальный срез

Клиент не хранит игровое состояние локально и читает его из `/api/state`. Сообщения Хосту, подтверждения действий, профиль, План, recurring rules и inbox проходят через route handlers, доменный модуль и D1 adapter. Внешний Gemini Agent Platform provider возвращает schema-bound решение, но не мутирует состояние. D1 используется для развёрнутого прототипа; целевое production-хранилище остаётся PostgreSQL.

Текущий scheduler работает как restart-safe reconciliation: при запросе сервер находит просроченные running actions, идемпотентно применяет эффекты и пишет ledger/domain event. Это промежуточная реализация до постоянной очереди и отдельного worker.

## Реализованный world slice

D1 schema включает персонажей, механику действий, двойной журнал, географию, знания/утверждения, навыки/опыт/документы, цели, активы, организации/членство/доли, отношения/репутацию, события/рынки, договоры, сюжетные нити, расследования, component registry, capability gaps, AgentRun и чат.

Вероятность хранится в basis points. При reconciliation сервер получает roll из сохранённого seed, фиксирует его рядом с действием и только затем применяет условный результат. Для денежных затрат и наград создаются две противоположные проводки с одним reference.

## Документы

Игровой дизайн: docs/product/vision-and-game-design.md. Каноническая модель: docs/architecture/data-model.md. ИИ и Telegram: docs/architecture/ai-and-telegram.md. API: docs/architecture/api-contracts.md. Production gaps: docs/capability-gaps.md.
