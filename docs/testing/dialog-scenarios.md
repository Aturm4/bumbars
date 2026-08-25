# Сценарии из `dialog.md`

Каталог собран после чтения всех 7 989 строк `dialog.md`. «Готово» означает существующий код и проверяемый путь; «частично» не выдаётся за production-завершение.

## Разговор, действия и планирование

| № | Сценарий | Статус на 25.08.2026 | Что осталось |
|---:|---|---|---|
| 1 | «Что сейчас делает Тимур?» | готово | ответ строится из Knowledge, не World Truth |
| 2 | «А что если использовать другую стратегию?» | готово | conversation не создаёт Action |
| 3 | «Давай тогда сделаем так» после обсуждения | частично | Gemini получает recent history; нужен eval на coreference и fallback-history parser |
| 4 | Намерение без «я хочу» | готово | — |
| 5 | Недостижимая крупная цель | готово | категории нехватки без оптимального roadmap |
| 6 | Обычная тренировка | готово | $18, время, энергия, effects, risk до confirm |
| 7 | Завершение тренировки | готово в engine | progress-grade вместо бинарного провала; долгий таймер не входит в быстрый smoke |
| 8 | Обучение новой деятельности | готово в engine | skill UPSERT + evidence после resolution |
| 9 | Новая специализация | частично | динамическое имя навыка есть; нужен ontology merge/alias review |
| 10 | «После зала поеду работать» | частично | `AFTER` сохраняется; dependency executor ещё нет |
| 11 | «Сделай, когда освобожусь» | частично | `WHEN_FREE` сохраняется; worker ещё нет |
| 12 | Конфликт foreground | готово на сервере | автоматический поиск следующего окна ещё нет |
| 13 | План на день | готово | только текущий день, без трекера привычек |
| 14 | «Каждый день…» | готово как rule | recurring хранится скрыто; materialization worker ещё нет |
| 15 | Изменить/пропустить recurring через разговор | частично | API mutation есть; intent-to-mutation playbook ещё нет |
| 16 | Условный план по исходу | нет | нужен branch/dependency engine |
| 17 | Резерв будущего действия | готово | available/reserved разделены |

## Карьера, образование, бизнес и имущество

| № | Сценарий | Статус | Что осталось |
|---:|---|---|---|
| 18 | Устройство на должность | нет | labor-market/referee engine |
| 19 | Повышение или увольнение | нет | performance history и organization state |
| 20 | Курс/сертификат | частично | learning action/evidence есть; attendance/checkpoints нет |
| 21 | Создать организацию | частично | Хост уточняет название; сервер создаёт universal Organization после progress-resolution |
| 22 | Компания после создания | частично | ledger primitives есть; market/expenses/loss engine нет |
| 23 | Нанять аналитика | нет | Knowledge-producing contract |
| 24 | Нанять друга | нет | offer, salary, role, permissions, consent |
| 25 | Совместно основать организацию | нет | contribution/ownership settlement |
| 26 | Продать актив игроку | нет | Trade Offer + atomic settlement |
| 27 | Escrow-сделка | частично | reservation primitive есть; condition settlement нет |
| 28 | Оценка имущества | частично | estimated/liquidation отображаются; valuation flow нет |
| 29 | Компания/партия/фонд/клуб/банда/секта | частично | universal Organization есть; доменные policies ещё нет |

## Мир, знания, социальное и тяжёлые последствия

| № | Сценарий | Статус | Что осталось |
|---:|---|---|---|
| 30 | Публичный и приватный факт | частично | visibility и Knowledge projection есть; multi-viewer policy ещё не полная |
| 31 | Ложь NPC/игроку | schema-only | Claim/provenance/contradiction engine |
| 32 | Нанять шпиона | нет | contract → uncertain Knowledge |
| 33 | Значимое событие мира | schema/read-only | World Director + event budget |
| 34 | Старый конфликт | частично | story threads/events есть; причинный event graph нет |
| 35 | Поединок за $5 000 | частично | proposal, confirm, reservation, second inbox; outcome/settlement нет |
| 36 | Сообщение от NPC | частично | inbox reply есть; role-aware continuation нет |
| 37 | Опасное действие | частично | safety/irreversible gate есть; усиленное подтверждение доменных рисков не обобщено |
| 38 | Расследование | schema-only | stage engine и evidence discovery |
| 39 | Тюрьма | schema-only | Character restrictions + allowed-action policy |
| 40 | Смерть персонажа | schema-only | Legacy/Estate/new Character |
| 41 | Долгий офлайн | нет | Autopilot/Dormant и PvP protection |
| 42 | Итоги недели | нет | public/private summary projection |
| 43 | Биография | частично | important events/story threads отображаются; summarizer нет |

## Профиль и интерфейс

| № | Сценарий | Статус | Что осталось |
|---:|---|---|---|
| 44 | Изменить имя и возраст | готово | persistent API + UI |
| 45 | Семь состояний | готово | energy, health, strength, intelligence, morale, confidence, fatigue |
| 46 | Доказательства навыка | готово | competence + evidenceCount + experience journal |
| 47 | Новая механика без заранее написанного экрана | частично | registry + generic key/value renderer; нет набора специализированных renderer policies |
| 48 | Capability gap | готово для неподдержанного intent | запись fingerprint/occurrences + честный чат-ответ |
| 49 | Единая Web/Mini App/Telegram история | частично | единая chat table/source есть; Telegram delivery/identity нет |
| 50 | Уведомления из любой вкладки | готово в web | глобальный bell/inbox; Telegram outbox ещё нет |

## Проверка

- `npm run test:scenarios`: 14/14;
- `npm run test:safety`: пройдено;
- `npm run typecheck`: пройдено;
- `npm run lint`: пройдено без предупреждений;
- `npm run build`: пройдено;
- desktop/mobile visual QA: пройдено.