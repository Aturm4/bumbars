const baseUrl = process.env.BUMBARS_BASE_URL || 'http://localhost:3000';
const results = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`${path}: ${body.code || response.status} — ${body.error || 'ошибка'}`);
  return body;
}

async function run(number, title, check) {
  try {
    await check();
    results.push({ number, title, status: 'пройден' });
  } catch (error) {
    results.push({ number, title, status: 'ошибка', detail: error instanceof Error ? error.message : String(error) });
  }
}

async function sendHost(message) {
  const before = await request('/api/state');
  const known = new Set(before.actions.map((action) => action.id));
  const state = await request('/api/host/messages', { method: 'POST', body: JSON.stringify({ message }) });
  return { before, state, action: state.actions.find((item) => !known.has(item.id)) ?? null };
}

async function cancelIfNeeded(action) {
  if (action?.status === 'awaiting_confirmation') {
    await request(`/api/actions/${action.id}/cancel`, { method: 'POST', body: '{}' });
  }
}

const initial = await request('/api/state');

await run(1, 'Русский read-model, USD и семь состояний', async () => {
  assert(initial.wallet.currency === 'USD', `валюта ${initial.wallet.currency}`);
  assert(initial.player.city === 'Ташкент', 'город не локализован');
  for (const key of ['energy', 'health', 'strength', 'intelligence']) assert(Number.isFinite(initial.player[key]), `нет player.${key}`);
  for (const key of ['morale', 'confidence', 'fatigue']) assert(Number.isFinite(initial.character[key]), `нет character.${key}`);
  assert(!('focus' in initial.player) && !('stress' in initial.character), 'устаревшие focus/stress попали в read-model');
});

await run(2, 'Свободный вопрос остаётся разговором', async () => {
  const { before, state, action } = await sendHost('Что сейчас известно о Тимуре?');
  assert(!action, 'вопрос превратился в действие');
  const tail = state.hostMessages.slice(-2);
  assert(tail[0]?.role === 'player' && tail[1]?.role === 'host', 'нарушен порядок реплик игрок → Хост');
  assert(tail[1].body.length > 20, 'Хост не ответил содержательно');
  assert(state.wallet.balanceCents === before.wallet.balanceCents, 'разговор изменил деньги');
});

await run(3, 'Тренировка через Хоста: реалистичная цена, эффекты и progress', async () => {
  const { before, state, action } = await sendHost('Давай начнём силовую тренировку.');
  try {
    assert(action?.kind === 'training', `получен kind=${action?.kind || 'нет действия'}`);
    assert(action.status === 'awaiting_confirmation', 'действие запущено без подтверждения');
    assert(action.costCents >= 0 && action.costCents <= 5000, `нереалистичная цена тренировки ${action.costCents}`);
    assert(action.resolutionMode === 'progress', 'тренировка использует бинарный провал');
    assert(action.effects.strength > 0 && action.effects.fatigue > 0, 'не показаны сила/усталость');
    assert(action.effects.skillName, 'не указан развиваемый навык');
    assert(state.wallet.balanceCents === before.wallet.balanceCents, 'баланс изменился до подтверждения');
  } finally { await cancelIfNeeded(action); }
});

await run(4, 'Нешаблонное намерение создаёт универсальное предложение', async () => {
  const { action } = await sendHost('Давай соберу портфолио из трёх лучших работ и отправлю его потенциальному заказчику.');
  try {
    assert(action?.status === 'awaiting_confirmation', 'нешаблонное действие не стало предложением');
    assert(action.description.length > 20, 'нет описания действия');
    assert(action.effects.summary.length > 10, 'нет ожидаемых последствий');
  } finally { await cancelIfNeeded(action); }
});

await run(5, 'Недостижимый масштаб объясняется в чате', async () => {
  const { state, action } = await sendHost('Давай сегодня станем президентом страны и получим полный контроль.');
  assert(!action, 'недостижимое действие стало карточкой');
  assert(/не хватает|недостижим|требуется|нельзя|масштаб/i.test(state.hostMessages.at(-1)?.body || ''), 'нет объяснения ограничения');
});

await run(6, 'Создание организации требует название и формат', async () => {
  const { state, action } = await sendHost('Давай создадим новую организацию.');
  assert(!action, 'без названия уже создана организация');
  assert(/назов|название|заниматься|формат|уточн/i.test(state.hostMessages.at(-1)?.body || ''), 'Хост не запросил важные параметры');
});

await run(7, 'Повторяющееся правило создаётся через Хоста и попадает в план', async () => {
  const message = 'Давай каждый день, когда освобожусь, заниматься испанским языком 30 минут — сценарная проверка.';
  const { action } = await sendHost(message);
  assert(action?.kind === 'schedule' && action.status === 'awaiting_confirmation', 'нет предложения расписания');
  const state = await request(`/api/actions/${action.id}/confirm`, { method: 'POST', body: '{}' });
  assert(state.dailyPlan.some((item) => item.actionId === action.id), 'договорённость не появилась в плане дня');
  assert(state.routines.some((item) => item.id === 'routine-' + action.id), 'повторяющееся правило не сохранено в базе');
});

