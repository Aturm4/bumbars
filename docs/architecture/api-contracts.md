# API-контракты вертикального среза

## Чтение

GET /api/state возвращает канонический GameState: player, character, wallet, actions, routines, ledger, events, world, profile, hostMessages и serverTime. Клиент не синтезирует эти коллекции локально.

## Действия

POST /api/actions принимает только kind и intent. Сервер выбирает название, цену, энергию, длительность, capacity, базовую вероятность и награды.

POST /api/actions/:id/confirm выполняет условный переход и списывает ресурсы один раз. Возможные доменные ошибки: ACTION_NOT_FOUND, ACTION_NOT_CONFIRMABLE, NOT_ENOUGH_ENERGY, NOT_ENOUGH_MONEY и FOREGROUND_CAPACITY_OCCUPIED.

POST /api/actions/:id/cancel отменяет только ожидающее подтверждения предложение. Опасные либо платные эффекты до confirm не применяются.

## Ритуалы

POST /api/routines принимает title, scheduleLabel и durationMinutes. Маршрут конкретного ритуала изменяет pause, resume, skip или cancel. Recurrence parser и очередь являются следующей production-фазой; текущий срез сохраняет расписание и состояния.

## Стабильность

Все ответы об ошибках имеют русский error и машинный code. Мутации должны получить actor из проверенной identity; текущий локальный срез использует фиксированного тестового игрока. Совместимость UI сохраняется при замене D1 на PostgreSQL, если GameState и команды остаются неизменными.
