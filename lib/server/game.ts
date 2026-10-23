import type {
  ActionKind,
  ActionStatus,
  CapacityKind,
  EventState,
  GameAction,
  GameState,
  LedgerEntryState,
  RoutineState,
  RoutineStatus,
} from '@/lib/game-types';
import type { HostIntentDraft } from '@/lib/ai/provider';
import { createAiProvider, createFallbackProvider } from '@/lib/ai/provider';
import { routeSkillsForMessage, serializePlaybooks } from '@/lib/ai/skill-router';
import { CHARACTER_ID, getExtendedState, seedExtendedWorld } from '@/lib/server/profile';
import { evaluateIntentSafety } from '@/lib/server/safety';
import { ensureSchema } from '@/lib/server/db';

const PLAYER_ID = 'demo-alex';

type EffectDefinition = {
  energy: number;
  health: number;
  strength: number;
  intelligence: number;
  morale: number;
  confidence: number;
  fatigue: number;
  skillName: string | null;
  skillDomain: string | null;
  summary: string;
};

type ActionDefinition = {
  title: string;
  description: string;
  durationSeconds: number;
  costCents: number;
  energyCost: number;
  rewardMoneyCents: number;
  difficultyLabel: string;
  capacity: CapacityKind;
  baseProbabilityBp: number;
  riskLabel: string;
  resolutionMode: 'progress' | 'chance' | 'deterministic';
  effects: EffectDefinition;
};

const EMPTY_EFFECTS: EffectDefinition = { energy: 0, health: 0, strength: 0, intelligence: 0, morale: 0, confidence: 0, fatigue: 0, skillName: null, skillDomain: null, summary: 'Состояние не изменится.' };

const ACTION_CATALOG: Record<ActionKind, ActionDefinition> = {
  training: {
    title: 'Силовая тренировка', description: 'Полноценная тренировка с разминкой, основной нагрузкой и восстановлением.',
    durationSeconds: 45 * 60, costCents: 1800, energyCost: 12, rewardMoneyCents: 0,
    difficultyLabel: 'Обычная', capacity: 'foreground', baseProbabilityBp: 8600, riskLabel: 'Низкий', resolutionMode: 'progress',
    effects: { energy: 0, health: 1, strength: 1, intelligence: 0, morale: 1, confidence: 1, fatigue: 12, skillName: 'Физическая подготовка', skillDomain: 'Здоровье', summary: 'Сила +1, здоровье +1, уверенность +1; усталость +12.' },
  },
  study: {
    title: 'Учебная сессия', description: 'Сфокусированная работа над одной темой с фиксацией практического evidence.',
    durationSeconds: 50 * 60, costCents: 0, energyCost: 8, rewardMoneyCents: 0,
    difficultyLabel: 'Обычная', capacity: 'background', baseProbabilityBp: 9000, riskLabel: 'Нет', resolutionMode: 'progress',
    effects: { energy: 0, health: 0, strength: 0, intelligence: 1, morale: 1, confidence: 0, fatigue: 7, skillName: 'Самостоятельное обучение', skillDomain: 'Образование', summary: 'Интеллект +1, мораль +1; усталость +7 и новое доказательство навыка.' },
  },
  work: {
    title: 'Рабочая задача', description: 'Ограниченная по объёму оплачиваемая задача с проверяемым результатом.',
    durationSeconds: 60 * 60, costCents: 0, energyCost: 10, rewardMoneyCents: 7500,
    difficultyLabel: 'Обычная', capacity: 'foreground', baseProbabilityBp: 8200, riskLabel: 'Низкий', resolutionMode: 'chance',
    effects: { energy: 0, health: 0, strength: 0, intelligence: 0, morale: 1, confidence: 1, fatigue: 10, skillName: 'Рабочая дисциплина', skillDomain: 'Карьера', summary: 'При принятом результате: $75; уверенность +1, опыт работы; усталость +10.' },
  },
  meditation: {
    title: 'Практика восстановления', description: 'Короткая практика дыхания и внимания без соревнования с самим собой.',
    durationSeconds: 15 * 60, costCents: 0, energyCost: 0, rewardMoneyCents: 0,
    difficultyLabel: 'Лёгкая', capacity: 'background', baseProbabilityBp: 9800, riskLabel: 'Нет', resolutionMode: 'progress',
    effects: { energy: 6, health: 0, strength: 0, intelligence: 0, morale: 4, confidence: 1, fatigue: -8, skillName: 'Саморегуляция', skillDomain: 'Психология', summary: 'Энергия +6, мораль +4, уверенность +1, усталость −8.' },
  },
  travel: {
    title: 'Поездка', description: 'Перемещение в известное место с учётом времени и стоимости маршрута.',
    durationSeconds: 25 * 60, costCents: 600, energyCost: 3, rewardMoneyCents: 0,
    difficultyLabel: 'Обычная', capacity: 'foreground', baseProbabilityBp: 9600, riskLabel: 'Низкий', resolutionMode: 'deterministic',
    effects: { ...EMPTY_EFFECTS, fatigue: 3, summary: 'Местоположение изменится после завершения; усталость +3.' },
  },
  schedule: {
    title: 'Изменение плана', description: 'Хост добавит договорённость в план дня и сохранит условие запуска.',
    durationSeconds: 0, costCents: 0, energyCost: 0, rewardMoneyCents: 0,
    difficultyLabel: 'Без проверки', capacity: 'passive', baseProbabilityBp: 10000, riskLabel: 'Нет', resolutionMode: 'deterministic', effects: EMPTY_EFFECTS,
  },
  organization: {
    title: 'Создание организации', description: 'Административно упрощённый запуск новой организации. Успех её деятельности не гарантирован.',
    durationSeconds: 2 * 60 * 60, costCents: 50000, energyCost: 8, rewardMoneyCents: 0,
    difficultyLabel: 'Сложная', capacity: 'background', baseProbabilityBp: 7600, riskLabel: 'Средний', resolutionMode: 'progress',
    effects: { energy: 0, health: 0, strength: 0, intelligence: 0, morale: 1, confidence: 2, fatigue: 8, skillName: 'Предпринимательство', skillDomain: 'Бизнес', summary: 'Появится организация с отдельной казной и правами; уверенность +2, предпринимательское evidence.' },
  },
  challenge: {
    title: 'Вызов на поединок', description: 'Предложение другому участнику. Ничего не начнётся без его отдельного согласия.',
    durationSeconds: 0, costCents: 0, energyCost: 0, rewardMoneyCents: 0,
    difficultyLabel: 'Высокий риск', capacity: 'passive', baseProbabilityBp: 5000, riskLabel: 'Высокий', resolutionMode: 'deterministic', effects: EMPTY_EFFECTS,
  },
  generic: {
    title: 'Новое действие', description: 'Действие, сформулированное в разговоре и сведённое к универсальным ресурсам и последствиям.',
    durationSeconds: 30 * 60, costCents: 0, energyCost: 6, rewardMoneyCents: 0,
    difficultyLabel: 'Обычная', capacity: 'foreground', baseProbabilityBp: 7200, riskLabel: 'Средний', resolutionMode: 'chance',
    effects: { energy: 0, health: 0, strength: 0, intelligence: 0, morale: 1, confidence: 1, fatigue: 6, skillName: 'Практический опыт', skillDomain: 'Развитие', summary: 'Мораль +1, уверенность +1 и новое evidence; усталость +6.' },
  },
};

type PlayerRow = { id: string; name: string; city: string; role: string; energy: number; health: number; focus: number; reputation: number };
type WalletRow = { balance_cents: number; currency: string; reserved_cents: number };
type ActionRow = {
  id: string; player_id: string; kind: ActionKind; title: string; description: string; status: ActionStatus;
  duration_seconds: number; cost_cents: number; energy_cost: number; reward_focus: number; reward_health: number; reward_money_cents: number;
  risk_label: string; difficulty_label: string; capacity: CapacityKind; probability_bp: number; rng_seed: string; roll_bp: number | null; succeeded: number | null;
  target_location_id: string | null; created_at: string; confirmed_at: string | null; due_at: string | null; resolved_at: string | null; outcome: string | null;
  resolution_mode: 'progress' | 'chance' | 'deterministic'; energy_delta: number; health_delta: number; strength_delta: number; intelligence_delta: number;
  morale_delta: number; confidence_delta: number; fatigue_delta: number; skill_name: string | null; skill_domain: string | null; effect_summary: string; payload_json: string | null;
};
type RoutineRow = { id: string; title: string; schedule_label: string; duration_minutes: number; streak: number; status: RoutineStatus; skip_next: number; created_at: string };
type LedgerRow = { id: string; title: string; amount_cents: number; kind: string; created_at: string };
type EventRow = { id: string; type: string; title: string; body: string; created_at: string };

export class DomainError extends Error {
  constructor(message: string, public readonly code: string, public readonly status = 400) { super(message); }
}

function uid(prefix: string): string { return `${prefix}_${crypto.randomUUID()}`; }
function formatUsd(cents: number): string { return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'USD', maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100); }

