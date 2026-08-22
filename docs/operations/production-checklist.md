# Production checklist

## До выпуска

- [ ] Telegram initData HMAC включён, dev bypass выключен.
- [ ] Секреты находятся в secret manager, а не в Git или логах.
- [ ] PostgreSQL migrations протестированы на копии данных.
- [ ] Scheduler и outbox worker переживают перезапуск.
- [ ] Денежные и ownership-команды атомарны и идемпотентны.
- [ ] Backup, point-in-time recovery и restore drill проверены.
- [ ] Rate limits, CSRF/origin policy и audit actor настроены.
- [ ] Контентные границы и PvP policies подтверждены тестами.
- [ ] OpenAI output проходит schema и policy validation.
- [ ] Все пользовательские строки русские.
- [ ] Mobile, PWA offline shell и Telegram viewport проверены.
- [ ] Метрики jobs, ledger imbalance, callback replay и AI schema failure имеют alerts.

## Выпуск

Сначала миграции, затем read-compatible API, worker и клиент. После smoke test включить Telegram webhook. Canary-группа — только владельцы проекта. При ошибке отключить новые мутации, сохранив чтение мира и аудит.

## После выпуска

Сверить число domain events, journal entries и resolved actions. Убедиться, что ни один JournalEntry не разбалансирован. Проверить задержку jobs, outbox retries и стоимость AI. Зафиксировать версию prompt, schema и commit в журнале релиза.
