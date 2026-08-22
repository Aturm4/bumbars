# Передача проекта на Linux

## Требования

Node.js 22.13+, npm, Git и доступ к выбранному хранилищу. Для текущего Sites/D1-развёртывания нужен Wrangler; для целевого production — PostgreSQL, очередь jobs и Telegram bot token.

## Подготовка

1. Клонировать репозиторий.
2. Выполнить npm ci.
3. Скопировать .env.example в локальный секретный файл и заполнить значения вне Git.
4. Запустить npm run typecheck, npm run lint и npm run build.
5. Для разработки выполнить npm run dev.
6. Проверить GET /api/state и сценарий proposal → confirm → resolved.

## Переменные окружения

TELEGRAM_BOT_TOKEN обязателен для проверки Mini App. TELEGRAM_INIT_DATA_MAX_AGE_SECONDS ограничивает возраст подписи. OPENAI_API_KEY используется только боевым AI provider. DATABASE_URL и очередь задаются при миграции на PostgreSQL. DEV_IDENTITY_BYPASS должен быть false в production.

## Миграции

Текущие SQL-файлы в drizzle описывают D1-срез. Перед production-миграцией на PostgreSQL нужно адаптировать типы, внешние ключи и транзакции, прогнать dry run на копии и сверить ledger balances. Каноническое время — UTC, отображение — Asia/Tashkent.

## Процессы

API, scheduler worker и Telegram delivery worker запускаются отдельно и получают readiness/liveness probes. Jobs блокируются lease-механизмом, имеют attempts, next_attempt_at и idempotency_key. Перезапуск не должен повторять денежный эффект.

## Проверка после запуска

Войти через Telegram Mini App, открыть все вкладки, создать бесплатное и платное предложение, отменить одно, подтвердить другое, дождаться результата, сверить проводки и публичное уведомление. Затем проверить backup/restore, журнал ошибок и отключённый dev bypass.
