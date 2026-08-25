# Прогресс Bumbars

## 25 августа 2026 — conversation-first вертикальный срез

Завершена переработка по полному построчному аудиту `Read-first-instruction-for-dialog.md` и `dialog.md`.

### Реализовано

- единый свободный чат с Хостом без префикса «Я хочу», кнопки «Рассчитать» и быстрых шаблонов;
- разделение ответов Хоста на разговор, уточнение и конкретное намерение;
- Gemini Agent Platform API v1 через `aiplatform.googleapis.com`, schema-bound JSON и безопасный deterministic fallback;
- сервер назначает цену, длительность, вероятность, права и эффекты; AI не меняет D1;
- экономика интерфейса и новых действий переведена в USD; тренировка стоит $18;
- карточка до подтверждения показывает время, расход энергии, риск, способ разрешения и ожидаемые изменения;
- действия типа progress не получают абсурдный бинарный провал; chance остаётся только там, где результат действительно неопределён;
- семь состояний: энергия, здоровье, сила, интеллект, мораль, уверенность, усталость;
- динамические навыки и evidence обновляются после разрешения действий;
- «Путь» заменён планом текущего дня; recurring-rule создаётся через Хоста, хранится скрыто и доступен AI-контексту;
- профиль позволяет менять имя и возраст;
- `Nomad Labs`, выдуманные цели, тестовые ритуалы, тестовые реплики и зависшие предложения удалены из демо-состояния;
- «Досье» читает только Knowledge projection, не истинную геолокацию других персонажей;
- универсальные Organization создаются только после решения игрока и уточнения названия;
- глобальный inbox поддерживает read, accept, decline и reply;
- вызов на поединок создаёт предложение, резервирует ставку только после подтверждения и отправляет уведомление второй стороне;
- ComponentDefinition/EntityComponent и capability-gap registry подключены к read-model;
- desktop и mobile Host визуально проверены headless Chrome; поле отправки и dock остаются доступны на mobile.

### Проверено

- `npm run typecheck` — пройдено;
- `npm run lint` — пройдено без предупреждений;
- `npm run test:safety` — пройдено;
- `npm run test:scenarios` — 14/14;
- `npm run build` — production-сборка пройдена;
- private Sites production deployment — успешно, owner-only access.

### Следующие production-фазы

- Telegram identity и доставка inbox/outbox;
- PostgreSQL adapter и persistent scheduler;
- полноценные dependency/branch/recurring executions;
- карьерный, рыночный, контрактный, escrow и deterministic PvP engines;
- role-aware NPC continuation и event graph;
- eval-набор для Gemini, prompt/version rollout и observability.