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

## Фаза 2 — core backend — выполняется

- [ ] PostgreSQL и migrations;
- [x] identity verifier abstraction, player и character;
- [x] entity-component registry и capability gaps;
- [x] domain events, AgentRun и audit primitives;
- [x] API contracts; [ ] OpenAPI generation.

## Фаза 3 — deterministic engine — вертикальный срез выполнен

- [x] ActionProposal validator;
- [x] confirmation tokens;
- [x] effects и reproducible RNG;
- [x] capacities; [ ] cooldowns;
- [x] idempotent reconciliation; [ ] отдельный persistent worker.

## Фаза 4 — экономика и планирование — выполняется

- [x] double-entry ledger для действий;
- [ ] recurring actions;
- [x] contracts, employment и ownership primitives;
- [ ] market engine.

## Фаза 5 — AI orchestration — ожидает

- [x] skill router;
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
- [x] double-entry journal entries/postings для стартового баланса и действий.

## Фаза 2.1 — игровая география и аудит исходников — выполнено

- [x] построчный аудит 9 838 строк двух исходных файлов;
- [x] три визуальных концепта «Квартала» и «Мира»;
- [x] серверные цели поездок и миграция `action_targets`;
- [x] четыре постоянных Player/Character с фишками на картах;
- [x] атомарное перемещение после успешного разрешения;
- [x] новый настольный «Квартал» и атлас «Мир»;
- [x] единый development `AiProvider`;
- [ ] внешний schema-bound AI provider — после передачи API;
- [ ] browser visual QA — после устранения системного Windows ACL.
