# Стратегия тестирования

## Frontend

- production build и lint на каждый значимый change;
- component tests для навигации, таймера, modal и form submit;
- E2E для пяти вкладок и трёх drill-in экранов;
- accessibility: keyboard, labels, contrast и reduced motion;
- responsive snapshots на 360, 430, 768 и 1280 px.

## Backend

- property tests для денег и ownership;
- state-machine tests для Action;
- idempotency tests для callback и job;
- deterministic RNG replay;
- timezone и overdue job scenarios;
- concurrency tests двойного подтверждения;
- permission и PvP policy tests.

## AI

- schema adherence;
- отсутствие прямых state mutations;
- скрытие неизвестной персонажу информации;
- отсутствие оптимального walkthrough;
- стабильная маршрутизация domain skills;
- red-team сценарии prompt injection и tool misuse.
