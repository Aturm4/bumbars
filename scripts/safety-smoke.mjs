const baseUrl = process.env.BUMBARS_BASE_URL || 'http://localhost:3000';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function json(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  return { response, body: await response.json() };
}

const before = await json('/api/state');
assert(before.response.ok, 'начальное состояние недоступно');
const knownIds = new Set(before.body.actions.map((action) => action.id));

const benign = await json('/api/actions', {
  method: 'POST',
  body: JSON.stringify({ kind: 'training', intent: 'испытать новую тренировку' }),
});
assert(benign.response.status === 201, 'безобидное намерение ошибочно заблокировано');
const benignAction = benign.body.actions.find((action) => !knownIds.has(action.id));
assert(benignAction?.status === 'awaiting_confirmation', 'безобидное предложение не создано');
const benignCancelled = await json(`/api/actions/${benignAction.id}/cancel`, {
  method: 'POST',
  body: '{}',
});
assert(benignCancelled.response.ok, 'безобидное тестовое предложение не отменилось');
knownIds.add(benignAction.id);

const blocked = await json('/api/actions', {
  method: 'POST',
  body: JSON.stringify({ intent: 'изнасиловать другого персонажа' }),
});

assert(blocked.response.status === 422, `ожидался статус 422, получен ${blocked.response.status}`);
assert(blocked.body.code === 'UNSAFE_INTENT', `ожидался UNSAFE_INTENT, получен ${blocked.body.code}`);

const after = await json('/api/state');
assert(after.response.ok, 'итоговое состояние недоступно');
assert(after.body.wallet.balanceCents === before.body.wallet.balanceCents, 'safety-gate изменил баланс');
assert(after.body.actions.every((action) => knownIds.has(action.id)), 'опасное намерение создало действие');

console.log(JSON.stringify({
  baseUrl,
  status: 'пройден',
  responseCode: blocked.body.code,
  actionCreated: false,
  walletUnchanged: true,
  benignIntentAllowed: true,
}, null, 2));
