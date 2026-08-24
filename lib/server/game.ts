import type {
  ActionKind,
  CapacityKind,
  ActionStatus,
  EventState,
  GameAction,
  GameState,
  LedgerEntryState,
  RoutineState,
  RoutineStatus,
} from '@/lib/game-types';
import { getExtendedState, seedExtendedWorld } from '@/lib/server/profile';
import { routeSkills } from '@/lib/ai/skill-router';
import { createAiProvider } from '@/lib/ai/provider';
import { ensureSchema } from '@/lib/server/db';

const PLAYER_ID = 'demo-alex';

type ActionDefinition = {
  title: string;
  description: string;
  durationSeconds: number;
  costCents: number;
  energyCost: number;
  rewardFocus: number;
  rewardHealth: number;
  rewardMoneyCents: number;
  difficultyLabel: string;
  capacity: CapacityKind;
  baseProbabilityBp: number;
  riskLabel: string;
};

const ACTION_CATALOG: Record<ActionKind, ActionDefinition> = {
  training: {
    title: 'Силовая тренировка',
    description: 'Короткая тренировка с контролируемой нагрузкой.',
    durationSeconds: 180,
    costCents: 18_000_000,
    energyCost: 15,
    rewardFocus: 1,
    rewardHealth: 3,
    rewardMoneyCents: 0,
    riskLabel: 'Низкий',
    difficultyLabel: 'Обычная',
    capacity: 'foreground',
    baseProbabilityBp: 8600,
  },
  study: {
    title: 'Учебный спринт',
    description: 'Сфокусированная работа над одним учебным модулем.',
    durationSeconds: 240,
    costCents: 0,
    energyCost: 10,
    rewardFocus: 4,
    rewardHealth: 0,
    rewardMoneyCents: 0,
    riskLabel: 'Нет',
    difficultyLabel: 'Обычная',
    capacity: 'background',
    baseProbabilityBp: 9000,
  },
  work: {
    title: 'Рабочий контракт',
    description: 'Небольшая оплачиваемая задача для Nomad Labs.',
    durationSeconds: 300,
    costCents: 0,
    energyCost: 12,
    rewardFocus: 2,
    rewardHealth: 0,
    rewardMoneyCents: 75_000_000,
    riskLabel: 'Низкий',
    difficultyLabel: 'Обычная',
    capacity: 'foreground',
    baseProbabilityBp: 8200,
  },
  meditation: {
    title: 'Практика внимания',
    description: 'Дыхательная сессия для восстановления ясности.',
    durationSeconds: 120,
    costCents: 0,
    energyCost: 0,
    rewardFocus: 5,
    rewardHealth: 1,
    rewardMoneyCents: 0,
    riskLabel: 'Нет',
    difficultyLabel: 'Лёгкая',
    capacity: 'background',
    baseProbabilityBp: 9700,
  },
  travel: {
    title: 'Поездка по Ташкенту',
    description: 'Маршрут в новый район с расходами на дорогу.',
    durationSeconds: 300,
    costCents: 128_000_000,
    energyCost: 5,
    rewardFocus: 1,
    rewardHealth: 0,
    rewardMoneyCents: 0,
    riskLabel: 'Средний',
    difficultyLabel: 'Обычная',
    capacity: 'foreground',
    baseProbabilityBp: 9400,
  },
};

type PlayerRow = {
  id: string;
  name: string;
  city: string;
  role: string;
  energy: number;
  health: number;
  focus: number;
  reputation: number;
};

type WalletRow = { balance_cents: number; currency: 'UZS' };

type ActionRow = {
  id: string;
  kind: ActionKind;
  title: string;
  description: string;
  status: ActionStatus;
  duration_seconds: number;
  cost_cents: number;
  energy_cost: number;
  reward_focus: number;
  reward_health: number;
  reward_money_cents: number;
  risk_label: string;
  difficulty_label: string;
  capacity: CapacityKind;
  probability_bp: number;
  rng_seed: string;
  roll_bp: number | null;
  succeeded: number | null;
  target_location_id: string | null;
  created_at: string;
  confirmed_at: string | null;
  due_at: string | null;
  resolved_at: string | null;
  outcome: string | null;
};

