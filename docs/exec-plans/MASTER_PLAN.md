# MASTER PLAN

## Фаза 0 — продукт и архитектура — выполнено

- [x] построчно прочитать 9 838 строк двух исходных документов;
- [x] зафиксировать инварианты, модели знаний и границу AI/backend;
- [x] собрать полный аудит и каталог 50 сценариев;
- [x] закрепить четыре продуктовых раздела: Хост, Досье, План, Профиль.

## Фаза 1 — самостоятельный игровой интерфейс — выполнено

- [x] отказаться от копирования ранних референсов и собрать самостоятельный игровой shell;
- [x] единый Telegram-подобный разговор с Хостом;
- [x] утверждённое текстовое «Досье» без карты и утечки World Truth;
- [x] План текущего дня без ручного трекера привычек;
- [x] профиль, семь состояний, навыки, карьера, активы, связи, история и кошелёк;
- [x] глобальный колокольчик/inbox;
- [x] desktop и mobile visual QA;
- [x] полностью русский UI.

## Фаза 2 — persistent backend adapter — вертикальный срез выполнен

- [x] D1 schema/migrations и канонический `GameState`;
- [x] Player/Character, Knowledge projection и visibility;
- [x] actions, mechanics, effects, payloads, chat links и daily plan;
- [x] routines, notifications и fund reservations;
- [x] component registry, AgentRun и capability gaps;
- [x] профильные настройки и динамические состояния;
- [ ] PostgreSQL adapter и migration runner;
- [ ] OpenAPI generation.

## Фаза 3 — deterministic action engine — вертикальный срез выполнен

- [x] intent → semantic draft → server ActionProposal;
- [x] отдельное подтверждение опасных/платных действий;
- [x] server-side price, duration, capacity, probability и effects;
- [x] progress/chance/deterministic resolution modes;
- [x] воспроизводимый RNG и идемпотентный transition token;
- [x] request-driven reconciliation;
- [x] dynamic skill/evidence progression;
- [ ] cooldowns, dependency executor и persistent worker.

## Фаза 4 — экономика и планирование — выполняется

- [x] USD read-model и реалистичный вертикальный каталог;
- [x] available/reserved balance;
- [x] double-entry postings для расходов и доходов действий;
- [x] today plan, AT/AFTER/WHEN_FREE metadata;
- [x] recurring-rule создаётся через Хоста и скрыт от основного интерфейса;
- [x] universal Organization seed-free flow;
- [x] challenge proposal, reservation и inbox второй стороны;
- [ ] фактический dependency/recurring scheduler;
- [ ] market, contracts, escrow settlement и deterministic PvP.

## Фаза 5 — AI orchestration — вертикальный срез выполнен

- [x] Gemini Agent Platform REST v1 с runtime secret;
- [x] schema-bound conversation/clarification/intent decision;
- [x] domain skill router и versioned playbooks;
- [x] Knowledge-safe Context Builder;
- [x] prompt version в AgentRun;
- [x] deterministic fallback и server safety-gate;
- [ ] narrator применяется к уже рассчитанным исходам;
- [ ] referee/world-director workers;
- [ ] evals, canary rollout и prompt observability.

## Фаза 6 — multiplayer production — ожидает

- [ ] Telegram identity, webhook и Mini App init verification;
- [ ] outbox delivery для уведомлений;
- [ ] actor permissions, consent и full PvP lifecycle;
- [ ] role-aware NPC replies и event graph;
- [ ] observability, backup/restore и security/load tests;
- [ ] production PostgreSQL + persistent queue.

## Контроль качества текущей итерации

- [x] `npm run typecheck`;
- [x] `npm run lint` без предупреждений;
- [x] `npm run test:safety`;
- [x] `npm run test:scenarios` — 14/14;
- [x] `npm run build`;
- [x] desktop/mobile headless Chrome QA;
- [x] private production deployment текущей версии.