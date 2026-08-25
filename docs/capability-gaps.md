# Реестр capability gaps

Этот файл отделяет проверенный Sites/D1 вертикальный срез от production-системы. Отсутствующая возможность не маскируется кнопкой или мок-ответом: Хост объясняет ограничение и при необходимости пишет `capability_gaps`.

| Возможность | Сейчас | Целевая реализация |
|---|---|---|
| Identity | фиксированный тестовый Player, профиль редактируется | Telegram linking, session и actor audit |
| Хранилище | D1 persistent adapter и миграции прототипа | PostgreSQL, isolation, backup/restore |
| Scheduler | request-driven reconciliation; schedule metadata | persistent worker, leases, retry, dependency/branch execution |
| Recurring | rule создаётся через Хоста и хранится скрыто | RRULE materialization, skip/reschedule через natural dialogue |
| ИИ | Gemini Agent Platform v1, schema-bound decision, playbook router, Context Builder и fallback | evals, canary prompts, referee/narrator/world-director workers |
| Деньги | USD, available/reserved, двойные проводки действий | корпоративные ledgers, debt, escrow и settlement |
| Карьера | evidence/skills/credentials и read-model занятости | найм, performance, повышение, увольнение и рынок труда |
| Организации | универсальная Organization, membership и ownership primitives | permissions, проекты, найм, доли, политика и незаконные структуры |
| Рынок | публичные snapshot/read-model | supply/demand simulation, pricing и конкуренция |
| Знания | Knowledge projection, confidence, source и visibility | provenance graph, Claims, contradictions, discovery/RAG |
| Социальное | отношения, доменная репутация, challenge proposal и второй inbox | consent policy, бой/спор, escrow settlement и расследования |
| NPC | inbox reply сохраняется и возвращается в conversation | role-aware NPC continuation и persistent memory |
| Уведомления | глобальный D1 inbox: read/accept/decline/reply | Telegram outbox, delivery status, retry и deep links |
| Тяжёлые состояния | policy gate и schema primitives | prison, death, legacy/estate и dormant safety engines |
| Наблюдаемость | domain events, AgentRun и capability gaps | structured logs, traces, alerts и audit UI |

Новый тип сущности не создаётся AI через `ALTER TABLE`. Он сначала канонизируется через ComponentDefinition/ontology или становится CapabilityGap, затем проходит schema review, migration, policy и UI renderer.