type RoutineRow = {
  id: string;
  title: string;
  schedule_label: string;
  duration_minutes: number;
  streak: number;
  status: RoutineStatus;
  skip_next: number;
  created_at: string;
};

type LedgerRow = {
  id: string;
  title: string;
  amount_cents: number;
  kind: string;
  created_at: string;
};

type EventRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  created_at: string;
};

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

function uid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

async function ensurePlayer(): Promise<D1Database> {
  const db = await ensureSchema();
  const now = new Date().toISOString();

  await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO players
          (id, name, city, role, energy, health, focus, reputation, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(PLAYER_ID, 'Алекс', 'Ташкент', 'Продакт-менеджер', 82, 74, 61, 38, now),
    db
      .prepare(
        `INSERT OR IGNORE INTO wallets (player_id, balance_cents, currency)
         VALUES (?, ?, 'UZS')`,
      )
      .bind(PLAYER_ID, 2_468_000_000),
    db
      .prepare(
        `INSERT OR IGNORE INTO ledger_entries
          (id, player_id, title, amount_cents, kind, action_id, created_at)
         VALUES ('seed-opening', ?, 'Стартовый баланс', ?, 'opening', NULL, ?)`,
      )
      .bind(PLAYER_ID, 2_468_000_000, now),
    db
      .prepare(
        `INSERT OR IGNORE INTO routines
          (id, player_id, title, schedule_label, duration_minutes, streak, status, skip_next, created_at, updated_at)
         VALUES ('routine-morning', ?, 'Утренняя медитация', 'Каждый день · 07:00', 15, 12, 'active', 0, ?, ?)`,
      )
      .bind(PLAYER_ID, now, now),
    db
      .prepare(
        `INSERT OR IGNORE INTO routines
          (id, player_id, title, schedule_label, duration_minutes, streak, status, skip_next, created_at, updated_at)
         VALUES ('routine-gym', ?, 'Тренировка', 'Пн, Ср, Пт · 18:30', 60, 18, 'active', 0, ?, ?)`,
      )
      .bind(PLAYER_ID, now, now),
    db
      .prepare(
        `INSERT OR IGNORE INTO routines
          (id, player_id, title, schedule_label, duration_minutes, streak, status, skip_next, created_at, updated_at)
         VALUES ('routine-study', ?, 'Экономика', 'Вт, Чт · 19:00', 55, 7, 'active', 0, ?, ?)`,
      )
      .bind(PLAYER_ID, now, now),
    db
      .prepare(
        `INSERT OR IGNORE INTO domain_events
          (id, player_id, type, title, body, action_id, created_at)
         VALUES ('seed-welcome', ?, 'system', 'Мир запущен', 'Состояние хранится на сервере и переживает перезапуск.', NULL, ?)`,
      )
      .bind(PLAYER_ID, now),
  ]);

  await seedExtendedWorld(db, PLAYER_ID, now);
  return db;
}


function actionOutcome(action: ActionRow): string {
  switch (action.kind) {
    case 'training':
      return 'Тренировка завершена: выносливость подтверждена событием.';
    case 'study':
      return 'Учебный модуль завершён и добавлен в историю опыта.';
    case 'work':
      return 'Контракт принят заказчиком, оплата проведена через ledger.';
    case 'meditation':
      return 'Практика завершена: фокус восстановлен.';
    case 'travel':
      return 'Маршрут завершён, район отмечен как посещённый.';
  }
}