await run(8, 'Профиль: имя и возраст редактируются', async () => {
  const original = await request('/api/state');
  const changed = await request('/api/profile', { method: 'PATCH', body: JSON.stringify({ name: 'Проверка', age: 31 }) });
  assert(changed.player.name === 'Проверка' && changed.player.age === 31, 'профиль не обновился');
  const restored = await request('/api/profile', { method: 'PATCH', body: JSON.stringify({ name: original.player.name, age: original.player.age ?? 25 }) });
  assert(restored.player.name === original.player.name, 'профиль не восстановился');
});

await run(9, 'Досье не выдаёт World Truth', async () => {
  const state = await request('/api/state');
  const others = state.world.players.filter((player) => !player.isCurrent);
  assert(others.length >= 3, 'нет других участников');
  assert(others.every((player) => Array.isArray(player.knownFacts)), 'нет слоя знаний персонажа');
  assert(others.every((player) => !('locationId' in player) && !('mapLocationId' in player)), 'истинное местоположение утекло в UI');
  assert(others.every((player) => ['public', 'private', 'secret'].includes(player.knowledgeVisibility)), 'не указана видимость знаний');
});

await run(10, 'Нет глобального уровня и выдуманной Nomad Labs', async () => {
  const state = await request('/api/state');
  assert(!('level' in state.player) && !('level' in state.character), 'обнаружен глобальный уровень');
  assert(!state.profile.organizations.some((item) => item.name === 'Nomad Labs'), 'осталась захардкоженная организация');
  assert(!state.profile.goals.some((item) => /студи/i.test(item.title)), 'осталась выдуманная цель студии');
});

await run(11, 'Навыки основаны на evidence и могут пополняться', async () => {
  const state = await request('/api/state');
  assert(state.profile.skills.length > 0, 'нет навыков');
  assert(state.profile.skills.every((skill) => Number.isFinite(skill.evidenceCount)), 'у навыка нет evidence_count');
  assert(state.profile.experience.length > 0, 'нет журнала опыта');
});

await run(12, 'Вызов хранит ставку как предложение, а не запускает бой', async () => {
  const { before, state, action } = await sendHost('Предлагаю Тимуру поединок на ринге по $50 с каждого.');
  try {
    assert(action?.kind === 'challenge', `получен kind=${action?.kind || 'нет действия'}`);
    assert(action.status === 'awaiting_confirmation', 'вызов отправлен без подтверждения');
    assert(action.effects.summary.includes('$') || action.description.includes('$'), 'ставка не показана в USD');
    assert(state.wallet.reservedCents === before.wallet.reservedCents, 'ставка зарезервирована до подтверждения');
  } finally { await cancelIfNeeded(action); }
});

await run(13, 'Глобальный inbox поддерживает решение и ответ', async () => {
  const state = await request('/api/state');
  assert(Array.isArray(state.notifications), 'нет inbox');
  assert(state.notifications.every((item) => typeof item.canAccept === 'boolean' && typeof item.canReply === 'boolean'), 'уведомления не описывают доступные действия');
});

await run(14, 'Деньги и резервы разделены', async () => {
  const state = await request('/api/state');
  assert(state.wallet.availableCents === state.wallet.balanceCents - state.wallet.reservedCents, 'доступный баланс рассчитан неверно');
  assert(state.ledger.length > 0, 'нет финансового журнала');
});

await run(15, 'Смысл действия определяет разные эффекты', async () => {
  const political = await sendHost('Давай подготовлю выступление для встречи с жителями района и соберу их обратную связь.');
  const learning = await sendHost('Давай изучу сложный модуль по системному дизайну и законспектирую выводы.');
  try {
    assert(political.action?.status === 'awaiting_confirmation', 'политическое действие не стало предложением');
    assert(learning.action?.status === 'awaiting_confirmation', 'обучение не стало предложением');
    assert(political.action.effects.skillName !== learning.action.effects.skillName, 'разные действия получили один шаблонный навык');
    assert(learning.action.effects.intelligence > 0, 'обучение не развивает интеллект');
    assert(political.action.effects.summary !== learning.action.effects.summary, 'разные действия получили одинаковое описание эффекта');
  } finally {
    await cancelIfNeeded(political.action);
    await cancelIfNeeded(learning.action);
  }
});

console.log(JSON.stringify({ baseUrl, passed: results.filter((item) => item.status === 'пройден').length, total: results.length, results }, null, 2));
if (results.some((item) => item.status !== 'пройден')) process.exitCode = 1;
