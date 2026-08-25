# Матрица сценариев

## Автоматически проверяемый вертикальный срез

Команда `npm run test:scenarios` прогоняет API текущего Sites/D1 runtime. Последний результат 25 августа 2026: **14/14 пройдено**.

| № | Сценарий | Проверяемый инвариант | Статус |
|---:|---|---|---|
| 1 | Русский read-model и состояния | USD; энергия, здоровье, сила, интеллект, мораль, уверенность, усталость; нет focus/stress | пройдено |
| 2 | Свободный вопрос Тимуре | player → host; вопрос не создаёт action и не меняет деньги | пройдено |
| 3 | Силовая тренировка | $18, awaiting confirmation, progress, сила/усталость/skill видны заранее | пройдено |
| 4 | Нешаблонное портфолио | произвольное конкретное намерение становится универсальным предложением | пройдено |
| 5 | Стать президентом сегодня | ограничение объясняется в чате без карточки и roadmap | пройдено |
| 6 | Создать организацию без названия | clarification, без seed-компании | пройдено |
| 7 | Ежедневный испанский | предложение → confirm → today plan + скрытый recurring-rule | пройдено |
| 8 | Изменить имя и возраст | persistent update и восстановление | пройдено |
| 9 | Досье другого игрока | только knownFacts/knownLocation; нет locationId/mapLocationId | пройдено |
| 10 | Прогресс без level/Nomad | нет глобального level, Nomad Labs и studio seed-goal | пройдено |
| 11 | Динамические навыки | evidenceCount и experience journal присутствуют | пройдено |
| 12 | Поединок на $50 | challenge остаётся proposal, ставка не резервируется до confirm | пройдено |
| 13 | Глобальный inbox | notification описывает canAccept/canReply | пройдено |
| 14 | Available/reserved money | available = balance − reserved, ledger доступен | пройдено |

Отдельный `npm run test:safety` проверяет, что запрещённое намерение получает ответ в чате, не создаёт Action и не меняет баланс; legacy endpoint сохраняет `UNSAFE_INTENT`.

## Дополнительные серверные проверки

| Сценарий | Сейчас |
|---|---|
| Повторное подтверждение того же Action | идемпотентный status/transition token |
| Второй foreground при занятом персонаже | `FOREGROUND_CAPACITY_OCCUPIED` |
| Background при foreground | разрешается capacity model |
| Недостаточно денег/энергии | доменная ошибка до мутации |
| Просроченный running Action | request-driven reconciliation, seed/roll/outcome сохраняются |
| Финансовый action | JournalEntry + равные debit/credit postings |
| Платное/опасное действие | всегда awaiting confirmation |

## Ещё не готовые end-to-end сценарии

- реальный recurring/dependency worker и ветви success/failure;
- найм, повышение, увольнение и рынок труда;
- полноценная экономика организации, рынок и торговля активами;
- multi-party escrow settlement;
- deterministic PvP outcome после согласия обеих сторон;
- role-aware NPC continuation;
- World Director, event graph, расследования, prison/death/legacy;
- Telegram delivery, actor identity и permission audit.

## Клиентская QA

- desktop 1920×1080: Host, HUD, history, composer и dock помещаются;
- mobile headless viewport 500×932 (минимальная ширина Windows Chrome): Host, inbox, composer/send и четыре пункта dock видимы одновременно;
- CSS дополнительно ограничивает layout `100vw` для меньших реальных экранов;
- keyboard Enter отправляет, Shift+Enter добавляет строку; focus-visible и reduced-motion сохранены.