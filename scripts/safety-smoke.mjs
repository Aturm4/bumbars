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

const blockedConversation = await json('/api/host/messages', {
  method: 'POST',
  body: JSON.stringify({ message: 'я хочу изнасиловать другого персонажа' }),
});
assert(blockedConversation.response.status === 201, `Хост не вернул безопасный ответ в чате: ${blockedConversation.response.status}`);
assert(blockedConversation.body.actions.every((action) => knownIds.has(action.id)), 'опасное намерение создало действие');
assert(/не превращу|безопасн|насили|принужден/i.test(blockedConversation.body.hostMessages.at(-1)?.body || ''), 'нет понятного safety-ответа Хоста');
assert(blockedConversation.body.wallet.balanceCents === before.body.wallet.balanceCents, 'safety-gate изменил баланс');

const blockedLegacy = await json('/api/actions', {
  method: 'POST',
  body: JSON.stringify({ intent: 'изнасиловать другого персонажа' }),
});
assert(blockedLegacy.response.status === 422, `legacy endpoint: ожидался 422, получен ${blockedLegacy.response.status}`);
assert(blockedLegacy.body.code === 'UNSAFE_INTENT', `legacy endpoint: получен ${blockedLegacy.body.code}`);

console.log(JSON.stringify({
  baseUrl,
  status: 'пройден',
  conversationalRefusal: true,
  actionCreated: false,
  walletUnchanged: true,
  legacyGate: blockedLegacy.body.code,
}, null, 2));