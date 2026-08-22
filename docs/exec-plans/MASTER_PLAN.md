# MASTER PLAN

## Фаза 0 — продукт и архитектура — выполнено

- [x] восстановить итоговые решения;
- [x] зафиксировать инварианты;
- [x] определить продуктовую навигацию;
- [x] создать проектную память.

## Фаза 1 — интерактивный frontend-срез — выполнено

- [x] восемь ключевых экранов;
- [x] русская локализация;
- [x] мобильная адаптация;
- [x] навигация, таймер, формы и уведомления;
- [x] метаданные и социальный preview;
- [x] финальная проверка сборки и lint.

## Фаза 2 — core backend — ожидает

- [ ] PostgreSQL и migrations;
- [ ] identity, player и character;
- [ ] entity-component registry;
- [ ] event store и audit log;
- [ ] API contracts и OpenAPI.

## Фаза 3 — deterministic engine — ожидает

- [ ] ActionProposal validator;
- [ ] confirmation tokens;
- [ ] effects и reproducible RNG;
- [ ] capacities и cooldowns;
- [ ] idempotent persistent scheduler.

## Фаза 4 — экономика и планирование — ожидает

- [ ] double-entry ledger;
- [ ] recurring actions;
- [ ] contracts, employment и ownership;
- [ ] market engine.

## Фаза 5 — AI orchestration — ожидает

- [ ] skill router;
- [ ] context builder;
- [ ] referee, narrator и world director;
- [ ] schema-bound tool calls;
- [ ] evals и prompt versioning.

## Фаза 6 — Telegram и production — ожидает

- [ ] private bot и group news;
- [ ] Mini App init verification;
- [ ] notifications;
- [ ] observability, backups и Linux deployment;
- [ ] нагрузочные и security tests.

## Промежуточный серверный срез Sites/D1 — выполнено

- [x] постоянная D1 schema и migration;
- [x] player, wallet, ledger, routines и domain events;
- [x] ActionProposal, confirmation, cancel, running и resolved;
- [x] идемпотентное списание и request-driven reconciliation;
- [x] клиент переведён с simulation state на API;
- [ ] Telegram identity вместо тестового игрока;
- [ ] PostgreSQL adapter и постоянная очередь;
- [ ] double-entry ledger вместо текущего append-only wallet ledger.
