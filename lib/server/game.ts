import type {
  ActionKind,
  ActionStatus,
  EventState,
  GameAction,
  GameState,
  LedgerEntryState,
  RoutineState,
  RoutineStatus,
} from '@/lib/game-types';
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

  return db;
}

function detectKind(intent: string): ActionKind | null {
  const normalized = intent.toLocaleLowerCase('ru-RU');
  const rules: Array<[ActionKind, string[]]> = [
    ['training', ['трен', 'зал', 'спорт', 'силов', 'gym']],
    ['study', ['уч', 'курс', 'книг', 'эконом', 'study']],
    ['work', ['работ', 'контракт', 'проект', 'задач', 'work']],
    ['meditation', ['медит', 'дых', 'отдох', 'вниман']],
    ['travel', ['поезд', 'съезд', 'маршрут', 'район', 'travel']],
  ];
  return rules.find(([, words]) => words.some((word) => normalized.includes(word)))?.[0] ?? null;
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
      `SELECT * FROM actions
       WHERE player_id = ? AND status = 'running' AND due_at <= ?
       ORDER BY due_at ASC LIMIT 20`,
    )
    .bind(PLAYER_ID, now)
    .all<ActionRow>();

  for (const action of due.results) {
    const token = uid('resolve');
    const outcome = actionOutcome(action);
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
        .bind(action.reward_focus, action.reward_health, PLAYER_ID, action.id, token),
      db
        .prepare(
          `INSERT INTO domain_events (id, player_id, type, title, body, action_id, created_at)
           SELECT ?, ?, 'action_resolved', ?, ?, ?, ?
           WHERE EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`,
        )
        .bind(uid('event'), PLAYER_ID, 'Действие завершено', outcome, action.id, now, action.id, token),
    ];

    if (action.reward_money_cents > 0) {
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
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at,
    dueAt: row.due_at,
    resolvedAt: row.resolved_at,
    outcome: row.outcome,
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
      .prepare('SELECT * FROM actions WHERE player_id = ? ORDER BY created_at DESC LIMIT 30')
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

  if (!player || !wallet) {
    throw new DomainError('Не удалось загрузить состояние игрока', 'STATE_NOT_FOUND', 500);
  }

  return {
    player,
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
  const kind = explicitKind ?? detectKind(intent);
  if (!kind) {
    throw new DomainError(
      'Не понял намерение. Упомяните тренировку, учёбу, работу, медитацию или поездку.',
      'INTENT_NOT_UNDERSTOOD',
    );
  }

  const definition = ACTION_CATALOG[kind];
  const now = new Date().toISOString();
  const actionId = uid('action');
  const description = intent || definition.description;

  await db.batch([
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
    db
      .prepare(
        `INSERT INTO domain_events (id, player_id, type, title, body, action_id, created_at)
         VALUES (?, ?, 'action_proposed', 'Хост подготовил предложение', ?, ?, ?)`,
      )
      .bind(uid('event'), PLAYER_ID, `${definition.title}: требуется подтверждение.`, actionId, now),
  ]);

  return getGameState();
}

export async function confirmAction(actionId: string): Promise<GameState> {
  const db = await ensurePlayer();
  await reconcileDueActions(db);
  const action = await db
    .prepare('SELECT * FROM actions WHERE id = ? AND player_id = ?')
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