async function ensurePlayer(): Promise<D1Database> {
  const db = await ensureSchema();
  const now = new Date().toISOString();
  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO players (id, name, city, role, energy, health, focus, reputation, created_at) VALUES (?, 'Алекс', 'Ташкент', 'Продакт-менеджер', 82, 74, 0, 38, ?)`).bind(PLAYER_ID, now),
    db.prepare(`INSERT OR IGNORE INTO wallets (player_id, balance_cents, currency) VALUES (?, 2468000, 'USD')`).bind(PLAYER_ID),
    db.prepare(`INSERT OR IGNORE INTO ledger_entries (id, player_id, title, amount_cents, kind, action_id, created_at) VALUES ('seed-opening', ?, 'Стартовый баланс', 2468000, 'opening', NULL, ?)`).bind(PLAYER_ID, now),
    db.prepare(`INSERT OR IGNORE INTO domain_events (id, player_id, type, title, body, action_id, created_at) VALUES ('seed-welcome', ?, 'system', 'Мир запущен', 'Каноническое состояние хранится на сервере.', NULL, ?)`).bind(PLAYER_ID, now),
  ]);
  await seedExtendedWorld(db, PLAYER_ID, now);
  await migrateLegacyData(db, now);
  return db;
}

async function migrateLegacyData(db: D1Database, now: string): Promise<void> {
  const migrated = await db.prepare(`SELECT value FROM app_meta WHERE key = 'economy-usd-v1'`).first<{ value: string }>();
  if (!migrated) {
    const wallet = await db.prepare('SELECT currency FROM wallets WHERE player_id = ?').bind(PLAYER_ID).first<{ currency: string }>();
    const statements: D1PreparedStatement[] = [];
    if (wallet?.currency === 'UZS') {
      statements.push(
        db.prepare('UPDATE wallets SET balance_cents = CAST(ROUND(balance_cents / 1000.0) AS INTEGER), currency = \'USD\''),
        db.prepare('UPDATE ledger_entries SET amount_cents = CAST(ROUND(amount_cents / 1000.0) AS INTEGER)'),
        db.prepare('UPDATE ledger_accounts SET currency = \'USD\''),
        db.prepare('UPDATE journal_postings SET amount_cents = CAST(ROUND(amount_cents / 1000.0) AS INTEGER)'),
        db.prepare('UPDATE assets SET estimated_value_cents = CAST(ROUND(estimated_value_cents / 1000.0) AS INTEGER), liquidation_value_cents = CAST(ROUND(liquidation_value_cents / 1000.0) AS INTEGER)'),
        db.prepare('UPDATE organizations SET cash_cents = CAST(ROUND(cash_cents / 1000.0) AS INTEGER), monthly_revenue_cents = CAST(ROUND(monthly_revenue_cents / 1000.0) AS INTEGER), monthly_profit_cents = CAST(ROUND(monthly_profit_cents / 1000.0) AS INTEGER)'),
        db.prepare('UPDATE contracts SET monthly_amount_cents = CAST(ROUND(monthly_amount_cents / 1000.0) AS INTEGER), daily_amount_cents = CAST(ROUND(daily_amount_cents / 1000.0) AS INTEGER)'),
        db.prepare('UPDATE locations SET travel_cost_cents = CAST(ROUND(travel_cost_cents / 1000.0) AS INTEGER)'),
        db.prepare('UPDATE actions SET cost_cents = CAST(ROUND(cost_cents / 1000.0) AS INTEGER), reward_money_cents = CAST(ROUND(reward_money_cents / 1000.0) AS INTEGER)')
      );
    }
    statements.push(
      db.prepare("UPDATE locations SET travel_cost_cents = CASE id WHEN 'place-gym' THEN 1800 WHEN 'district-center' THEN 400 WHEN 'district-old' THEN 600 WHEN 'district-sergeli' THEN 800 WHEN 'district-chimgan' THEN 1500 ELSE travel_cost_cents END"),
      db.prepare("UPDATE actions SET cost_cents = 1800 WHERE kind = 'training' AND status = 'awaiting_confirmation'"),
      db.prepare("UPDATE wallets SET currency = 'USD'"),
      db.prepare(`INSERT INTO app_meta (key, value, updated_at) VALUES ('economy-usd-v1', 'done', ?)`).bind(now)
    );
    await db.batch(statements);
  }
  const cleaned = await db.prepare(`SELECT value FROM app_meta WHERE key = 'remove-nomad-seed-v1'`).first<{ value: string }>();
  if (!cleaned) {
    await db.batch([
      db.prepare("DELETE FROM contracts WHERE id = 'employment-nomad'"),
      db.prepare("DELETE FROM ownership_stakes WHERE id = 'stake-alex-nomad'"),
      db.prepare("DELETE FROM organization_memberships WHERE id = 'member-alex-nomad'"),
      db.prepare("DELETE FROM assets WHERE id = 'asset-equity'"),
      db.prepare("DELETE FROM story_threads WHERE id = 'thread-studio'"),
      db.prepare("DELETE FROM organizations WHERE id = 'org-nomad'"),
      db.prepare(`INSERT INTO app_meta (key, value, updated_at) VALUES ('remove-nomad-seed-v1', 'done', ?)`).bind(now),
    ]);
  }
  const cleanedCopy = await db.prepare(`SELECT value FROM app_meta WHERE key = 'legacy-copy-cleanup-v2'`).first<{ value: string }>();
  if (!cleanedCopy) {
    await db.batch([
      db.prepare("UPDATE characters SET biography = 'Начал путь в Ташкенте и самостоятельно выбирает дальнейшее направление.' WHERE id = ? AND biography LIKE '%построить что-то своё%'").bind(CHARACTER_ID),
      db.prepare("DELETE FROM goals WHERE id = 'goal-studio'"),
      db.prepare("UPDATE credentials SET issuer = 'Городская академия' WHERE id = 'credential-product' AND issuer = 'Nomad Academy'"),
      db.prepare("UPDATE locations SET name = 'Дом', note = 'Восстановиться и спокойно разобрать планы.' WHERE id = 'place-home'"),
      db.prepare("UPDATE locations SET name = 'Деловой центр', note = 'Работа, команды, встречи и проекты.' WHERE id = 'place-studio'"),
      db.prepare("UPDATE locations SET name = 'Учебный клуб', note = 'Учёба, практика и обмен знаниями.' WHERE id = 'place-study'"),
      db.prepare("UPDATE locations SET name = 'Домашний район', note = 'Дом, друзья и привычные маршруты.' WHERE id = 'district-home'"),
      db.prepare("UPDATE assets SET location_name = 'Дом' WHERE owner_id = ? AND location_name IN ('Мой квартал', 'Дом Алекса')").bind(CHARACTER_ID),
      db.prepare(`DELETE FROM chat_messages WHERE player_id = ? AND (
        body LIKE 'Я собрал карточку «%' OR
        body IN (
          'хочу сделать кардио и укрепить выносливость',
          'разобрать один учебный модуль',
          'взять небольшую задачу для студии',
          'поехать в Центр',
          'испытать новую тренировку',
          'хочу провести силовую тренировку'
        )
      )`).bind(PLAYER_ID),
      db.prepare(`INSERT INTO app_meta (key, value, updated_at) VALUES ('legacy-copy-cleanup-v2', 'done', ?)`).bind(now),
    ]);
  }
  const cleanedSmoke = await db.prepare(`SELECT value FROM app_meta WHERE key = 'scenario-smoke-cleanup-v3'`).first<{ value: string }>();
  if (!cleanedSmoke) {
    const smokeMessages = [
      'Что сейчас известно о Тимуре?',
      'Давай начнём силовую тренировку.',
      'Давай соберу портфолио из трёх лучших работ и отправлю его потенциальному заказчику.',
      'Давай сегодня станем президентом страны и получим полный контроль.',
      'Давай создадим новую организацию.',
      'Давай каждый день в 07:00 заниматься испанским языком — сценарная проверка.',
      'Предлагаю Тимуру поединок на ринге по $50 с каждого.',
      'я хочу изнасиловать другого персонажа',
    ];
    const placeholders = smokeMessages.map(() => '?').join(',');
    const actionIds = await db.prepare(`SELECT DISTINCT a.id FROM actions a JOIN chat_messages cm ON cm.player_id = a.player_id AND cm.role = 'player' AND cm.created_at = a.created_at WHERE cm.body IN (${placeholders})`).bind(...smokeMessages).all<{ id: string }>();
    const ids = actionIds.results.map((row) => row.id);
    if (ids.length) {
      const idPlaceholders = ids.map(() => '?').join(',');
      await db.batch([
        db.prepare(`DELETE FROM daily_plan_items WHERE action_id IN (${idPlaceholders})`).bind(...ids),
        db.prepare(`DELETE FROM chat_action_links WHERE action_id IN (${idPlaceholders})`).bind(...ids),
        db.prepare(`DELETE FROM action_targets WHERE action_id IN (${idPlaceholders})`).bind(...ids),
        db.prepare(`DELETE FROM action_effects WHERE action_id IN (${idPlaceholders})`).bind(...ids),
        db.prepare(`DELETE FROM action_payloads WHERE action_id IN (${idPlaceholders})`).bind(...ids),
        db.prepare(`DELETE FROM action_mechanics WHERE action_id IN (${idPlaceholders})`).bind(...ids),
        db.prepare(`DELETE FROM domain_events WHERE action_id IN (${idPlaceholders})`).bind(...ids),
        db.prepare(`DELETE FROM ledger_entries WHERE action_id IN (${idPlaceholders})`).bind(...ids),
        db.prepare(`DELETE FROM actions WHERE id IN (${idPlaceholders})`).bind(...ids),
      ]);
    }
    await db.batch([
      db.prepare(`DELETE FROM chat_messages WHERE created_at IN (SELECT created_at FROM chat_messages WHERE player_id = ? AND role = 'player' AND body IN (${placeholders}))`).bind(PLAYER_ID, ...smokeMessages),
      db.prepare("DELETE FROM domain_events WHERE type = 'profile_updated' AND body IN ('Проверка, 31 лет', 'Алекс, 25 лет')"),
      db.prepare(`INSERT INTO app_meta (key, value, updated_at) VALUES ('scenario-smoke-cleanup-v3', 'done', ?)`).bind(now),
    ]);
  }
  const cleanedLegacySmoke = await db.prepare(`SELECT value FROM app_meta WHERE key = 'legacy-smoke-cleanup-v4'`).first<{ value: string }>();
  if (!cleanedLegacySmoke) {
    const legacyMessages = [
      'Интеграционный тест: силовая тренировка',
      'Интеграционный тест: второй физический маршрут',
      'Интеграционный тест: фоновая учёба',
      'Проверка маршрута в Старый город',
      'Что сейчас делает Тимур?',
      'Давай проведём силовую тренировку',
    ];
    const placeholders = legacyMessages.map(() => '?').join(',');
    const actionIds = await db.prepare(`SELECT DISTINCT a.id FROM actions a JOIN chat_messages cm ON cm.player_id = a.player_id AND cm.role = 'player' AND cm.created_at = a.created_at WHERE cm.body IN (${placeholders})`).bind(...legacyMessages).all<{ id: string }>();
    const ids = actionIds.results.map((row) => row.id);
    if (ids.length) {
      const idPlaceholders = ids.map(() => '?').join(',');
      await db.batch([
        db.prepare(`DELETE FROM daily_plan_items WHERE action_id IN (${idPlaceholders})`).bind(...ids),
        db.prepare(`DELETE FROM chat_action_links WHERE action_id IN (${idPlaceholders})`).bind(...ids),
        db.prepare(`DELETE FROM action_targets WHERE action_id IN (${idPlaceholders})`).bind(...ids),
        db.prepare(`DELETE FROM action_effects WHERE action_id IN (${idPlaceholders})`).bind(...ids),
        db.prepare(`DELETE FROM action_payloads WHERE action_id IN (${idPlaceholders})`).bind(...ids),
        db.prepare(`DELETE FROM action_mechanics WHERE action_id IN (${idPlaceholders})`).bind(...ids),
        db.prepare(`DELETE FROM domain_events WHERE action_id IN (${idPlaceholders})`).bind(...ids),
        db.prepare(`DELETE FROM ledger_entries WHERE action_id IN (${idPlaceholders})`).bind(...ids),
        db.prepare(`DELETE FROM actions WHERE id IN (${idPlaceholders})`).bind(...ids),
      ]);
    }
    await db.batch([
      db.prepare(`DELETE FROM chat_messages WHERE created_at IN (SELECT created_at FROM chat_messages WHERE player_id = ? AND role = 'player' AND body IN (${placeholders}))`).bind(PLAYER_ID, ...legacyMessages),
      db.prepare("DELETE FROM chat_messages WHERE player_id = ? AND body = 'Готово. Договорённость появилась в плане дня; повторяющиеся правила останутся в базе и не будут загромождать экран.'").bind(PLAYER_ID),
      db.prepare(`INSERT INTO app_meta (key, value, updated_at) VALUES ('legacy-smoke-cleanup-v4', 'done', ?)`).bind(now),
    ]);
  }
  const cleanedCurrentSmoke = await db.prepare(`SELECT value FROM app_meta WHERE key = 'current-smoke-cleanup-v5'`).first<{ value: string }>();
  if (!cleanedCurrentSmoke) {
    const currentMessages = [
      'Что сейчас известно о Тимуре?',
      'Давай начнём силовую тренировку.',
      'Давай соберу портфолио из трёх лучших работ и отправлю его потенциальному заказчику.',
      'Давай сегодня станем президентом страны и получим полный контроль.',
      'Давай создадим новую организацию.',
      'Давай каждый день, когда освобожусь, заниматься испанским языком 30 минут — сценарная проверка.',
      'Предлагаю Тимуру поединок на ринге по $50 с каждого.',
    ];
    const placeholders = currentMessages.map(() => '?').join(',');
    const actionIds = await db.prepare(`SELECT DISTINCT a.id FROM actions a JOIN chat_messages cm ON cm.player_id = a.player_id AND cm.role = 'player' AND cm.created_at = a.created_at WHERE cm.body IN (${placeholders})`).bind(...currentMessages).all<{ id: string }>();
    const ids = actionIds.results.map((row) => row.id);
    if (ids.length) {
      const idPlaceholders = ids.map(() => '?').join(',');
      await db.batch([
        db.prepare(`DELETE FROM routines WHERE id IN (${ids.map(() => "'routine-' || ?").join(',')})`).bind(...ids),
        db.prepare(`DELETE FROM daily_plan_items WHERE action_id IN (${idPlaceholders})`).bind(...ids),
        db.prepare(`DELETE FROM chat_action_links WHERE action_id IN (${idPlaceholders})`).bind(...ids),
        db.prepare(`DELETE FROM action_targets WHERE action_id IN (${idPlaceholders})`).bind(...ids),
        db.prepare(`DELETE FROM action_effects WHERE action_id IN (${idPlaceholders})`).bind(...ids),
        db.prepare(`DELETE FROM action_payloads WHERE action_id IN (${idPlaceholders})`).bind(...ids),
        db.prepare(`DELETE FROM action_mechanics WHERE action_id IN (${idPlaceholders})`).bind(...ids),
        db.prepare(`DELETE FROM domain_events WHERE action_id IN (${idPlaceholders})`).bind(...ids),
        db.prepare(`DELETE FROM ledger_entries WHERE action_id IN (${idPlaceholders})`).bind(...ids),
        db.prepare(`DELETE FROM actions WHERE id IN (${idPlaceholders})`).bind(...ids),
      ]);
    }
    await db.batch([
      db.prepare(`DELETE FROM chat_messages WHERE created_at IN (SELECT created_at FROM chat_messages WHERE player_id = ? AND role = 'player' AND body IN (${placeholders}))`).bind(PLAYER_ID, ...currentMessages),
      db.prepare("DELETE FROM chat_messages WHERE player_id = ? AND body IN ('Готово. Ближайшее выполнение появилось в плане дня, а повторяющееся правило сохранено в базе и не загромождает экран.', 'Готово. Договорённость появилась в плане дня.')").bind(PLAYER_ID),
      db.prepare("DELETE FROM domain_events WHERE type = 'profile_updated' AND body IN ('Проверка, 31 лет', 'Алекс, 25 лет')"),
      db.prepare(`INSERT INTO app_meta (key, value, updated_at) VALUES ('current-smoke-cleanup-v5', 'done', ?)`).bind(now),
    ]);
  }
  const cleanedRoutineSeeds = await db.prepare(`SELECT value FROM app_meta WHERE key = 'remove-routine-seeds-v6'`).first<{ value: string }>();
  if (!cleanedRoutineSeeds) {
    await db.batch([
      db.prepare("DELETE FROM routines WHERE id IN ('routine-morning', 'routine-gym', 'routine-study')"),
      db.prepare(`INSERT INTO app_meta (key, value, updated_at) VALUES ('remove-routine-seeds-v6', 'done', ?)`).bind(now),
    ]);
  }
}

const ACTION_SELECT = `SELECT a.*, m.difficulty_label, m.capacity, m.probability_bp, m.rng_seed, m.roll_bp, m.succeeded,
  t.entity_id target_location_id, e.resolution_mode, e.energy_delta, e.health_delta, e.strength_delta, e.intelligence_delta,
  e.morale_delta, e.confidence_delta, e.fatigue_delta, e.skill_name, e.skill_domain, e.summary effect_summary, p.payload_json
  FROM actions a JOIN action_mechanics m ON m.action_id = a.id
  LEFT JOIN action_targets t ON t.action_id = a.id AND t.entity_type = 'location'
  LEFT JOIN action_effects e ON e.action_id = a.id LEFT JOIN action_payloads p ON p.action_id = a.id`;
function resultGrade(action: ActionRow, rollBp: number, succeeded: boolean): 'минимальный' | 'обычный' | 'сильный' {
  if (action.resolution_mode === 'chance' && !succeeded) return 'минимальный';
  if (rollBp < Math.max(1200, action.probability_bp - 2500)) return 'сильный';
  return rollBp < action.probability_bp ? 'обычный' : 'минимальный';
}

function scaled(delta: number, grade: 'минимальный' | 'обычный' | 'сильный'): number {
  const factor = grade === 'сильный' ? 1.5 : grade === 'минимальный' ? 0.5 : 1;
  if (delta === 0) return 0;
  const value = Math.round(delta * factor);
  return delta > 0 ? Math.max(1, value) : Math.min(-1, value);
}

function actionOutcome(action: ActionRow, grade: 'минимальный' | 'обычный' | 'сильный', succeeded: boolean): string {
  if (action.resolution_mode === 'chance' && !succeeded) return `${action.title}: основной результат не достигнут, но попытка сохранена как опыт. ${action.effect_summary}`;
  if (action.kind === 'travel') return `Поездка завершена. Новое местоположение сохранено сервером.`;
  if (action.kind === 'organization') return `Организация создана. Это только начало: рынок, расходы и результаты будут рассчитываться отдельно.`;
  return `${action.title} завершена. Качество результата: ${grade}. ${action.effect_summary}`;
}

async function reconcileDueActions(db: D1Database): Promise<void> {
  const now = new Date().toISOString();
  const due = await db.prepare(`${ACTION_SELECT} WHERE a.player_id = ? AND a.status = 'running' AND a.due_at <= ? ORDER BY a.due_at ASC LIMIT 20`).bind(PLAYER_ID, now).all<ActionRow>();
  for (const action of due.results) {
    const token = uid('resolve');
    const rollBp = await seededRollBp(action.rng_seed);
    const succeeded = action.resolution_mode !== 'chance' || rollBp < action.probability_bp;
    const grade = resultGrade(action, rollBp, succeeded);
    const applies = succeeded || action.resolution_mode === 'progress';
    const energy = applies ? scaled(action.energy_delta, grade) : 0;
    const health = applies ? scaled(action.health_delta, grade) : 0;
    const strength = applies ? scaled(action.strength_delta, grade) : 0;
    const intelligence = applies ? scaled(action.intelligence_delta, grade) : 0;
    const morale = applies ? scaled(action.morale_delta, grade) : 0;
    const confidence = applies ? scaled(action.confidence_delta, grade) : 0;
    const fatigue = applies ? scaled(action.fatigue_delta, grade) : Math.max(1, Math.round(action.fatigue_delta / 2));
    const outcome = actionOutcome(action, grade, succeeded);
    const actionPayload = safeJson(action.payload_json);
    const statements: D1PreparedStatement[] = [
      db.prepare(`UPDATE actions SET status = 'resolved', resolved_at = ?, outcome = ?, transition_token = ? WHERE id = ? AND player_id = ? AND status = 'running' AND due_at <= ?`).bind(now, outcome, token, action.id, PLAYER_ID, now),
      db.prepare(`UPDATE action_mechanics SET roll_bp = ?, succeeded = ?, resolved_at = ? WHERE action_id = ? AND roll_bp IS NULL AND EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(rollBp, succeeded ? 1 : 0, now, action.id, action.id, token),
      db.prepare(`UPDATE players SET energy = MIN(100, MAX(0, energy + ?)), health = MIN(100, MAX(0, health + ?)) WHERE id = ? AND EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(energy, health, PLAYER_ID, action.id, token),
      db.prepare(`UPDATE characters SET morale = MIN(100, MAX(0, morale + ?)), confidence = MIN(100, MAX(0, confidence + ?)), fatigue = MIN(100, MAX(0, fatigue + ?)) WHERE id = ? AND EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(morale, confidence, fatigue, CHARACTER_ID, action.id, token),
      db.prepare(`UPDATE character_conditions SET strength = MIN(100, MAX(0, strength + ?)), intelligence = MIN(100, MAX(0, intelligence + ?)), updated_at = ? WHERE character_id = ? AND EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(strength, intelligence, now, CHARACTER_ID, action.id, token),
      db.prepare(`INSERT INTO domain_events (id, player_id, type, title, body, action_id, created_at) SELECT ?, ?, 'action_resolved', ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(uid('event'), PLAYER_ID, succeeded ? 'Действие завершено' : 'Попытка завершена', outcome, action.id, now, action.id, token),
      db.prepare(`INSERT OR IGNORE INTO experience_events (id, character_id, domain, title, outcome, complexity, occurred_at) SELECT ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(`experience-${action.id}`, CHARACTER_ID, action.skill_domain ?? action.kind, action.title, succeeded ? 'success' : 'failure', action.difficulty_label.toLowerCase(), now, action.id, token),
      db.prepare(`UPDATE daily_plan_items SET status = 'completed', updated_at = ? WHERE action_id = ? AND EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(now, action.id, action.id, token),
      db.prepare(`INSERT INTO chat_messages (id, player_id, role, source, body, created_at) SELECT ?, ?, 'host', 'SYSTEM', ?, ? WHERE EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(uid('chat'), PLAYER_ID, outcome, now, action.id, token),
      db.prepare(`INSERT INTO notifications (id, player_id, sender_name, category, title, body, status, can_accept, can_reply, payload_json, created_at, updated_at) SELECT ?, ?, 'Хост', 'system', ?, ?, 'unread', 0, 0, '{}', ?, ? WHERE EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(uid('notice'), PLAYER_ID, succeeded ? 'Действие завершено' : 'Попытка завершена', outcome, now, now, action.id, token),
    ];
    if (action.skill_name) {
      statements.push(db.prepare(`INSERT INTO skills (id, character_id, name, domain, competence, evidence_count) SELECT ?, ?, ?, ?, ?, 1 WHERE EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)
        ON CONFLICT(character_id, name) DO UPDATE SET competence = MIN(100, competence + ?), evidence_count = evidence_count + 1`)
        .bind(uid('skill'), CHARACTER_ID, action.skill_name, action.skill_domain ?? 'Развитие', grade === 'сильный' ? 2 : 1, action.id, token, grade === 'сильный' ? 2 : 1));
    }
    const metricKey = typeof actionPayload.dynamicMetricKey === 'string' ? actionPayload.dynamicMetricKey : '';
    const metricLabel = typeof actionPayload.dynamicMetricLabel === 'string' ? actionPayload.dynamicMetricLabel : '';
    const metricVisibility = ['public', 'private', 'secret'].includes(String(actionPayload.dynamicMetricVisibility)) ? String(actionPayload.dynamicMetricVisibility) : 'private';
    if (applies && metricKey && metricLabel) {
      const metricPath = `$.${metricKey}`;
      const metricDelta = grade === 'сильный' ? 2 : 1;
      statements.push(
        db.prepare(`INSERT OR IGNORE INTO entity_components (id, entity_id, definition_id, data_json, version, updated_at)
          SELECT ?, ?, 'component-dynamic-context', ?, 1, ? WHERE EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`)
          .bind(`dynamic-state-${CHARACTER_ID}`, CHARACTER_ID, JSON.stringify({ _title: 'Возникающие характеристики', _visibility: metricVisibility, [metricKey]: 0 }), now, action.id, token),
        db.prepare(`UPDATE entity_components SET data_json = json_set(data_json, '$._title', 'Возникающие характеристики', '$._visibility', CASE WHEN json_extract(data_json, '$._visibility') = 'secret' OR ? = 'secret' THEN 'secret' WHEN json_extract(data_json, '$._visibility') = 'private' OR ? = 'private' THEN 'private' ELSE 'public' END, ?, MIN(100, MAX(0, COALESCE(CAST(json_extract(data_json, ?) AS INTEGER), 0) + ?))), version = version + 1, updated_at = ? WHERE id = ? AND EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`)
          .bind(metricVisibility, metricVisibility, metricPath, metricPath, metricDelta, now, `dynamic-state-${CHARACTER_ID}`, action.id, token)
      );
    }
    if (action.kind === 'travel' && action.target_location_id && succeeded) {
      statements.push(db.prepare(`UPDATE character_locations SET location_id = ?, visited_json = CASE WHEN EXISTS (SELECT 1 FROM json_each(visited_json) WHERE value = ?) THEN visited_json ELSE json_insert(visited_json, '$[#]', ?) END, updated_at = ? WHERE character_id = ? AND EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(action.target_location_id, action.target_location_id, action.target_location_id, now, CHARACTER_ID, action.id, token));
    }
    if (action.kind === 'organization' && succeeded) {
      const payload = safeJson(action.payload_json);
      const name = typeof payload.organizationName === 'string' && payload.organizationName.trim() ? payload.organizationName.trim().slice(0, 80) : 'Новая организация';
      const organizationId = `organization-${action.id}`;
      statements.push(
        db.prepare(`INSERT OR IGNORE INTO organizations (id, name, kind, cash_cents, monthly_revenue_cents, monthly_profit_cents, members, created_at) VALUES (?, ?, ?, 0, 0, 0, 1, ?)`).bind(organizationId, name, typeof payload.domain === 'string' ? payload.domain : 'Организация', now),
        db.prepare(`INSERT OR IGNORE INTO organization_memberships (id, organization_id, character_id, role, permissions_json, created_at) VALUES (?, ?, ?, 'Основатель', '["ordinary_contracts","projects"]', ?)`).bind(`membership-${action.id}`, organizationId, CHARACTER_ID, now),
        db.prepare(`INSERT OR IGNORE INTO ownership_stakes (id, organization_id, owner_id, basis_points, created_at) VALUES (?, ?, ?, 10000, ?)`).bind(`stake-${action.id}`, organizationId, CHARACTER_ID, now)
      );
    }
    if (action.reward_money_cents > 0 && succeeded) {
      statements.push(
        db.prepare(`UPDATE wallets SET balance_cents = balance_cents + ? WHERE player_id = ? AND EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(action.reward_money_cents, PLAYER_ID, action.id, token),
        db.prepare(`INSERT OR IGNORE INTO ledger_entries (id, player_id, title, amount_cents, kind, action_id, created_at) SELECT ?, ?, ?, ?, 'reward', ?, ? WHERE EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(uid('ledger'), PLAYER_ID, `Доход: ${action.title}`, action.reward_money_cents, action.id, now, action.id, token),
        ...journalStatements(db, 'reward', action.id, `Доход: ${action.title}`, action.reward_money_cents, now, token)
      );
    }
    await db.batch(statements);
  }
}

function mapAction(row: ActionRow): GameAction {
  const fallback = ACTION_CATALOG[row.kind] ?? ACTION_CATALOG.generic;
  const valueOr = (value: number | null | undefined, defaultValue: number): number => Number.isFinite(value) ? Number(value) : defaultValue;
  const normalized = {
    ...row,
    resolution_mode: row.resolution_mode ?? fallback.resolutionMode,
    energy_delta: valueOr(row.energy_delta, fallback.effects.energy),
    health_delta: valueOr(row.health_delta, fallback.effects.health),
    strength_delta: valueOr(row.strength_delta, fallback.effects.strength),
    intelligence_delta: valueOr(row.intelligence_delta, fallback.effects.intelligence),
    morale_delta: valueOr(row.morale_delta, fallback.effects.morale),
    confidence_delta: valueOr(row.confidence_delta, fallback.effects.confidence),
    fatigue_delta: valueOr(row.fatigue_delta, fallback.effects.fatigue),
    skill_name: row.skill_name ?? fallback.effects.skillName,
    skill_domain: row.skill_domain ?? fallback.effects.skillDomain,
    effect_summary: row.effect_summary || fallback.effects.summary,
  } satisfies ActionRow;
  const grade = normalized.roll_bp === null ? null : resultGrade(normalized, normalized.roll_bp, normalized.succeeded === 1);
  return {
    id: normalized.id, kind: normalized.kind, title: normalized.title, description: normalized.description, status: normalized.status,
    durationSeconds: normalized.duration_seconds, costCents: normalized.cost_cents, energyCost: normalized.energy_cost,
    rewardFocus: 0, rewardHealth: normalized.health_delta, rewardMoneyCents: normalized.reward_money_cents,
    effects: { energy: normalized.energy_delta, health: normalized.health_delta, strength: normalized.strength_delta, intelligence: normalized.intelligence_delta, morale: normalized.morale_delta, confidence: normalized.confidence_delta, fatigue: normalized.fatigue_delta, moneyCents: normalized.reward_money_cents, skillName: normalized.skill_name, summary: normalized.effect_summary },
    resolutionMode: normalized.resolution_mode, resultGrade: grade,
    riskLabel: normalized.risk_label, difficultyLabel: normalized.difficulty_label, capacity: normalized.capacity,
    probabilityPercent: normalized.probability_bp / 100, rollPercent: normalized.roll_bp === null ? null : normalized.roll_bp / 100,
    succeeded: normalized.succeeded === null ? null : normalized.succeeded === 1, createdAt: normalized.created_at, confirmedAt: normalized.confirmed_at,
    dueAt: normalized.due_at, resolvedAt: normalized.resolved_at, outcome: normalized.outcome, targetLocationId: normalized.target_location_id,
  };
}
function mapRoutine(row: RoutineRow): RoutineState { return { id: row.id, title: row.title, scheduleLabel: row.schedule_label, durationMinutes: row.duration_minutes, streak: row.streak, status: row.status, skipNext: Boolean(row.skip_next), createdAt: row.created_at }; }
function mapLedger(row: LedgerRow): LedgerEntryState { return { id: row.id, title: row.title, amountCents: row.amount_cents, kind: row.kind, createdAt: row.created_at }; }
function mapEvent(row: EventRow): EventState { return { id: row.id, type: row.type, title: row.title, body: row.body, createdAt: row.created_at }; }
function safeJson(value: string | null): Record<string, unknown> { try { return value ? JSON.parse(value) as Record<string, unknown> : {}; } catch { return {}; } }

export async function getGameState(): Promise<GameState> {
  const db = await ensurePlayer();
  await reconcileDueActions(db);
  const [player, wallet, actions, routines, ledger, events, reserved] = await Promise.all([
    db.prepare('SELECT * FROM players WHERE id = ?').bind(PLAYER_ID).first<PlayerRow>(),
    db.prepare('SELECT balance_cents, currency, 0 reserved_cents FROM wallets WHERE player_id = ?').bind(PLAYER_ID).first<WalletRow>(),
    db.prepare(`${ACTION_SELECT} WHERE a.player_id = ? ORDER BY a.created_at DESC LIMIT 40`).bind(PLAYER_ID).all<ActionRow>(),
    db.prepare("SELECT * FROM routines WHERE player_id = ? AND status != 'cancelled' ORDER BY created_at ASC").bind(PLAYER_ID).all<RoutineRow>(),
    db.prepare('SELECT * FROM ledger_entries WHERE player_id = ? ORDER BY created_at DESC LIMIT 30').bind(PLAYER_ID).all<LedgerRow>(),
    db.prepare('SELECT * FROM domain_events WHERE player_id = ? ORDER BY created_at DESC LIMIT 40').bind(PLAYER_ID).all<EventRow>(),
    db.prepare("SELECT COALESCE(SUM(amount_cents), 0) amount FROM fund_reservations WHERE player_id = ? AND status = 'held'").bind(PLAYER_ID).first<{ amount: number }>(),
  ]);
  const extended = await getExtendedState(db, PLAYER_ID);
  if (!player || !wallet) throw new DomainError('Не удалось загрузить состояние игрока', 'STATE_NOT_FOUND', 500);
  const reservedCents = Number(reserved?.amount ?? 0);
  return {
    player: { id: player.id, name: player.name, age: extended.age, city: player.city, role: player.role, energy: player.energy, health: player.health, strength: extended.strength, intelligence: extended.intelligence },
    character: extended.character,
    wallet: { balanceCents: wallet.balance_cents, availableCents: Math.max(0, wallet.balance_cents - reservedCents), reservedCents, currency: 'USD' },
    actions: actions.results.map(mapAction), routines: routines.results.map(mapRoutine), ledger: ledger.results.map(mapLedger), events: events.results.map(mapEvent),
    world: extended.world, profile: extended.profile, hostMessages: extended.hostMessages, dailyPlan: extended.dailyPlan, notifications: extended.notifications, dynamicSections: extended.dynamicSections,
    serverTime: new Date().toISOString(),
  };
}

function buildVisibleContext(state: GameState): string[] {
  const context = [
    `${state.player.name}: энергия ${state.player.energy}, здоровье ${state.player.health}, сила ${state.player.strength}, интеллект ${state.player.intelligence}, мораль ${state.character.morale}, уверенность ${state.character.confidence}, усталость ${state.character.fatigue}.`,
    `Доступно денег: ${formatUsd(state.wallet.availableCents)}.`,
  ];
  for (const person of state.world.players.filter((item) => !item.isCurrent)) {
    for (const fact of person.knownFacts) context.push(`${person.name}: ${fact.statement} Уверенность сведения ${fact.confidence}%.`);
  }
  for (const event of state.world.events.slice(0, 4)) context.push(`Публичное событие: ${event.title}. ${event.summary}`);
  for (const item of state.dailyPlan.slice(0, 5)) context.push(`План: ${item.title}, ${item.status}, ${item.startCondition}.`);
  for (const routine of state.routines.slice(0, 3)) context.push(`Повторяющееся правило: ${routine.title}; ${routine.scheduleLabel}; статус ${routine.status}.`);
  for (const section of state.dynamicSections.filter((item) => item.visibility === 'public').slice(0, 3)) {
    const fields = section.fields.map((field) => `${field.label}: ${String(field.value)}`).join(', ');
    if (fields) context.push(`Публичный показатель — ${section.title}: ${fields}.`);
  }
  return context.slice(0, 16);
}

function fallbackTitle(draft: HostIntentDraft): string { return draft.title.trim() || ACTION_CATALOG[draft.kind].title; }

function semanticDefinition(base: ActionDefinition, draft: HostIntentDraft): ActionDefinition {
  const estimate = draft.estimate;
  if (!estimate) return base;
  const durationMinutes = { brief: 15, session: 45, extended: 120, project: 360 }[estimate.durationBand];
  const genericCostCents = { none: 0, low: 1000, medium: 5000, high: 25000 }[estimate.costBand];
  const effort = {
    light: { energyCost: 2, fatigue: 2 },
    moderate: { energyCost: 6, fatigue: 6 },
    heavy: { energyCost: 12, fatigue: 12 },
  }[estimate.effortBand];
  const impact: Record<string, Partial<EffectDefinition>> = {
    physical: { health: 1, strength: 2, fatigue: effort.fatigue },
    cognitive: { intelligence: 2, fatigue: effort.fatigue },
    recovery: { energy: 6, morale: 3, fatigue: -8 },
    social: { confidence: 2, fatigue: Math.max(1, Math.round(effort.fatigue / 2)) },
    financial: { intelligence: 1, confidence: 1, fatigue: effort.fatigue },
    political: { intelligence: 1, confidence: 1, fatigue: effort.fatigue },
    information: { intelligence: 2, fatigue: effort.fatigue },
    mobility: { fatigue: Math.max(1, Math.round(effort.fatigue / 2)) },
    governance: { intelligence: 1, confidence: 1, fatigue: effort.fatigue },
    generic: { fatigue: effort.fatigue },
  };
  if (draft.kind !== 'generic') {
    return {
      ...base,
      effects: {
        ...base.effects,
        skillName: estimate.skillName?.trim().slice(0, 80) || base.effects.skillName,
        skillDomain: estimate.skillDomain?.trim().slice(0, 80) || base.effects.skillDomain,
        summary: estimate.effectSummary.trim().slice(0, 400) || base.effects.summary,
      },
    };
  }
  const primary = impact[estimate.primaryImpact] ?? impact.generic;
  const secondary = estimate.secondaryImpact === 'none' ? {} : impact[estimate.secondaryImpact] ?? {};
  const combined = (key: keyof EffectDefinition): number => {
    const first = typeof primary[key] === 'number' ? Number(primary[key]) : 0;
    const second = typeof secondary[key] === 'number' ? Math.sign(Number(secondary[key])) : 0;
    return first + second;
  };
  return {
    ...base,
    durationSeconds: durationMinutes * 60,
    costCents: genericCostCents,
    energyCost: estimate.primaryImpact === 'recovery' ? 0 : effort.energyCost,
    difficultyLabel: estimate.effortBand === 'heavy' ? 'Сложная' : estimate.effortBand === 'light' ? 'Лёгкая' : 'Обычная',
    riskLabel: estimate.primaryImpact === 'information' ? 'Средний' : 'Низкий',
    resolutionMode: 'progress',
    effects: {
      energy: combined('energy'), health: combined('health'), strength: combined('strength'), intelligence: combined('intelligence'),
      morale: combined('morale'), confidence: combined('confidence'), fatigue: combined('fatigue'),
      skillName: estimate.skillName?.trim().slice(0, 80) || (draft.domain !== 'generic' ? draft.domain : 'Практический опыт'),
      skillDomain: estimate.skillDomain?.trim().slice(0, 80) || draft.domain,
      summary: estimate.effectSummary.trim().slice(0, 400) || 'Эффекты рассчитаны по смыслу, нагрузке и масштабу действия.',
    },
  };
}

function dynamicMetricPayload(draft: HostIntentDraft): Record<string, unknown> {
  const estimate = draft.estimate;
  if (!estimate?.dynamicMetricLabel) return {};
  const keySource = estimate.dynamicMetricLabel;
  const key = keySource.toLocaleLowerCase('ru-RU').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  if (!key) return {};
  return { dynamicMetricKey: key, dynamicMetricLabel: estimate.dynamicMetricLabel.trim().slice(0, 80), dynamicMetricVisibility: estimate.dynamicMetricVisibility };
}

async function definitionForDraft(db: D1Database, draft: HostIntentDraft, state: GameState, targetLocationId?: string): Promise<{ definition?: ActionDefinition; payload: Record<string, unknown>; blocked?: string; targetLocationId?: string }> {
  const base = semanticDefinition(ACTION_CATALOG[draft.kind] ?? ACTION_CATALOG.generic, draft);
  const payload: Record<string, unknown> = {
    domain: draft.domain, scale: draft.scale, targetName: draft.targetName, scheduleText: draft.scheduleText,
    organizationName: draft.organizationName, userAmountUsdCents: draft.userAmountUsdCents,
    impactProfile: draft.estimate ? { primary: draft.estimate.primaryImpact, secondary: draft.estimate.secondaryImpact, effort: draft.estimate.effortBand } : null,
    ...dynamicMetricPayload(draft),
  };
  if (draft.scale === 'irreversible') return { payload, blocked: 'Это намерение относится к необратимым и опасным действиям. Текущий движок не создаёт его как обычную карточку: требуется отдельная модель прав, риска и последствий.' };
  if (draft.scale === 'high_risk' && draft.kind !== 'challenge') {
    const missing = [state.wallet.availableCents < 25000000 ? 'капитала' : '', state.profile.reputations.filter((item) => item.visibility === 'public').every((item) => item.value < 60) ? 'влияния' : '', state.profile.relationships.every((item) => item.trust < 70) ? 'надёжных связей' : ''].filter(Boolean);
    return { payload, blocked: `В нынешнем положении такой масштаб практически недостижим${missing.length ? `: не хватает ${missing.join(', ')}` : ''}. Точный маршрут Хост не раскрывает — его должен найти игрок.` };
  }
  if (draft.kind === 'organization' && !draft.organizationName) return { payload, blocked: 'Чтобы продолжить, нужно твоё решение: как назовём организацию и чем именно она будет заниматься?' };
  if (draft.kind === 'challenge') {
    if (!draft.targetName) return { payload, blocked: 'Кому именно отправить вызов и какую ставку ты предлагаешь?' };
    const stake = draft.userAmountUsdCents ?? 0;
    if (stake <= 0) return { payload, blocked: 'Назови ставку в USD. Она будет зарезервирована только после подтверждения и согласия второй стороны.' };
    if (stake > state.wallet.availableCents) return { payload, blocked: `Для ставки ${formatUsd(stake)} не хватает свободных денег. Сейчас доступно ${formatUsd(state.wallet.availableCents)}.` };
    return { definition: { ...base, description: `Вызов для ${draft.targetName}. Ставка каждой стороны: ${formatUsd(stake)}; потенциальный банк: ${formatUsd(stake * 2)}. Сила соперника и скрытые модификаторы не раскрываются.`, effects: { ...EMPTY_EFFECTS, summary: `После согласия обеих сторон будет зарезервировано по ${formatUsd(stake)}.` } }, payload };
  }
  if (draft.kind === 'travel' && targetLocationId) {
    const target = await db.prepare("SELECT id, name, note, risk_label, travel_cost_cents, travel_minutes FROM locations WHERE id = ? AND kind IN ('district','region')").bind(targetLocationId).first<Record<string, unknown>>();
    if (!target) return { payload, blocked: 'Такой известный маршрут не найден.' };
    return { definition: { ...base, title: `Поездка: ${String(target.name)}`, description: String(target.note), durationSeconds: Math.max(5 * 60, Number(target.travel_minutes) * 60), costCents: Number(target.travel_cost_cents), riskLabel: String(target.risk_label) }, payload, targetLocationId };
  }
  if (draft.kind === 'generic') {
    const material = draft.scale === 'material';
    const definition = { ...base, title: fallbackTitle(draft), description: draft.summary, riskLabel: material ? 'Средний' : base.riskLabel };
    if (definition.costCents > state.wallet.availableCents) return { payload, blocked: `Для этого плана нужно около ${formatUsd(definition.costCents)}, а сейчас доступно ${formatUsd(state.wallet.availableCents)}. Можно обсудить более дешёвый вариант.` };
    return { definition, payload };
  }
  const definition = { ...base, title: fallbackTitle(draft), description: draft.summary || base.description };
  if (definition.costCents > state.wallet.availableCents) return { payload, blocked: `Для этого плана нужно около ${formatUsd(definition.costCents)}, а сейчас доступно ${formatUsd(state.wallet.availableCents)}. Можно обсудить более дешёвый вариант.` };
  return { definition, payload, targetLocationId };
}

async function insertChatPair(db: D1Database, message: string, reply: string, provider: string, skills: string[], actionId?: string): Promise<void> {
  const now = new Date().toISOString();
  const playerMessageId = uid('chat');
  const hostMessageId = uid('chat');
  const statements: D1PreparedStatement[] = [
    db.prepare(`INSERT INTO chat_messages (id, player_id, role, source, body, created_at) VALUES (?, ?, 'player', 'WEB', ?, ?)`).bind(playerMessageId, PLAYER_ID, message, now),
    db.prepare(`INSERT INTO chat_messages (id, player_id, role, source, body, created_at) VALUES (?, ?, 'host', 'WEB', ?, ?)`).bind(hostMessageId, PLAYER_ID, reply, now),
    db.prepare(`INSERT INTO agent_runs (id, player_id, role, prompt_version, provider, skill_keys, status, created_at) VALUES (?, ?, 'orchestrator', 'host.v2', ?, ?, 'validated', ?)`).bind(uid('agent'), PLAYER_ID, provider, JSON.stringify(skills), now),
  ];
  if (actionId) statements.push(db.prepare('INSERT INTO chat_action_links (message_id, action_id) VALUES (?, ?)').bind(hostMessageId, actionId));
  await db.batch(statements);
}

async function createProposal(db: D1Database, draft: HostIntentDraft, message: string, provider: string, skills: string[], targetLocationId?: string): Promise<GameState> {
  const state = await getGameState();
  const built = await definitionForDraft(db, draft, state, targetLocationId);
  if (built.blocked || !built.definition) {
    const reply = built.blocked ?? 'Хосту нужно уточнение, прежде чем создавать предложение.';
    await insertChatPair(db, message, reply, provider, skills);
    if (!reply.endsWith('?')) await recordCapabilityGap(db, draft, reply);
    return getGameState();
  }
  const definition = built.definition;
  const actionId = uid('action');
  const now = new Date().toISOString();
  const probabilityBp = calculateProbability(definition, state.player.intelligence, state.player.health, state.character.fatigue);
  const reply = `Понял. Подготовил предложение «${definition.title}». Проверь цену, время, нагрузку и ожидаемый результат — без твоего подтверждения ничего не изменится.`;
  const playerMessageId = uid('chat');
  const hostMessageId = uid('chat');
  const statements: D1PreparedStatement[] = [
    db.prepare(`INSERT INTO actions (id, player_id, kind, title, description, status, duration_seconds, cost_cents, energy_cost, reward_focus, reward_health, reward_money_cents, risk_label, created_at, confirmed_at, due_at, resolved_at, outcome, transition_token, idempotency_key) VALUES (?, ?, ?, ?, ?, 'awaiting_confirmation', ?, ?, ?, 0, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?)`).bind(actionId, PLAYER_ID, draft.kind, definition.title, definition.description, definition.durationSeconds, definition.costCents, definition.energyCost, definition.effects.health, definition.rewardMoneyCents, definition.riskLabel, now, uid('proposal')),
    db.prepare(`INSERT INTO action_mechanics (action_id, difficulty_label, capacity, probability_bp, rng_seed, roll_bp, succeeded, resolved_at) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL)`).bind(actionId, definition.difficultyLabel, definition.capacity, probabilityBp, crypto.randomUUID()),
    db.prepare(`INSERT INTO action_effects (action_id, resolution_mode, energy_delta, health_delta, strength_delta, intelligence_delta, morale_delta, confidence_delta, fatigue_delta, skill_name, skill_domain, summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(actionId, definition.resolutionMode, definition.effects.energy, definition.effects.health, definition.effects.strength, definition.effects.intelligence, definition.effects.morale, definition.effects.confidence, definition.effects.fatigue, definition.effects.skillName, definition.effects.skillDomain, definition.effects.summary),
    db.prepare(`INSERT INTO action_payloads (action_id, payload_json, created_at) VALUES (?, ?, ?)`).bind(actionId, JSON.stringify(built.payload), now),
    db.prepare(`INSERT INTO chat_messages (id, player_id, role, source, body, created_at) VALUES (?, ?, 'player', 'WEB', ?, ?)`).bind(playerMessageId, PLAYER_ID, message, now),
    db.prepare(`INSERT INTO chat_messages (id, player_id, role, source, body, created_at) VALUES (?, ?, 'host', 'WEB', ?, ?)`).bind(hostMessageId, PLAYER_ID, reply, now),
    db.prepare(`INSERT INTO chat_action_links (message_id, action_id) VALUES (?, ?)`).bind(hostMessageId, actionId),
    db.prepare(`INSERT INTO agent_runs (id, player_id, role, prompt_version, provider, skill_keys, status, created_at) VALUES (?, ?, 'orchestrator', 'host.v2', ?, ?, 'validated', ?)`).bind(uid('agent'), PLAYER_ID, provider, JSON.stringify(skills), now),
    db.prepare(`INSERT INTO domain_events (id, player_id, type, title, body, action_id, created_at) VALUES (?, ?, 'action_proposed', 'Хост подготовил предложение', ?, ?, ?)`).bind(uid('event'), PLAYER_ID, `${definition.title}: требуется подтверждение.`, actionId, now),
  ];
  if (built.targetLocationId) statements.push(db.prepare(`INSERT INTO action_targets (action_id, entity_type, entity_id, created_at) VALUES (?, 'location', ?, ?)`).bind(actionId, built.targetLocationId, now));
  await db.batch(statements);
  return getGameState();
}

async function recordCapabilityGap(db: D1Database, draft: HostIntentDraft, title: string): Promise<void> {
  const fingerprint = `${draft.kind}:${draft.scale}:${draft.domain}`.toLocaleLowerCase('ru-RU').replace(/[^a-zа-я0-9:]+/gi, '-').slice(0, 120);
  await db.prepare(`INSERT INTO capability_gaps (id, category, fingerprint, title, severity, occurrences, status, last_seen_at) VALUES (?, ?, ?, ?, 'medium', 1, 'open', ?) ON CONFLICT(fingerprint) DO UPDATE SET occurrences = occurrences + 1, last_seen_at = excluded.last_seen_at`).bind(uid('gap'), draft.domain, fingerprint, title.slice(0, 180), new Date().toISOString()).run();
}

export async function sendHostMessage(input: { message?: unknown }): Promise<GameState> {
  const db = await ensurePlayer();
  await reconcileDueActions(db);
  const message = typeof input.message === 'string' ? input.message.trim() : '';
  if (!message || message.length > 1500) throw new DomainError('Сообщение должно содержать от 1 до 1500 символов', 'INVALID_MESSAGE');
  const skills = routeSkillsForMessage(message);
  const skillKeys = skills.map((skill) => `${skill.key}@${skill.version}`);
  const safety = evaluateIntentSafety(message);
  if (!safety.allowed) {
    await insertChatPair(db, message, 'Я не превращу это в игровое действие. Можем обсуждать конфликт, последствия или безопасную альтернативу без сексуализированного насилия и принуждения.', 'server-safety-gate', skillKeys);
    return getGameState();
  }
  const state = await getGameState();
  const inputForAi = { message, history: state.hostMessages, visibleContext: buildVisibleContext(state), playbooks: serializePlaybooks(skills) };
  let provider = createAiProvider();
  let decision;
  try {
    decision = await provider.respond(inputForAi);
  } catch (reason) {
    console.error('AI provider request failed; using safe local fallback', { provider: provider.name, errorType: reason instanceof Error ? reason.name : 'unknown' });
    provider = createFallbackProvider();
    decision = await provider.respond(inputForAi);
  }
  if (decision.mode !== 'intent' || !decision.intent) {
    await insertChatPair(db, message, decision.reply, provider.name, skillKeys);
    return getGameState();
  }
  return createProposal(db, { ...decision.intent, summary: decision.intent.summary || message }, message, provider.name, skillKeys);
}

export async function proposeAction(input: { intent?: unknown; kind?: unknown; targetLocationId?: unknown }): Promise<GameState> {
  const intent = typeof input.intent === 'string' ? input.intent.trim() : '';
  const safety = evaluateIntentSafety(intent);
  if (!safety.allowed) throw new DomainError('Хост не создаёт действия с сексуализированным насилием или принуждением.', 'UNSAFE_INTENT', 422);
  const kind = typeof input.kind === 'string' && input.kind in ACTION_CATALOG ? input.kind as ActionKind : null;
  if (!kind) return sendHostMessage({ message: intent });
  const db = await ensurePlayer();
  const draft: HostIntentDraft = { kind, title: ACTION_CATALOG[kind].title, summary: intent || ACTION_CATALOG[kind].description, domain: kind, scale: kind === 'challenge' ? 'high_risk' : kind === 'organization' || kind === 'travel' ? 'material' : 'routine', targetName: null, userAmountUsdCents: null, scheduleText: kind === 'schedule' ? intent : null, organizationName: null, estimate: null };
  return createProposal(db, draft, intent || draft.summary, 'deterministic-server-catalog', routeSkillsForMessage(intent || kind).map((skill) => `${skill.key}@${skill.version}`), typeof input.targetLocationId === 'string' ? input.targetLocationId : undefined);
}
export async function confirmAction(actionId: string): Promise<GameState> {
  const db = await ensurePlayer();
  await reconcileDueActions(db);
  const action = await db.prepare(`${ACTION_SELECT} WHERE a.id = ? AND a.player_id = ?`).bind(actionId, PLAYER_ID).first<ActionRow>();
  if (!action) throw new DomainError('Предложение не найдено', 'ACTION_NOT_FOUND', 404);
  if (action.status === 'running' || action.status === 'resolved') return getGameState();
  if (action.status !== 'awaiting_confirmation') throw new DomainError('Это предложение уже нельзя подтвердить', 'ACTION_NOT_CONFIRMABLE', 409);
  const now = new Date().toISOString();
  const payload = safeJson(action.payload_json);

  if (action.kind === 'schedule') {
    const scheduleText = typeof payload.scheduleText === 'string' ? payload.scheduleText : action.description;
    const scheduledFor = inferScheduledTime(scheduleText);
    const startCondition = /после\s/i.test(scheduleText) ? 'AFTER' : /когда\s+освоб/i.test(scheduleText) ? 'WHEN_FREE' : scheduledFor ? 'AT' : 'WHEN_FREE';
    const recurring = /кажд(ый|ую|ое|ые)|по\s+(понедельник|вторник|сред|четверг|пятниц|суббот|воскрес)/i.test(scheduleText);
    const durationMatch = scheduleText.match(/(\d{1,3})\s*(мин|час)/i);
    const durationMinutes = durationMatch ? Math.min(240, Math.max(5, Number(durationMatch[1]) * (/час/i.test(durationMatch[2]) ? 60 : 1))) : 30;
    const token = uid('schedule');
    const reply = recurring
      ? 'Готово. Ближайшее выполнение появилось в плане дня, а повторяющееся правило сохранено в базе и не загромождает экран.'
      : 'Готово. Договорённость появилась в плане дня.';
    const statements: D1PreparedStatement[] = [
      db.prepare(`UPDATE actions SET status = 'resolved', confirmed_at = ?, resolved_at = ?, outcome = ?, transition_token = ? WHERE id = ? AND player_id = ? AND status = 'awaiting_confirmation'`).bind(now, now, 'Договорённость добавлена в план дня.', token, action.id, PLAYER_ID),
      db.prepare(`UPDATE action_mechanics SET roll_bp = 0, succeeded = 1, resolved_at = ? WHERE action_id = ? AND EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(now, action.id, action.id, token),
      db.prepare(`INSERT INTO daily_plan_items (id, player_id, action_id, title, details, scheduled_for, start_condition, status, source, created_at, updated_at) SELECT ?, ?, ?, ?, ?, ?, ?, 'planned', 'HOST', ?, ? WHERE EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(uid('plan'), PLAYER_ID, action.id, action.title, scheduleText, scheduledFor, startCondition, now, now, action.id, token),
      db.prepare(`INSERT INTO chat_messages (id, player_id, role, source, body, created_at) SELECT ?, ?, 'host', 'SYSTEM', ?, ? WHERE EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(uid('chat'), PLAYER_ID, reply, now, action.id, token),
    ];
    if (recurring) statements.push(db.prepare(`INSERT OR IGNORE INTO routines (id, player_id, title, schedule_label, duration_minutes, streak, status, skip_next, created_at, updated_at) SELECT ?, ?, ?, ?, ?, 0, 'active', 0, ?, ? WHERE EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(`routine-${action.id}`, PLAYER_ID, action.title, scheduleText, durationMinutes, now, now, action.id, token));
    await db.batch(statements);
    return getGameState();
  }

  if (action.kind === 'challenge') {
    const targetName = typeof payload.targetName === 'string' ? payload.targetName : '';
    const stake = Number(payload.userAmountUsdCents ?? 0);
    const target = await db.prepare('SELECT id FROM players WHERE lower(name) = lower(?) AND id != ? LIMIT 1').bind(targetName, PLAYER_ID).first<{ id: string }>();
    if (!target) throw new DomainError('Участник для вызова не найден', 'TARGET_NOT_FOUND', 404);
    const state = await getGameState();
    if (!Number.isSafeInteger(stake) || stake <= 0 || stake > state.wallet.availableCents) throw new DomainError('Для этой ставки недостаточно свободных денег', 'NOT_ENOUGH_MONEY', 409);
    const token = uid('challenge');
    const outcome = `Вызов отправлен ${targetName}. Ставка ${formatUsd(stake)} зарезервирована; поединок не начнётся без согласия второй стороны.`;
    const results = await db.batch([
      db.prepare(`UPDATE actions SET status = 'resolved', confirmed_at = ?, resolved_at = ?, outcome = ?, transition_token = ? WHERE id = ? AND player_id = ? AND status = 'awaiting_confirmation' AND EXISTS (SELECT 1 FROM wallets w WHERE w.player_id = ? AND w.balance_cents - (SELECT COALESCE(SUM(amount_cents), 0) FROM fund_reservations WHERE player_id = w.player_id AND status = 'held') >= ?)`).bind(now, now, outcome, token, action.id, PLAYER_ID, PLAYER_ID, stake),
      db.prepare(`UPDATE action_mechanics SET roll_bp = 0, succeeded = 1, resolved_at = ? WHERE action_id = ? AND EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(now, action.id, action.id, token),
      db.prepare(`INSERT OR IGNORE INTO fund_reservations (id, player_id, reference_type, reference_id, amount_cents, status, created_at, released_at) SELECT ?, ?, 'challenge', ?, ?, 'held', ?, NULL WHERE EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(uid('reserve'), PLAYER_ID, action.id, stake, now, action.id, token),
      db.prepare(`INSERT INTO notifications (id, player_id, sender_name, category, title, body, status, can_accept, can_reply, payload_json, created_at, updated_at) SELECT ?, ?, ?, 'challenge', 'Вызов на поединок', ?, 'unread', 1, 1, ?, ?, ? WHERE EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(uid('notice'), target.id, state.player.name, `${state.player.name} предлагает поединок. Ставка каждой стороны: ${formatUsd(stake)}.`, JSON.stringify({ actionId: action.id, stakeCents: stake, senderPlayerId: PLAYER_ID }), now, now, action.id, token),
      db.prepare(`INSERT INTO chat_messages (id, player_id, role, source, body, created_at) SELECT ?, ?, 'host', 'SYSTEM', ?, ? WHERE EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(uid('chat'), PLAYER_ID, outcome, now, action.id, token),
    ]);
    if (!results[0].meta.changes) {
      const current = await db.prepare('SELECT status FROM actions WHERE id = ? AND player_id = ?').bind(action.id, PLAYER_ID).first<{ status: ActionStatus }>();
      if (current?.status !== 'resolved') throw new DomainError('Предложение или доступные средства изменились', 'RESOURCES_CHANGED', 409);
    }
    return getGameState();
  }

  const [player, wallet, reserved] = await Promise.all([
    db.prepare('SELECT energy FROM players WHERE id = ?').bind(PLAYER_ID).first<{ energy: number }>(),
    db.prepare('SELECT balance_cents FROM wallets WHERE player_id = ?').bind(PLAYER_ID).first<{ balance_cents: number }>(),
    db.prepare("SELECT COALESCE(SUM(amount_cents), 0) amount FROM fund_reservations WHERE player_id = ? AND status = 'held'").bind(PLAYER_ID).first<{ amount: number }>(),
  ]);
  if (!player || !wallet) throw new DomainError('Ресурсы игрока не найдены', 'STATE_NOT_FOUND', 500);
  if (action.capacity === 'foreground') {
    const occupied = await db.prepare(`SELECT a.title FROM actions a JOIN action_mechanics m ON m.action_id = a.id WHERE a.player_id = ? AND a.status = 'running' AND m.capacity = 'foreground' AND a.id != ? LIMIT 1`).bind(PLAYER_ID, actionId).first<{ title: string }>();
    if (occupied) throw new DomainError(`Персонаж уже занят: ${occupied.title}. Обсуди с Хостом другое время — второе физическое действие сейчас не запустится.`, 'FOREGROUND_CAPACITY_OCCUPIED', 409);
  }
  if (player.energy < action.energy_cost) throw new DomainError('Недостаточно энергии. Хост может обсудить восстановление или другое время.', 'NOT_ENOUGH_ENERGY', 409);
  const available = wallet.balance_cents - Number(reserved?.amount ?? 0);
  if (available < action.cost_cents) throw new DomainError(`Недостаточно свободных денег: доступно ${formatUsd(Math.max(0, available))}.`, 'NOT_ENOUGH_MONEY', 409);
  const dueAt = new Date(Date.now() + Math.max(1, action.duration_seconds) * 1000).toISOString();
  const token = uid('confirm');
  const statements: D1PreparedStatement[] = [
    db.prepare(`UPDATE actions SET status = 'running', confirmed_at = ?, due_at = ?, transition_token = ? WHERE id = ? AND player_id = ? AND status = 'awaiting_confirmation' AND EXISTS (SELECT 1 FROM wallets w WHERE w.player_id = ? AND w.balance_cents - (SELECT COALESCE(SUM(amount_cents), 0) FROM fund_reservations WHERE player_id = w.player_id AND status = 'held') >= ?) AND EXISTS (SELECT 1 FROM players WHERE id = ? AND energy >= ?) AND (? != 'foreground' OR NOT EXISTS (SELECT 1 FROM actions busy JOIN action_mechanics mechanics ON mechanics.action_id = busy.id WHERE busy.player_id = ? AND busy.status = 'running' AND mechanics.capacity = 'foreground' AND busy.id != ?))`).bind(now, dueAt, token, actionId, PLAYER_ID, PLAYER_ID, action.cost_cents, PLAYER_ID, action.energy_cost, action.capacity, PLAYER_ID, actionId),
    db.prepare(`UPDATE wallets SET balance_cents = balance_cents - ? WHERE player_id = ? AND EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(action.cost_cents, PLAYER_ID, actionId, token),
    db.prepare(`UPDATE players SET energy = MAX(0, energy - ?) WHERE id = ? AND EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(action.energy_cost, PLAYER_ID, actionId, token),
    db.prepare(`INSERT INTO daily_plan_items (id, player_id, action_id, title, details, scheduled_for, start_condition, status, source, created_at, updated_at) SELECT ?, ?, ?, ?, ?, ?, 'NOW', 'running', 'HOST', ?, ? WHERE EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(uid('plan'), PLAYER_ID, action.id, action.title, action.description, now, now, now, action.id, token),
    db.prepare(`INSERT INTO domain_events (id, player_id, type, title, body, action_id, created_at) SELECT ?, ?, 'action_started', 'Действие началось', ?, ?, ? WHERE EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(uid('event'), PLAYER_ID, `${action.title} · сервер завершит действие в ${dueAt}.`, actionId, now, actionId, token),
  ];
  if (action.cost_cents > 0) {
    statements.push(
      db.prepare(`INSERT OR IGNORE INTO ledger_entries (id, player_id, title, amount_cents, kind, action_id, created_at) SELECT ?, ?, ?, ?, 'expense', ?, ? WHERE EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(uid('ledger'), PLAYER_ID, `Расход: ${action.title}`, -action.cost_cents, actionId, now, actionId, token),
      ...journalStatements(db, 'expense', actionId, `Расход: ${action.title}`, action.cost_cents, now, token)
    );
  }
  await db.batch(statements);
  const transitioned = await db.prepare('SELECT status FROM actions WHERE id = ? AND player_id = ?').bind(actionId, PLAYER_ID).first<{ status: ActionStatus }>();
  if (transitioned?.status === 'awaiting_confirmation') throw new DomainError('Ресурсы изменились. Обнови предложение и повтори.', 'RESOURCES_CHANGED', 409);
  return getGameState();
}

export async function cancelProposal(actionId: string): Promise<GameState> {
  const db = await ensurePlayer();
  const token = uid('cancel');
  const now = new Date().toISOString();
  await db.batch([
    db.prepare(`UPDATE actions SET status = 'cancelled', transition_token = ? WHERE id = ? AND player_id = ? AND status = 'awaiting_confirmation'`).bind(token, actionId, PLAYER_ID),
    db.prepare(`INSERT INTO domain_events (id, player_id, type, title, body, action_id, created_at) SELECT ?, ?, 'action_cancelled', 'Предложение отклонено', 'Состояние и баланс не изменены.', ?, ? WHERE EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(uid('event'), PLAYER_ID, actionId, now, actionId, token),
  ]);
  return getGameState();
}

export async function createRoutine(input: { title?: unknown; scheduleLabel?: unknown; durationMinutes?: unknown }): Promise<GameState> {
  const db = await ensurePlayer();
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const schedule = typeof input.scheduleLabel === 'string' ? input.scheduleLabel.trim() : '';
  const duration = Number(input.durationMinutes);
  if (title.length < 2 || title.length > 60 || schedule.length < 3 || schedule.length > 100 || !Number.isInteger(duration) || duration < 5 || duration > 240) throw new DomainError('Параметры повторяющегося действия некорректны', 'INVALID_ROUTINE');
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO routines (id, player_id, title, schedule_label, duration_minutes, streak, status, skip_next, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, 'active', 0, ?, ?)`).bind(uid('routine'), PLAYER_ID, title, schedule, duration, now, now).run();
  return getGameState();
}

export async function mutateRoutine(routineId: string, mutation: unknown): Promise<GameState> {
  const db = await ensurePlayer();
  const command = String(mutation);
  if (!['skip', 'pause', 'resume', 'cancel'].includes(command)) throw new DomainError('Неизвестная команда расписания', 'INVALID_ROUTINE_MUTATION');
  const values: Record<string, string> = { skip: 'skip_next = 1', pause: "status = 'paused'", resume: "status = 'active', skip_next = 0", cancel: "status = 'cancelled'" };
  const existing = await db.prepare("SELECT id FROM routines WHERE id = ? AND player_id = ? AND status != 'cancelled'").bind(routineId, PLAYER_ID).first();
  if (!existing) throw new DomainError('Повторяющееся действие не найдено', 'ROUTINE_NOT_FOUND', 404);
  await db.prepare(`UPDATE routines SET ${values[command]}, updated_at = ? WHERE id = ? AND player_id = ?`).bind(new Date().toISOString(), routineId, PLAYER_ID).run();
  return getGameState();
}

export async function updateProfile(input: { name?: unknown; age?: unknown }): Promise<GameState> {
  const db = await ensurePlayer();
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const age = Number(input.age);
  if (name.length < 2 || name.length > 40) throw new DomainError('Имя должно содержать от 2 до 40 символов', 'INVALID_PROFILE_NAME');
  if (!Number.isInteger(age) || age < 14 || age > 120) throw new DomainError('Возраст должен быть от 14 до 120 лет', 'INVALID_PROFILE_AGE');
  const now = new Date().toISOString();
  await db.batch([
    db.prepare('UPDATE players SET name = ? WHERE id = ?').bind(name, PLAYER_ID),
    db.prepare('UPDATE characters SET name = ? WHERE player_id = ?').bind(name, PLAYER_ID),
    db.prepare(`INSERT INTO player_settings (player_id, age, updated_at) VALUES (?, ?, ?) ON CONFLICT(player_id) DO UPDATE SET age = excluded.age, updated_at = excluded.updated_at`).bind(PLAYER_ID, age, now),
    db.prepare(`INSERT INTO domain_events (id, player_id, type, title, body, action_id, created_at) VALUES (?, ?, 'profile_updated', 'Профиль обновлён', ?, NULL, ?)`).bind(uid('event'), PLAYER_ID, `${name}, ${age} лет`, now),
  ]);
  return getGameState();
}

export async function respondNotification(notificationId: string, input: { action?: unknown; reply?: unknown }): Promise<GameState> {
  const db = await ensurePlayer();
  const action = String(input.action ?? 'read');
  const row = await db.prepare('SELECT * FROM notifications WHERE id = ? AND player_id = ?').bind(notificationId, PLAYER_ID).first<Record<string, unknown>>();
  if (!row) throw new DomainError('Уведомление не найдено', 'NOTIFICATION_NOT_FOUND', 404);
  const now = new Date().toISOString();
  if (action === 'read') {
    await db.prepare("UPDATE notifications SET status = CASE WHEN status = 'unread' THEN 'read' ELSE status END, updated_at = ? WHERE id = ?").bind(now, notificationId).run();
  } else if (action === 'accept' || action === 'decline') {
    if (row.status === 'accepted' || row.status === 'declined') return getGameState();
    if (!Boolean(row.can_accept)) throw new DomainError('Для этого уведомления нет такого решения', 'NOTIFICATION_NOT_ACTIONABLE', 409);
    const challenge = action === 'accept' && String(row.category) === 'challenge';
    const reserveId = uid('reserve');
    let stake = 0;
    if (challenge) {
      const payload = safeJson(String(row.payload_json));
      stake = Number(payload.stakeCents ?? 0);
      const state = await getGameState();
      if (!Number.isSafeInteger(stake) || stake <= 0 || stake > state.wallet.availableCents) throw new DomainError(`Для принятия вызова нужно ${formatUsd(stake)}, доступно ${formatUsd(state.wallet.availableCents)}.`, 'NOT_ENOUGH_MONEY', 409);
    }
    const statements = [db.prepare(`UPDATE notifications SET status = ?, can_accept = 0, updated_at = ? WHERE id = ? AND player_id = ? AND can_accept = 1 AND status NOT IN ('accepted', 'declined') AND (? = 0 OR EXISTS (SELECT 1 FROM wallets w WHERE w.player_id = ? AND w.balance_cents - (SELECT COALESCE(SUM(amount_cents), 0) FROM fund_reservations WHERE player_id = w.player_id AND status = 'held') >= ?))`).bind(action === 'accept' ? 'accepted' : 'declined', now, notificationId, PLAYER_ID, challenge ? 1 : 0, PLAYER_ID, stake)];
    if (challenge) statements.push(db.prepare(`INSERT OR IGNORE INTO fund_reservations (id, player_id, reference_type, reference_id, amount_cents, status, created_at, released_at) SELECT ?, ?, 'challenge-response', ?, ?, 'held', ?, NULL WHERE changes() = 1`).bind(reserveId, PLAYER_ID, notificationId, stake, now));
    statements.push(db.prepare(`INSERT INTO chat_messages (id, player_id, role, source, body, created_at) SELECT ?, ?, 'host', 'SYSTEM', ?, ? WHERE ${challenge ? 'EXISTS (SELECT 1 FROM fund_reservations WHERE id = ?)' : 'changes() = 1'}`).bind(uid('chat'), PLAYER_ID, action === 'accept' ? 'Решение принято и сохранено. Сервер проверил доступные ресурсы.' : 'Предложение отклонено. Деньги и состояние не изменились.', now, ...(challenge ? [reserveId] : [])));
    const results = await db.batch(statements);
    if (!results[0].meta.changes) throw new DomainError('Решение или доступные средства изменились', 'RESOURCES_CHANGED', 409);
  } else if (action === 'reply') {
    const reply = typeof input.reply === 'string' ? input.reply.trim() : '';
    if (!Boolean(row.can_reply) || !reply || reply.length > 500) throw new DomainError('Ответ должен содержать от 1 до 500 символов', 'INVALID_NOTIFICATION_REPLY');
    await db.batch([
      db.prepare("UPDATE notifications SET status = CASE WHEN status IN ('accepted', 'declined') THEN status ELSE 'replied' END, updated_at = ? WHERE id = ? AND player_id = ? AND can_reply = 1").bind(now, notificationId, PLAYER_ID),
      db.prepare(`INSERT INTO chat_messages (id, player_id, role, source, body, created_at) SELECT ?, ?, 'player', 'INBOX', ?, ? WHERE changes() = 1`).bind(uid('chat'), PLAYER_ID, `Ответ для ${String(row.sender_name)}: ${reply}`, now),
      db.prepare(`INSERT INTO chat_messages (id, player_id, role, source, body, created_at) SELECT ?, ?, 'host', 'SYSTEM', 'Ответ сохранён. Если отправитель — NPC, его следующая реакция будет рассчитана из роли и доступного контекста.', ? WHERE changes() = 1`).bind(uid('chat'), PLAYER_ID, now),
    ]);
  } else throw new DomainError('Неизвестная команда уведомления', 'INVALID_NOTIFICATION_ACTION');
  return getGameState();
}

function inferScheduledTime(text: string): string | null {
  const match = text.match(/(?:в|на)\s*(\d{1,2})(?::(\d{2}))?/i);
  if (!match) return null;
  const hour = Math.min(23, Number(match[1]));
  const minute = Math.min(59, Number(match[2] ?? 0));
  const now = new Date();
  const tashkentOffsetMs = 5 * 60 * 60 * 1000;
  const local = new Date(now.getTime() + tashkentOffsetMs);
  const utc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hour - 5, minute, 0);
  const candidate = new Date(utc);
  if (candidate.getTime() <= now.getTime()) candidate.setUTCDate(candidate.getUTCDate() + 1);
  return candidate.toISOString();
}

function calculateProbability(definition: ActionDefinition, intelligence: number, health: number, fatigue: number): number {
  if (definition.resolutionMode === 'deterministic') return 10000;
  const stateModifier = (intelligence - 50) * 5 + (health - 50) * 3 - fatigue * 4;
  return Math.max(500, Math.min(9900, definition.baseProbabilityBp + stateModifier));
}

function journalStatements(db: D1Database, referenceType: 'expense' | 'reward', actionId: string, title: string, amountCents: number, now: string, transitionToken: string): D1PreparedStatement[] {
  const journalId = `journal-${referenceType}-${actionId}`;
  const debitAccount = referenceType === 'expense' ? 'account-world-services' : 'account-alex-cash';
  const creditAccount = referenceType === 'expense' ? 'account-alex-cash' : 'account-world-rewards';
  return [
    db.prepare(`INSERT OR IGNORE INTO journal_entries (id, reference_type, reference_id, title, created_at) SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM actions WHERE id = ? AND transition_token = ?)`).bind(journalId, referenceType, actionId, title, now, actionId, transitionToken),
    db.prepare(`INSERT OR IGNORE INTO journal_postings (id, journal_entry_id, account_id, side, amount_cents, created_at) VALUES (?, ?, ?, 'debit', ?, ?)`).bind(`posting-${referenceType}-debit-${actionId}`, journalId, debitAccount, amountCents, now),
    db.prepare(`INSERT OR IGNORE INTO journal_postings (id, journal_entry_id, account_id, side, amount_cents, created_at) VALUES (?, ?, ?, 'credit', ?, ?)`).bind(`posting-${referenceType}-credit-${actionId}`, journalId, creditAccount, amountCents, now),
  ];
}

async function seededRollBp(seed: string): Promise<number> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
  return new DataView(digest).getUint32(0, false) % 10000;
}