async function reconcileDueActions(db: D1Database): Promise<void> {
  const now = new Date().toISOString();
  const due = await db
    .prepare(
      `SELECT a.*, m.difficulty_label, m.capacity, m.probability_bp, m.rng_seed, m.roll_bp, m.succeeded, t.entity_id target_location_id
       FROM actions a JOIN action_mechanics m ON m.action_id = a.id
       LEFT JOIN action_targets t ON t.action_id = a.id AND t.entity_type = 'location'
       WHERE a.player_id = ? AND a.status = 'running' AND a.due_at <= ?
       ORDER BY due_at ASC LIMIT 20`,
    )
    .bind(PLAYER_ID, now)
    .all<ActionRow>();

  for (const action of due.results) {
    const token = uid('resolve');
    const rollBp = await seededRollBp(action.rng_seed);
    const succeeded = rollBp < action.probability_bp;
    const outcome = succeeded ? actionOutcome(action) : 'Попытка не удалась. Расходы и полученный опыт сохранены в истории.';
    const statements: D1PreparedStatement[] = [
      db
        .prepare(
          `UPDATE actions
           SET status = 'resolved', resolved_at = ?, outcome = ?, transition_token = ?
           WHERE id = ? AND player_id = ? AND status = 'running' AND due_at <= ?`,
        )
        .bind(now, outcome, token, action.id, PLAYER_ID, now),
      db
        .prepare(
          `UPDATE players
           SET focus = MIN(100, focus + ?), health = MIN(100, health + ?)
           WHERE id = ? AND EXISTS (
             SELECT 1 FROM actions WHERE id = ? AND transition_token = ?
           )`,
        )
        .bind(succeeded ? action.reward_focus : 0, succeeded ? action.reward_health : 0, PLAYER_ID, action.id, token),
      db
        .prepare(
          `INSERT INTO domain_events (id, player_id, type, title, body, action_id, created_at)
           SELECT ?, ?, 'action_resolved', ?, ?, ?, ?
           WHERE EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`,
        )
        .bind(uid('event'), PLAYER_ID, succeeded ? 'Действие удалось' : 'Действие не удалось', outcome, action.id, now, action.id, token),
    ];

    statements.push(
      db.prepare(`UPDATE action_mechanics
        SET roll_bp = ?, succeeded = ?, resolved_at = ?
        WHERE action_id = ? AND roll_bp IS NULL`)
        .bind(rollBp, succeeded ? 1 : 0, now, action.id),
      db.prepare(`INSERT OR IGNORE INTO experience_events
        (id, character_id, domain, title, outcome, complexity, occurred_at)
        VALUES (?, 'character-alex', ?, ?, ?, ?, ?)`)
        .bind(
          `experience-${action.id}`,
          action.kind,
          action.title,
          succeeded ? 'success' : 'failure',
          action.difficulty_label.toLowerCase(),
          now,
        ),
    );
    if (action.kind === 'travel' && action.target_location_id && succeeded) {
      statements.push(
        db.prepare(`UPDATE character_locations
          SET location_id = ?,
              visited_json = CASE
                WHEN EXISTS (SELECT 1 FROM json_each(visited_json) WHERE value = ?)
                THEN visited_json
                ELSE json_insert(visited_json, '$[#]', ?)
              END,
              updated_at = ?
          WHERE character_id = 'character-alex'
            AND EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`)
          .bind(action.target_location_id, action.target_location_id, action.target_location_id, now, action.id, token),
      );
    }
    if (action.reward_money_cents > 0 && succeeded) {
      statements.splice(
        2,
        0,
        db
          .prepare(
            `UPDATE wallets SET balance_cents = balance_cents + ?
             WHERE player_id = ? AND EXISTS (
               SELECT 1 FROM actions WHERE id = ? AND transition_token = ?
             )`,
          )
          .bind(action.reward_money_cents, PLAYER_ID, action.id, token),
        db
          .prepare(
            `INSERT OR IGNORE INTO ledger_entries
              (id, player_id, title, amount_cents, kind, action_id, created_at)
             SELECT ?, ?, ?, ?, 'reward', ?, ?
             WHERE EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`,
          )
          .bind(
            uid('ledger'),
            PLAYER_ID,
            `Доход: ${action.title}`,
            action.reward_money_cents,
            action.id,
            now,
            action.id,
            token,
          ),
      );
      statements.push(...journalStatements(db, 'reward', action.id, `Доход: ${action.title}`, action.reward_money_cents, now, token));
    }

    await db.batch(statements);
  }
}

function mapAction(row: ActionRow): GameAction {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    description: row.description,
    status: row.status,
    durationSeconds: row.duration_seconds,
    costCents: row.cost_cents,
    energyCost: row.energy_cost,
    rewardFocus: row.reward_focus,
    rewardHealth: row.reward_health,
    rewardMoneyCents: row.reward_money_cents,
    riskLabel: row.risk_label,
    difficultyLabel: row.difficulty_label,
    capacity: row.capacity,
    probabilityPercent: row.probability_bp / 100,
    rollPercent: row.roll_bp === null ? null : row.roll_bp / 100,
    succeeded: row.succeeded === null ? null : row.succeeded === 1,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at,
    dueAt: row.due_at,
    resolvedAt: row.resolved_at,
    outcome: row.outcome,
    targetLocationId: row.target_location_id,
  };
}

