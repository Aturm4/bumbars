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
  if (!response.ok) throw new Error(`${path}: ${body.code || response.status}`);
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

async function createAndCancel(payload, expectedKind) {
  const before = await request('/api/state');
  const knownIds = new Set(before.actions.map((action) => action.id));
  const proposed = await request('/api/actions', { method: 'POST', body: JSON.stringify(payload) });
  const action = proposed.actions.find((item) => !knownIds.has(item.id));
  assert(action?.status === 'awaiting_confirmation', 'нет нового подтверждаемого предложения');
  assert(action.kind === expectedKind, `ожидался kind=${expectedKind}, получен ${action.kind}`);
  assert(proposed.wallet.balanceCents === before.wallet.balanceCents, 'баланс изменился до подтверждения');
  const cancelled = await request(`/api/actions/${action.id}/cancel`, { method: 'POST', body: '{}' });
  assert(cancelled.actions.find((item) => item.id === action.id)?.status === 'cancelled', 'предложение не отменилось');
  assert(cancelled.wallet.balanceCents === before.wallet.balanceCents, 'отмена изменила баланс');
}

const initial = await request('/api/state');

await run(1, 'Свободное намерение через Gemini → тренировка', async () => {
  await createAndCancel({ intent: 'хочу сделать кардио и укрепить выносливость' }, 'training');
});
await run(2, 'Учебный спринт', async () => {
  await createAndCancel({ kind: 'study', intent: 'разобрать один учебный модуль' }, 'study');
});
await run(3, 'Рабочий контракт', async () => {
  await createAndCancel({ kind: 'work', intent: 'взять небольшую задачу для студии' }, 'work');
});
await run(4, 'Текстовый маршрут в другой район', async () => {
  const currentMap = initial.world.players.find((player) => player.isCurrent)?.mapLocationId;
  const target = initial.world.locations.find((location) => ['district', 'region'].includes(location.kind) && location.id !== currentMap);
  assert(target, 'нет доступного района назначения');
  await createAndCancel({ kind: 'travel', intent: `поехать в ${target.name}`, targetLocationId: target.id }, 'travel');
});
await run(5, 'Полный жизненный цикл ритуала', async () => {
  const title = `Сценарный тест ${Date.now().toString().slice(-6)}`;
  let state = await request('/api/routines', { method: 'POST', body: JSON.stringify({ title, scheduleLabel: 'Каждый день · 21:00', durationMinutes: 15 }) });
  const routine = state.routines.find((item) => item.title === title);
  assert(routine?.status === 'active', 'ритуал не создан');
  state = await request(`/api/routines/${routine.id}`, { method: 'PATCH', body: JSON.stringify({ mutation: 'pause' }) });
  assert(state.routines.find((item) => item.id === routine.id)?.status === 'paused', 'пауза не сохранилась');
  state = await request(`/api/routines/${routine.id}`, { method: 'PATCH', body: JSON.stringify({ mutation: 'resume' }) });
  assert(state.routines.find((item) => item.id === routine.id)?.status === 'active', 'возобновление не сохранилось');
  state = await request(`/api/routines/${routine.id}`, { method: 'PATCH', body: JSON.stringify({ mutation: 'skip' }) });
  assert(state.routines.find((item) => item.id === routine.id)?.skipNext === true, 'пропуск не сохранился');
  state = await request(`/api/routines/${routine.id}`, { method: 'PATCH', body: JSON.stringify({ mutation: 'cancel' }) });
  assert(!state.routines.some((item) => item.id === routine.id), 'отменённый ритуал остался активным');
});
await run(6, 'Карьера без глобального уровня', async () => {
  assert(initial.profile.employment?.title, 'нет активной занятости');
  assert(initial.profile.skills.length > 0 && initial.profile.experience.length > 0, 'нет evidence/компетенций');
  assert(!('level' in initial.player) && !('level' in initial.character), 'обнаружен глобальный уровень');
});
await run(7, 'Состояние Nomad Labs', async () => {
  const organization = initial.profile.organizations.find((item) => item.name === 'Nomad Labs');
  assert(organization && organization.members > 0 && organization.ownershipPercent > 0, 'организация или доля не загружены');
});
await run(8, 'Многомерные отношения и репутация', async () => {
  assert(initial.profile.relationships.length >= 3, 'недостаточно канонических отношений');
  assert(initial.profile.relationships.every((item) => ['trust', 'respect', 'affection', 'resentment'].every((key) => Number.isFinite(item[key]))), 'шкалы отношений повреждены');
  assert(initial.profile.reputations.some((item) => item.visibility === 'public'), 'нет публичной репутации');
});
await run(9, 'Кошелёк, активы и проводки', async () => {
  assert(Number.isFinite(initial.wallet.balanceCents), 'нет баланса');
  assert(initial.profile.assets.length > 0, 'нет активов');
  assert(initial.ledger.length > 0, 'нет журнала проводок');
});
await run(10, 'Четыре участника в текстовом досье', async () => {
  assert(initial.world.players.length === 4, `участников: ${initial.world.players.length}, ожидалось 4`);
  assert(initial.world.players.every((item) => item.biography && item.lastSeenAt && item.locationId), 'в read-model участника не хватает сведений для досье');
  assert(initial.world.events.length > 0, 'в досье нет известных событий');
  assert(initial.world.locations.some((item) => item.kind === 'district'), 'нет текстовых маршрутов');
});

console.log(JSON.stringify({ baseUrl, passed: results.filter((item) => item.status === 'пройден').length, total: results.length, results }, null, 2));
if (results.some((item) => item.status !== 'пройден')) process.exitCode = 1;
