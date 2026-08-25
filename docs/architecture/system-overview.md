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

Подтверждение использует условный переход и уникальный transition token внутри атомарного D1 batch. Денежный эффект создаёт JournalEntry и парные JournalPosting; reference и idempotency предотвращают повтор. Просроченные действия reconciled при чтении состояния; целевой scheduler остаётся отдельным persistent worker.

## Текущий интерфейс

Один русский игровой shell показывает четыре раздела: Хост, Досье, План и Профиль. Хост — единая conversation-first история: вопрос остаётся вопросом, уточнение остаётся уточнением, а конкретное намерение получает серверную карточку предложения. План показывает только текущий день; recurring rules хранятся в D1 и управляются через разговор. Досье строится из Knowledge projection и не получает истинную локацию другого персонажа. Профиль показывает семь состояний, evidence-based навыки, карьеру, активы, связи, историю и USD-кошелёк. Inbox доступен из любой вкладки.

## Текущая AI-интеграция

`GeminiAgentPlatformProvider` вызывает `aiplatform.googleapis.com` по REST API v1 и получает schema-bound JSON `conversation | clarification | intent`. В runtime передаются только recent conversation, релевантные versioned playbooks и видимый персонажу контекст. AI не назначает стоимость, время, вероятность, права или эффекты и не имеет SQL/tool-доступа. При ошибке провайдера используется тот же контракт с deterministic fallback; перед AI работает обязательный server safety-gate.