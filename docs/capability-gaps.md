# Реестр capability gaps

Этот файл честно отделяет реализованный вертикальный срез от production-системы.

| Возможность | Сейчас | Целевая реализация |
|---|---|---|
| Identity | фиксированный тестовый Player; HMAC-модуль готов | Telegram user linking, session и actor audit |
| Хранилище | D1 persistent adapter | PostgreSQL с миграциями и изоляцией транзакций |
| Scheduler | request-driven reconciliation | отдельный persistent worker с lease и retry |
| ИИ | deterministic development provider и skill router | schema-bound OpenAI provider, evals и policy gates |
| Планирование | сохранённые ритуалы и состояния | RRULE, AFTER, WHEN_FREE, dependencies, reschedule |
| Деньги | двойные проводки действий | полная личная/корпоративная бухгалтерия, settlement и escrow |
| Компании | организация, членство, доля, показатели | permissions, проекты, найм, увольнение, выпуск/продажа долей |
| Рынок | канонические snapshots | supply/demand simulation, pricing и конкуренция |
| Знания | таблицы Knowledge и Claims | provenance graph, contradiction handling и RAG |
| Социальное | отношения и доменная репутация | consent/PvP policies, расследования и публичность |
| Telegram | verifier abstraction и архитектура | webhook, Mini App auth, topics и outbox delivery |
| Наблюдаемость | domain events и AgentRun | structured logs, traces, alerts, backups и audit UI |

Новый тип сущности не создаётся ИИ через ALTER TABLE. Он сначала становится CapabilityGap, затем проходит проектирование, schema review, migration, policy и UI renderer.