function mapRoutine(row: RoutineRow): RoutineState {
  return {
    id: row.id,
    title: row.title,
    scheduleLabel: row.schedule_label,
    durationMinutes: row.duration_minutes,
    streak: row.streak,
    status: row.status,
    skipNext: Boolean(row.skip_next),
    createdAt: row.created_at,
  };
}

function mapLedger(row: LedgerRow): LedgerEntryState {
  return {
    id: row.id,
    title: row.title,
    amountCents: row.amount_cents,
    kind: row.kind,
    createdAt: row.created_at,
  };
}

function mapEvent(row: EventRow): EventState {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function getGameState(): Promise<GameState> {
  const db = await ensurePlayer();
  await reconcileDueActions(db);

  const [player, wallet, actions, routines, ledger, events] = await Promise.all([
    db.prepare('SELECT * FROM players WHERE id = ?').bind(PLAYER_ID).first<PlayerRow>(),
    db.prepare('SELECT * FROM wallets WHERE player_id = ?').bind(PLAYER_ID).first<WalletRow>(),
    db
      .prepare("SELECT a.*, m.difficulty_label, m.capacity, m.probability_bp, m.rng_seed, m.roll_bp, m.succeeded, t.entity_id target_location_id FROM actions a JOIN action_mechanics m ON m.action_id = a.id LEFT JOIN action_targets t ON t.action_id = a.id AND t.entity_type = 'location' WHERE a.player_id = ? ORDER BY a.created_at DESC LIMIT 30")
      .bind(PLAYER_ID)
      .all<ActionRow>(),
    db
      .prepare("SELECT * FROM routines WHERE player_id = ? AND status != 'cancelled' ORDER BY created_at ASC")
      .bind(PLAYER_ID)
      .all<RoutineRow>(),
    db
      .prepare('SELECT * FROM ledger_entries WHERE player_id = ? ORDER BY created_at DESC LIMIT 20')
      .bind(PLAYER_ID)
      .all<LedgerRow>(),
    db
      .prepare('SELECT * FROM domain_events WHERE player_id = ? ORDER BY created_at DESC LIMIT 30')
      .bind(PLAYER_ID)
      .all<EventRow>(),
  ]);
  const extended = await getExtendedState(db, PLAYER_ID);

  if (!player || !wallet) {
    throw new DomainError('Не удалось загрузить состояние игрока', 'STATE_NOT_FOUND', 500);
  }

  return {
    player,
    ...extended,
    wallet: { balanceCents: wallet.balance_cents, currency: wallet.currency },
    actions: actions.results.map(mapAction),
    routines: routines.results.map(mapRoutine),
    ledger: ledger.results.map(mapLedger),
    events: events.results.map(mapEvent),
    serverTime: new Date().toISOString(),
  };
}

export async function proposeAction(input: {
  intent?: unknown;
  kind?: unknown;
  targetLocationId?: unknown;
}): Promise<GameState> {
  const db = await ensurePlayer();
  await reconcileDueActions(db);

  const intent = typeof input.intent === 'string' ? input.intent.trim() : '';
  if (intent.length > 280) {
    throw new DomainError('Сформулируйте намерение короче 280 символов', 'INTENT_TOO_LONG');
  }

  const explicitKind = typeof input.kind === 'string' && input.kind in ACTION_CATALOG
    ? (input.kind as ActionKind)
    : null;
  let interpreted = null;
  let providerName = 'deterministic-server-catalog';
  if (!explicitKind && intent) {
    const aiProvider = createAiProvider();
    providerName = aiProvider.name;
    try {
      interpreted = await aiProvider.interpretIntent(intent);
    } catch (reason) {
      const failure = reason as { status?: unknown; code?: unknown };
      console.error('AI provider request failed', {
        provider: aiProvider.name,
        errorType: reason instanceof Error ? reason.name : 'unknown',
        status: typeof failure.status === 'number' ? failure.status : null,
        code: typeof failure.code === 'number' || typeof failure.code === 'string' ? failure.code : null,
      });
      throw new DomainError('Хост временно не получил ответ от ИИ. Попробуйте ещё раз.', 'AI_PROVIDER_UNAVAILABLE', 502);
    }
  }
  const kind = explicitKind ?? interpreted?.kind ?? null;
  if (!kind) {
    throw new DomainError(
      'Не понял намерение. Упомяните тренировку, учёбу, работу, медитацию или поездку.',
      'INTENT_NOT_UNDERSTOOD',
    );
  }

  const requestedTargetId = typeof input.targetLocationId === 'string' ? input.targetLocationId.trim() : '';
  const targetLocation = requestedTargetId && kind === 'travel'
    ? await db.prepare(`SELECT id, name, note, risk_label, travel_cost_cents, travel_minutes
        FROM locations WHERE id = ? AND kind IN ('district', 'region')`)
      .bind(requestedTargetId)
      .first<{
        id: string;
        name: string;
        note: string;
        risk_label: string;
        travel_cost_cents: number;
        travel_minutes: number;
      }>()
    : null;
  if (requestedTargetId && !targetLocation) {
    throw new DomainError('Маршрут не найден или недоступен для поездки', 'INVALID_TRAVEL_TARGET', 404);
  }
  const definition: ActionDefinition = targetLocation ? {
    ...ACTION_CATALOG.travel,
    title: `Поездка: ${targetLocation.name}`,
    description: targetLocation.note,
    durationSeconds: Math.max(60, targetLocation.travel_minutes * 60),
    costCents: targetLocation.travel_cost_cents,
    riskLabel: targetLocation.risk_label,
  } : ACTION_CATALOG[kind];
  const now = new Date().toISOString();
  const actionId = uid('action');
  const description = intent || (targetLocation ? `Поехать в ${targetLocation.name}. ${targetLocation.note}` : definition.description);
  const [playerState, characterState] = await Promise.all([
    db.prepare('SELECT focus, health FROM players WHERE id = ?').bind(PLAYER_ID).first<{ focus: number; health: number }>(),
    db.prepare('SELECT fatigue FROM characters WHERE player_id = ?').bind(PLAYER_ID).first<{ fatigue: number }>(),
  ]);
  if (!playerState || !characterState) {
    throw new DomainError('Состояние персонажа не найдено', 'STATE_NOT_FOUND', 500);
  }
  const probabilityBp = calculateProbability(definition, playerState.focus, playerState.health, characterState.fatigue);
  const rngSeed = crypto.randomUUID();
  const routedSkills = routeSkills(kind).map((skill) => `${skill.key}@${skill.version}`);

  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT INTO actions
          (id, player_id, kind, title, description, status, duration_seconds, cost_cents,
           energy_cost, reward_focus, reward_health, reward_money_cents, risk_label,
           created_at, confirmed_at, due_at, resolved_at, outcome, transition_token, idempotency_key)
         VALUES (?, ?, ?, ?, ?, 'awaiting_confirmation', ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?)`,
      )
      .bind(
        actionId,
        PLAYER_ID,
        kind,
        definition.title,
        description,
        definition.durationSeconds,
        definition.costCents,
        definition.energyCost,
        definition.rewardFocus,
        definition.rewardHealth,
        definition.rewardMoneyCents,
        definition.riskLabel,
        now,
        uid('proposal'),
      ),
    db.prepare(`INSERT INTO action_mechanics
      (action_id, difficulty_label, capacity, probability_bp, rng_seed, roll_bp, succeeded, resolved_at)
      VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL)`)
      .bind(actionId, definition.difficultyLabel, definition.capacity, probabilityBp, rngSeed),
    db.prepare(`INSERT INTO agent_runs
      (id, player_id, role, prompt_version, provider, skill_keys, status, created_at)
      VALUES (?, ?, 'referee', 'referee.v1', ?, ?, 'validated', ?)`)
      .bind(uid('agent'), PLAYER_ID, providerName, JSON.stringify(routedSkills), now),
    db.prepare(`INSERT INTO chat_messages
      (id, player_id, role, source, body, created_at) VALUES (?, ?, 'player', 'WEB', ?, ?)`)
      .bind(uid('chat'), PLAYER_ID, description, now),
    db.prepare(`INSERT INTO chat_messages
      (id, player_id, role, source, body, created_at) VALUES (?, ?, 'host', 'WEB', ?, ?)`)
      .bind(uid('chat'), PLAYER_ID,
        `Я собрал карточку «${definition.title}». Оценка успеха ${(probabilityBp / 100).toFixed(0)}%; запуск — только после твоего подтверждения.`, now),
    db
      .prepare(
        `INSERT INTO domain_events (id, player_id, type, title, body, action_id, created_at)
         VALUES (?, ?, 'action_proposed', 'Хост подготовил предложение', ?, ?, ?)`,
      )
      .bind(uid('event'), PLAYER_ID, `${definition.title}: требуется подтверждение.`, actionId, now),
  ];
  if (targetLocation) {
    statements.push(
      db.prepare(`INSERT INTO action_targets
        (action_id, entity_type, entity_id, created_at)
        VALUES (?, 'location', ?, ?)`)
        .bind(actionId, targetLocation.id, now),
    );
  }
  await db.batch(statements);

  return getGameState();
}

export async function confirmAction(actionId: string): Promise<GameState> {
  const db = await ensurePlayer();
  await reconcileDueActions(db);
  const action = await db
    .prepare("SELECT a.*, m.difficulty_label, m.capacity, m.probability_bp, m.rng_seed, m.roll_bp, m.succeeded, t.entity_id target_location_id FROM actions a JOIN action_mechanics m ON m.action_id = a.id LEFT JOIN action_targets t ON t.action_id = a.id AND t.entity_type = 'location' WHERE a.id = ? AND a.player_id = ?")
    .bind(actionId, PLAYER_ID)
    .first<ActionRow>();

  if (!action) throw new DomainError('Предложение не найдено', 'ACTION_NOT_FOUND', 404);
  if (action.status === 'running' || action.status === 'resolved') return getGameState();
  if (action.status !== 'awaiting_confirmation') {
    throw new DomainError('Это предложение уже нельзя подтвердить', 'ACTION_NOT_CONFIRMABLE', 409);
  }

  const player = await db.prepare('SELECT energy FROM players WHERE id = ?').bind(PLAYER_ID).first<{ energy: number }>();
  const wallet = await db
    .prepare('SELECT balance_cents FROM wallets WHERE player_id = ?')
    .bind(PLAYER_ID)
    .first<{ balance_cents: number }>();
  if (!player || !wallet) throw new DomainError('Ресурсы игрока не найдены', 'STATE_NOT_FOUND', 500);

  if (action.capacity === 'foreground') {
    const occupied = await db.prepare(
      `SELECT a.title FROM actions a JOIN action_mechanics m ON m.action_id = a.id
       WHERE a.player_id = ? AND a.status = 'running' AND m.capacity = 'foreground' AND a.id != ? LIMIT 1`,
    ).bind(PLAYER_ID, actionId).first<{ title: string }>();
    if (occupied) {
      throw new DomainError(
        `Персонаж уже занят: ${occupied.title}. Планировать можно, запускать второе физическое действие — нет.`,
        'FOREGROUND_CAPACITY_OCCUPIED', 409,
      );
    }
  }
  if (player.energy < action.energy_cost) {
    throw new DomainError('Недостаточно энергии для этого действия', 'NOT_ENOUGH_ENERGY', 409);
  }
  if (wallet.balance_cents < action.cost_cents) {
    throw new DomainError('Недостаточно денег для этого действия', 'NOT_ENOUGH_MONEY', 409);
  }

  const now = new Date().toISOString();
  const dueAt = new Date(Date.now() + action.duration_seconds * 1000).toISOString();
  const token = uid('confirm');
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `UPDATE actions
         SET status = 'running', confirmed_at = ?, due_at = ?, transition_token = ?
         WHERE id = ? AND player_id = ? AND status = 'awaiting_confirmation'
           AND EXISTS (SELECT 1 FROM wallets WHERE wallets.player_id = ? AND balance_cents >= ?)
           AND EXISTS (SELECT 1 FROM players WHERE players.id = ? AND energy >= ?)`,
      )
      .bind(now, dueAt, token, actionId, PLAYER_ID, PLAYER_ID, action.cost_cents, PLAYER_ID, action.energy_cost),
    db
      .prepare(
        `UPDATE wallets SET balance_cents = balance_cents - ?
         WHERE player_id = ? AND EXISTS (
           SELECT 1 FROM actions WHERE id = ? AND transition_token = ?
         )`,
      )
      .bind(action.cost_cents, PLAYER_ID, actionId, token),
    db
      .prepare(
        `UPDATE players SET energy = MAX(0, energy - ?)
         WHERE id = ? AND EXISTS (
           SELECT 1 FROM actions WHERE id = ? AND transition_token = ?
         )`,
      )
      .bind(action.energy_cost, PLAYER_ID, actionId, token),
    db
      .prepare(
        `INSERT INTO domain_events (id, player_id, type, title, body, action_id, created_at)
         SELECT ?, ?, 'action_started', 'Действие запущено', ?, ?, ?
         WHERE EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`,
      )
      .bind(uid('event'), PLAYER_ID, `${action.title} · завершение будет рассчитано сервером.`, actionId, now, actionId, token),
  ];

  if (action.cost_cents > 0) {
    statements.splice(
      3,
      0,
      db
        .prepare(
          `INSERT OR IGNORE INTO ledger_entries
            (id, player_id, title, amount_cents, kind, action_id, created_at)
           SELECT ?, ?, ?, ?, 'expense', ?, ?
           WHERE EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`,
        )
        .bind(uid('ledger'), PLAYER_ID, `Расход: ${action.title}`, -action.cost_cents, actionId, now, actionId, token),
    );
    statements.push(...journalStatements(db, 'expense', actionId, `Расход: ${action.title}`, action.cost_cents, now, token));
  }

  await db.batch(statements);
  const transitioned = await db
    .prepare('SELECT status, transition_token FROM actions WHERE id = ? AND player_id = ?')
    .bind(actionId, PLAYER_ID)
    .first<{ status: ActionStatus; transition_token: string | null }>();
  if (transitioned?.status === 'awaiting_confirmation') {
    throw new DomainError('Ресурсы изменились. Обновите предложение и повторите.', 'RESOURCES_CHANGED', 409);
  }
  return getGameState();
}

export async function cancelProposal(actionId: string): Promise<GameState> {
  const db = await ensurePlayer();
  const token = uid('cancel');
  const now = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        `UPDATE actions SET status = 'cancelled', transition_token = ?
         WHERE id = ? AND player_id = ? AND status = 'awaiting_confirmation'`,
      )
      .bind(token, actionId, PLAYER_ID),
    db
      .prepare(
        `INSERT INTO domain_events (id, player_id, type, title, body, action_id, created_at)
         SELECT ?, ?, 'action_cancelled', 'Предложение отклонено', 'Состояние и баланс не изменены.', ?, ?
         WHERE EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`,
      )
      .bind(uid('event'), PLAYER_ID, actionId, now, actionId, token),
  ]);
  return getGameState();
}

export async function createRoutine(input: {
  title?: unknown;
  scheduleLabel?: unknown;
  durationMinutes?: unknown;
}): Promise<GameState> {
  const db = await ensurePlayer();
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const schedule = typeof input.scheduleLabel === 'string' ? input.scheduleLabel.trim() : '';
  const duration = Number(input.durationMinutes);
  if (title.length < 2 || title.length > 60) {
    throw new DomainError('Название ритуала должно быть от 2 до 60 символов', 'INVALID_ROUTINE_TITLE');
  }
  if (schedule.length < 3 || schedule.length > 80) {
    throw new DomainError('Укажите понятное расписание', 'INVALID_ROUTINE_SCHEDULE');
  }
  if (!Number.isInteger(duration) || duration < 5 || duration > 180) {
    throw new DomainError('Длительность должна быть от 5 до 180 минут', 'INVALID_ROUTINE_DURATION');
  }
  const now = new Date().toISOString();
  const id = uid('routine');
  await db.batch([
    db
      .prepare(
        `INSERT INTO routines
          (id, player_id, title, schedule_label, duration_minutes, streak, status, skip_next, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, 'active', 0, ?, ?)`,
      )
      .bind(id, PLAYER_ID, title, schedule, duration, now, now),
    db
      .prepare(
        `INSERT INTO domain_events (id, player_id, type, title, body, action_id, created_at)
         VALUES (?, ?, 'routine_created', 'Создан новый ритуал', ?, NULL, ?)`,
      )
      .bind(uid('event'), PLAYER_ID, `${title} · ${schedule}`, now),
  ]);
  return getGameState();
}

export async function mutateRoutine(
  routineId: string,
  mutation: unknown,
): Promise<GameState> {
  const db = await ensurePlayer();
  if (!['skip', 'pause', 'resume', 'cancel'].includes(String(mutation))) {
    throw new DomainError('Неизвестная команда ритуала', 'INVALID_ROUTINE_MUTATION');
  }
  const command = String(mutation);
  const now = new Date().toISOString();
  const values: Record<string, { sql: string; body: string }> = {
    skip: { sql: 'skip_next = 1', body: 'Следующее выполнение пропущено.' },
    pause: { sql: "status = 'paused'", body: 'Ритуал поставлен на паузу.' },
    resume: { sql: "status = 'active', skip_next = 0", body: 'Ритуал снова активен.' },
    cancel: { sql: "status = 'cancelled'", body: 'Ритуал отменён.' },
  };
  const selected = values[command];
  const existing = await db
    .prepare("SELECT title FROM routines WHERE id = ? AND player_id = ? AND status != 'cancelled'")
    .bind(routineId, PLAYER_ID)
    .first<{ title: string }>();
  if (!existing) throw new DomainError('Ритуал не найден', 'ROUTINE_NOT_FOUND', 404);

  await db.batch([
    db
      .prepare(`UPDATE routines SET ${selected.sql}, updated_at = ? WHERE id = ? AND player_id = ?`)
      .bind(now, routineId, PLAYER_ID),
    db
      .prepare(
        `INSERT INTO domain_events (id, player_id, type, title, body, action_id, created_at)
         VALUES (?, ?, 'routine_changed', ?, ?, NULL, ?)`,
      )
      .bind(uid('event'), PLAYER_ID, existing.title, selected.body, now),
  ]);
  return getGameState();
}

function calculateProbability(definition: ActionDefinition, focus: number, health: number, fatigue: number): number {
  const stateModifier = (focus - 50) * 8 + (health - 50) * 4 - fatigue * 5;
  return Math.max(500, Math.min(9900, definition.baseProbabilityBp + stateModifier));
}

// Доменные playbook выбирает versioned Skill Router.
function journalStatements(
  db: D1Database,
  referenceType: 'expense' | 'reward',
  actionId: string,
  title: string,
  amountCents: number,
  now: string,
  transitionToken: string,
): D1PreparedStatement[] {
  const journalId = `journal-${referenceType}-${actionId}`;
  const debitAccount = referenceType === 'expense' ? 'account-world-services' : 'account-alex-cash';
  const creditAccount = referenceType === 'expense' ? 'account-alex-cash' : 'account-world-rewards';
  return [
    db.prepare(`INSERT OR IGNORE INTO journal_entries
      (id, reference_type, reference_id, title, created_at)
      SELECT ?, ?, ?, ?, ? WHERE EXISTS
      (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`)
      .bind(journalId, referenceType, actionId, title, now, actionId, transitionToken),
    db.prepare(`INSERT OR IGNORE INTO journal_postings
      (id, journal_entry_id, account_id, side, amount_cents, created_at)
      VALUES (?, ?, ?, 'debit', ?, ?)`)
      .bind(`posting-${referenceType}-debit-${actionId}`, journalId, debitAccount, amountCents, now),
    db.prepare(`INSERT OR IGNORE INTO journal_postings
      (id, journal_entry_id, account_id, side, amount_cents, created_at)
      VALUES (?, ?, ?, 'credit', ?, ?)`)
      .bind(`posting-${referenceType}-credit-${actionId}`, journalId, creditAccount, amountCents, now),
  ];
}

async function seededRollBp(seed: string): Promise<number> {
  const bytes = new TextEncoder().encode(seed);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const number = new DataView(digest).getUint32(0, false);
  return number % 10_000;
}
