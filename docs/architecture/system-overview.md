# Обзор системы

## Модули модульного монолита

- identity: Telegram user, player и character;
- world: locations, entities, organizations и visibility;
- actions: proposal, validation, confirmation и effects;
- scheduling: jobs, recurring rules и capacities;
- economy: wallets, ledgers, contracts и settlement;
- progression: skills, credentials и experience evidence;
- social: relationships, reputation, PvP consent и safety;
- knowledge: claims, provenance, confidence и RAG;
- ai: router, context builder, referee, narrator и world director;
- delivery: API, Telegram bot, Mini App/PWA и notifications.

## Безопасность

- Telegram init data проверяется на сервере;
- каждый mutation привязан к actor и permission policy;
- денежные и ownership-команды транзакционны;
- callback и scheduler job идемпотентны;
- AI output проходит schema validation;
- PvP и контентные границы имеют явные policy gates;
- секреты задаются через environment и не попадают в репозиторий.

## Состояния действия

draft → proposed → awaiting_confirmation → scheduled/running → resolved, failed или cancelled.

Каждый переход создаёт domain event. Повторный callback не должен повторять списание или награду.

## Реализованный адаптер прототипа

Развёрнутый Sites-срез использует D1 binding `DB`. Публичные route handlers не принимают произвольные деньги, длительность или эффекты: клиент передаёт только намерение или тип каталожного действия, доменный сервер выбирает допустимые параметры сам.

Подтверждение использует условный переход и уникальный transition token внутри атомарного D1 batch. Ledger имеет unique action_id, поэтому повторный callback не создаёт вторую финансовую запись. Просроченные действия reconciled при чтении состояния; целевой scheduler остаётся отдельным persistent worker.
