import type {
  AssetState,
  CaseState,
  CharacterState,
  CredentialState,
  EmploymentState,
  ExperienceState,
  HostMessageState,
  LocationState,
  MarketState,
  OrganizationState,
  ProfileState,
  RelationshipState,
  ReputationState,
  SkillState,
  StoryThreadState,
  WorldEventState,
  WorldPlayerState,
  WorldState,
} from '@/lib/game-types';

export const CHARACTER_ID = 'character-alex';

export async function seedExtendedWorld(db: D1Database, playerId: string, now: string): Promise<void> {
  await db.batch([
    ...companionIdentitySeeds(db, now),
    db.prepare(`INSERT OR IGNORE INTO characters
      (id, player_id, name, status, morale, stress, confidence, fatigue, biography, created_at)
      VALUES (?, ?, 'Алекс', 'active', 68, 27, 61, 18,
      'Начал путь в Ташкенте с продакт-опытом, небольшим капиталом и желанием построить что-то своё.', ?)`)
      .bind(CHARACTER_ID, playerId, now),
    db.prepare(`INSERT OR IGNORE INTO ledger_accounts
      (id, owner_id, name, kind, currency, created_at) VALUES
      ('account-alex-cash', ?, 'Деньги Алекса', 'asset', 'UZS', ?)`).bind(playerId, now),
    db.prepare(`INSERT OR IGNORE INTO ledger_accounts
      (id, owner_id, name, kind, currency, created_at) VALUES
      ('account-world-opening', 'world', 'Стартовый капитал мира', 'equity', 'UZS', ?)`).bind(now),
    db.prepare(`INSERT OR IGNORE INTO ledger_accounts
      (id, owner_id, name, kind, currency, created_at) VALUES
      ('account-world-services', 'world', 'Услуги мира', 'income', 'UZS', ?)`).bind(now),
    db.prepare(`INSERT OR IGNORE INTO ledger_accounts
      (id, owner_id, name, kind, currency, created_at) VALUES
      ('account-world-rewards', 'world', 'Награды мира', 'expense', 'UZS', ?)`).bind(now),
    db.prepare(`INSERT OR IGNORE INTO journal_entries
      (id, reference_type, reference_id, title, created_at)
      VALUES ('journal-opening', 'opening', ?, 'Стартовый баланс', ?)`).bind(playerId, now),
    db.prepare(`INSERT OR IGNORE INTO journal_postings
      (id, journal_entry_id, account_id, side, amount_cents, created_at)
      VALUES ('posting-opening-debit', 'journal-opening', 'account-alex-cash', 'debit', 2468000000, ?)`).bind(now),
    db.prepare(`INSERT OR IGNORE INTO journal_postings
      (id, journal_entry_id, account_id, side, amount_cents, created_at)
      VALUES ('posting-opening-credit', 'journal-opening', 'account-world-opening', 'credit', 2468000000, ?)`).bind(now),
    ...locationSeeds(db),
    ...companionLocationSeeds(db, now),
    db.prepare(`INSERT OR IGNORE INTO character_locations
      (character_id, location_id, visited_json, updated_at)
      VALUES (?, 'place-home', '["place-home","district-home"]', ?)`).bind(CHARACTER_ID, now),
    db.prepare(`INSERT OR IGNORE INTO skills
      (id, character_id, name, domain, competence, evidence_count) VALUES
      ('skill-product', ?, 'Продуктовое мышление', 'Технологии', 64, 7),
      ('skill-negotiation', ?, 'Переговоры', 'Социальное', 43, 4),
      ('skill-fitness', ?, 'Физическая подготовка', 'Здоровье', 31, 5)`)
      .bind(CHARACTER_ID, CHARACTER_ID, CHARACTER_ID),
    db.prepare(`INSERT OR IGNORE INTO experience_events
      (id, character_id, domain, title, outcome, complexity, occurred_at) VALUES
      ('exp-launch', ?, 'Предпринимательство', 'Первый запуск продукта', 'mixed', 'высокая', ?),
      ('exp-team', ?, 'Управление', 'Координация команды из восьми человек', 'success', 'средняя', ?),
      ('exp-failure', ?, 'Предпринимательство', 'Неудачная проверка рынка', 'failure', 'средняя', ?)`)
      .bind(CHARACTER_ID, now, CHARACTER_ID, now, CHARACTER_ID, now),
    db.prepare(`INSERT OR IGNORE INTO credentials
      (id, character_id, title, issuer, progress, status, issued_at) VALUES
      ('credential-economics', ?, 'Поведенческая экономика', 'Городская школа', 42, 'active', NULL),
      ('credential-product', ?, 'Основы продуктовой аналитики', 'Nomad Academy', 100, 'completed', ?)`)
      .bind(CHARACTER_ID, CHARACTER_ID, now),
    db.prepare(`INSERT OR IGNORE INTO goals
      (id, character_id, title, status, created_at) VALUES
      ('goal-studio', ?, 'Построить устойчивую продуктовую студию', 'active', ?)`)
      .bind(CHARACTER_ID, now),
    db.prepare(`INSERT OR IGNORE INTO assets
      (id, owner_id, title, kind, estimated_value_cents, liquidation_value_cents, location_name, valuation_at) VALUES
      ('asset-phone', ?, 'Смартфон', 'inventory', 62000000, 48000000, 'При себе', ?),
      ('asset-flat', ?, 'Квартира в Ташкенте', 'property', 7420000000, 6810000000, 'Мой квартал', ?),
      ('asset-bike', ?, 'Городской велосипед', 'vehicle', 41000000, 29000000, 'Дом Алекса', ?),
      ('asset-equity', ?, 'Доля в Nomad Labs', 'equity', 4240000000, 3600000000, 'Nomad Labs', ?)`)
      .bind(CHARACTER_ID, now, CHARACTER_ID, now, CHARACTER_ID, now, CHARACTER_ID, now),
    db.prepare(`INSERT OR IGNORE INTO organizations
      (id, name, kind, cash_cents, monthly_revenue_cents, monthly_profit_cents, members, created_at)
      VALUES ('org-nomad', 'Nomad Labs', 'Продуктовая студия', 2468000000, 8642000000, 2135000000, 8, ?)`)
      .bind(now),
    db.prepare(`INSERT OR IGNORE INTO organization_memberships
      (id, organization_id, character_id, role, permissions_json, created_at)
      VALUES ('member-alex-nomad', 'org-nomad', ?, 'Сооснователь', '["projects","ordinary_contracts"]', ?)`)
      .bind(CHARACTER_ID, now),
    db.prepare(`INSERT OR IGNORE INTO ownership_stakes
      (id, organization_id, owner_id, basis_points, created_at)
      VALUES ('stake-alex-nomad', 'org-nomad', ?, 3420, ?)`).bind(CHARACTER_ID, now),
    db.prepare(`INSERT OR IGNORE INTO relationships
      (id, character_id, target_name, trust, respect, affection, resentment) VALUES
      ('rel-timur', ?, 'Тимур', 72, 68, 61, 8),
      ('rel-dina', ?, 'Дина', 54, 79, 42, 3),
      ('rel-host', ?, 'Хост', 83, 71, 34, 0)`)
      .bind(CHARACTER_ID, CHARACTER_ID, CHARACTER_ID),
    db.prepare(`INSERT OR IGNORE INTO reputation_scores
      (id, character_id, domain, value, visibility) VALUES
      ('rep-public', ?, 'Публичная', 38, 'public'),
      ('rep-business', ?, 'Деловая', 57, 'public'),
      ('rep-reliability', ?, 'Надёжность', 62, 'private'),
      ('rep-underground', ?, 'Теневая', 4, 'hidden')`)
      .bind(CHARACTER_ID, CHARACTER_ID, CHARACTER_ID, CHARACTER_ID),
    db.prepare(`INSERT OR IGNORE INTO world_events
      (id, title, summary, scope, visibility, happened_at) VALUES
      ('world-market', 'В центре вырос спрос на небольшие цифровые сервисы',
      'Компании ищут команды, способные быстро проверять продуктовые идеи.', 'город', 'public', ?),
      ('world-rent', 'Аренда мастерских в старом городе снизилась',
      'Свободных помещений стало больше, но трафик остаётся нестабильным.', 'район', 'public', ?)`)
      .bind(now, now),
    db.prepare(`INSERT OR IGNORE INTO markets
      (id, name, location_id, demand, competition, trend, updated_at) VALUES
      ('market-tools', 'Инструменты для команд', 'district-center', 'Высокий', 'Высокая', 6, ?),
      ('market-education', 'Практическое образование', 'district-old', 'Средний', 'Средняя', 2, ?)`)
      .bind(now, now),
    db.prepare(`INSERT OR IGNORE INTO contracts
      (id, character_id, organization_id, kind, title, status, monthly_amount_cents,
       daily_amount_cents, performance, next_due_at, created_at)
      VALUES ('employment-nomad', ?, 'org-nomad', 'employment', 'Продакт-менеджер',
      'active', 934000000, 31130000, 'Стабильно', ?, ?)`)
      .bind(CHARACTER_ID, new Date(Date.now() + 86_400_000).toISOString(), now),
    db.prepare(`INSERT OR IGNORE INTO story_threads
      (id, character_id, title, status, tension, updated_at) VALUES
      ('thread-studio', ?, 'Станет ли Nomad Labs устойчивой студией?', 'active', 41, ?),
      ('thread-partner', ?, 'Неоконченный разговор с Тимуром о партнёрстве', 'active', 23, ?)`)
      .bind(CHARACTER_ID, now, CHARACTER_ID, now),
    db.prepare(`INSERT OR IGNORE INTO chat_messages
      (id, player_id, role, source, body, created_at) VALUES
      ('chat-host-welcome', ?, 'host', 'WEB',
      'Я рядом. Ты выбираешь направление, а сервер честно считает цену, время и последствия.', ?)`)
      .bind(playerId, now),
    db.prepare(`INSERT OR IGNORE INTO component_definitions
      (id, key, name, json_schema, ui_schema, version, status) VALUES
      ('component-portfolio', 'financial_portfolio', 'Инвестиционный портфель',
      '{"type":"object","properties":{"positions":{"type":"array"}}}',
      '{"section":"finance","renderer":"generic"}', 1, 'active')`),
    db.prepare(`INSERT OR IGNORE INTO action_mechanics
      (action_id, difficulty_label, capacity, probability_bp, rng_seed, roll_bp, succeeded, resolved_at)
      SELECT id, 'Обычная',
        CASE WHEN kind IN ('study', 'meditation') THEN 'background' ELSE 'foreground' END,
        9000, id, NULL, NULL, NULL
      FROM actions`),
  ]);
}

function companionIdentitySeeds(db: D1Database, now: string): D1PreparedStatement[] {
  return [
    db.prepare(`INSERT OR IGNORE INTO players
      (id, name, city, role, energy, health, focus, reputation, created_at) VALUES
      ('demo-timur', 'Тимур', 'Ташкент', 'Операционный менеджер', 76, 81, 58, 44, ?),
      ('demo-dina', 'Дина', 'Ташкент', 'Исследовательница', 69, 88, 79, 51, ?),
      ('demo-ruslan', 'Руслан', 'Ташкент', 'Инженер', 84, 77, 63, 35, ?)`)
      .bind(now, now, now),
    db.prepare(`INSERT OR IGNORE INTO wallets (player_id, balance_cents, currency) VALUES
      ('demo-timur', 1820000000, 'UZS'),
      ('demo-dina', 1340000000, 'UZS'),
      ('demo-ruslan', 960000000, 'UZS')`),
    db.prepare(`INSERT OR IGNORE INTO characters
      (id, player_id, name, status, morale, stress, confidence, fatigue, biography, created_at) VALUES
      ('character-timur', 'demo-timur', 'Тимур', 'active', 71, 31, 66, 24,
       'Развивает операционные проекты и ищет устойчивые партнёрства.', ?),
      ('character-dina', 'demo-dina', 'Дина', 'active', 77, 19, 58, 16,
       'Собирает знания о рынках и городских возможностях.', ?),
      ('character-ruslan', 'demo-ruslan', 'Руслан', 'active', 64, 22, 72, 27,
       'Строит технические решения и предпочитает проверять идеи делом.', ?)`)
      .bind(now, now, now),
  ];
}

function companionLocationSeeds(db: D1Database, now: string): D1PreparedStatement[] {
  return [
    db.prepare(`INSERT OR IGNORE INTO character_locations
      (character_id, location_id, visited_json, updated_at) VALUES
      ('character-timur', 'place-studio', '["place-studio","district-center"]', ?),
      ('character-dina', 'place-study', '["place-study","district-old"]', ?),
      ('character-ruslan', 'place-gym', '["place-gym","district-home"]', ?)`)
      .bind(now, now, now),
  ];
}
function locationSeeds(db: D1Database): D1PreparedStatement[] {
  const rows = [
    ['city-tashkent', null, 'Ташкент', 'city', 'Общий городской слой мира.', 'Низкий', 0, 0, 50, 50, 'Т', 'travel', 0],
    ['place-home', 'district-home', 'Дом Алекса', 'place', 'Восстановиться и разобрать планы.', 'Знакомо', 0, 0, 49, 58, '⌂', 'meditation', 1],
    ['place-studio', 'district-center', 'Nomad Labs', 'place', 'Контракты, команда и проекты.', 'Низкий', 0, 5, 73, 36, 'N', 'work', 2],
    ['place-gym', 'district-home', 'Спортплощадка', 'place', 'Тренировка и здоровье.', 'Низкий', 18000000, 5, 23, 65, '↟', 'training', 3],
    ['place-study', 'district-old', 'Чайхана-клуб', 'place', 'Учёба, встречи и знания.', 'Низкий', 0, 5, 27, 34, '✦', 'study', 4],
    ['district-home', 'city-tashkent', 'Мой квартал', 'district', 'Дом, друзья и привычные маршруты.', 'Знакомо', 0, 0, 14, 71, '⌂', 'travel', 10],
    ['district-center', 'city-tashkent', 'Центр', 'district', 'Работа, встречи и деловые связи.', 'Низкий', 128000000, 5, 32, 52, '2', 'travel', 11],
    ['district-old', 'city-tashkent', 'Старый город', 'district', 'Ремесло, история и новые знакомства.', 'Средний', 128000000, 5, 52, 66, '3', 'travel', 12],
    ['district-sergeli', 'city-tashkent', 'Сергели', 'district', 'Растущий район и новые возможности.', 'Средний', 128000000, 5, 67, 39, '4', 'travel', 13],
    ['district-chimgan', 'city-tashkent', 'Чимган', 'region', 'Дальний маршрут и восстановление.', 'Высокий', 128000000, 5, 85, 20, '5', 'travel', 14],
  ] as const;
  const inserts = rows.map((row) => db.prepare(`INSERT OR IGNORE INTO locations
    (id, parent_id, name, kind, note, risk_label, travel_cost_cents, travel_minutes,
     map_x, map_y, glyph, action_kind, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(...row));
  return [...inserts, db.prepare(`UPDATE locations SET parent_id = CASE id
    WHEN 'place-home' THEN 'district-home'
    WHEN 'place-studio' THEN 'district-center'
    WHEN 'place-gym' THEN 'district-home'
    WHEN 'place-study' THEN 'district-old'
    ELSE parent_id END
    WHERE id IN ('place-home', 'place-studio', 'place-gym', 'place-study')`)];
}

export async function getExtendedState(db: D1Database, playerId: string): Promise<{
  character: CharacterState;
  world: WorldState;
  profile: ProfileState;
  hostMessages: HostMessageState[];
}> {
  const [
    character,
    currentLocation,
    locations,
    worldPlayers,
    skills,
    experience,
    credentials,
    assets,
    organizations,
    relationships,
    reputations,
    goals,
    worldEvents,
    markets,
    employment,
    storyThreads,
    cases,
    hostMessages,
  ] = await Promise.all([
    db.prepare('SELECT * FROM characters WHERE player_id = ?').bind(playerId).first<Record<string, unknown>>(),
    db.prepare('SELECT * FROM character_locations WHERE character_id = ?').bind(CHARACTER_ID).first<Record<string, unknown>>(),
    db.prepare('SELECT * FROM locations ORDER BY sort_order ASC').all<Record<string, unknown>>(),
    db.prepare(`SELECT p.id player_id, p.name, p.role, c.status, cl.location_id,
      CASE WHEN l.kind = 'place' THEN l.parent_id ELSE l.id END map_location_id
      FROM players p
      JOIN characters c ON c.player_id = p.id
      JOIN character_locations cl ON cl.character_id = c.id
      JOIN locations l ON l.id = cl.location_id
      ORDER BY p.created_at ASC`).all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM skills WHERE character_id = ? ORDER BY competence DESC').bind(CHARACTER_ID).all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM experience_events WHERE character_id = ? ORDER BY occurred_at DESC').bind(CHARACTER_ID).all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM credentials WHERE character_id = ? ORDER BY status ASC, progress DESC').bind(CHARACTER_ID).all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM assets WHERE owner_id = ? ORDER BY estimated_value_cents DESC').bind(CHARACTER_ID).all<Record<string, unknown>>(),
    db.prepare(`SELECT o.*, m.role, s.basis_points FROM organizations o
      JOIN organization_memberships m ON m.organization_id = o.id
      JOIN ownership_stakes s ON s.organization_id = o.id AND s.owner_id = m.character_id
      WHERE m.character_id = ?`).bind(CHARACTER_ID).all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM relationships WHERE character_id = ? ORDER BY trust DESC').bind(CHARACTER_ID).all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM reputation_scores WHERE character_id = ? ORDER BY value DESC').bind(CHARACTER_ID).all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM goals WHERE character_id = ? AND status = ?').bind(CHARACTER_ID, 'active').all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM world_events WHERE visibility = 'public' ORDER BY happened_at DESC LIMIT 8").all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM markets ORDER BY trend DESC').all<Record<string, unknown>>(),
    db.prepare("SELECT c.*, o.name organization_name FROM contracts c LEFT JOIN organizations o ON o.id = c.organization_id WHERE c.character_id = ? AND c.kind = 'employment' AND c.status = 'active' LIMIT 1").bind(CHARACTER_ID).first<Record<string, unknown>>(),
    db.prepare('SELECT * FROM story_threads WHERE character_id = ? ORDER BY tension DESC').bind(CHARACTER_ID).all<Record<string, unknown>>(),
    db.prepare("SELECT * FROM cases WHERE character_id = ? AND status = 'active' ORDER BY updated_at DESC").bind(CHARACTER_ID).all<Record<string, unknown>>(),
    db.prepare('SELECT * FROM chat_messages WHERE player_id = ? ORDER BY created_at DESC LIMIT 12').bind(playerId).all<Record<string, unknown>>(),
  ]);

  if (!character || !currentLocation) throw new Error('Расширенное состояние персонажа не создано');
  const visited = new Set(JSON.parse(String(currentLocation.visited_json)) as string[]);
  const playerColors: Record<string, WorldPlayerState['color']> = {
    'demo-alex': 'lime',
    'demo-timur': 'coral',
    'demo-dina': 'violet',
    'demo-ruslan': 'amber',
  };

  return {
    character: {
      id: String(character.id),
      name: String(character.name),
      status: character.status as CharacterState['status'],
      morale: Number(character.morale),
      stress: Number(character.stress),
      confidence: Number(character.confidence),
      fatigue: Number(character.fatigue),
      biography: String(character.biography),
    },
    world: {
      currentLocationId: String(currentLocation.location_id),
      locations: locations.results.map((row): LocationState => ({
        id: String(row.id),
        name: String(row.name),
        kind: row.kind as LocationState['kind'],
        note: String(row.note),
        riskLabel: String(row.risk_label),
        travelCostCents: Number(row.travel_cost_cents),
        travelMinutes: Number(row.travel_minutes),
        x: Number(row.map_x),
        y: Number(row.map_y),
        glyph: String(row.glyph),
        actionKind: row.action_kind as LocationState['actionKind'],
        visited: visited.has(String(row.id)),
      })),
      players: worldPlayers.results.map((row): WorldPlayerState => ({
        id: String(row.player_id),
        name: String(row.name),
        role: String(row.role),
        color: playerColors[String(row.player_id)] ?? 'amber',
        locationId: String(row.location_id),
        mapLocationId: String(row.map_location_id),
        status: row.status as WorldPlayerState['status'],
        isCurrent: String(row.player_id) === playerId,
      })),
      events: worldEvents.results.map((row): WorldEventState => ({
        id: String(row.id),
        title: String(row.title),
        summary: String(row.summary),
        scope: String(row.scope),
        happenedAt: String(row.happened_at),
      })),
      markets: markets.results.map((row): MarketState => ({
        id: String(row.id),
        name: String(row.name),
        demand: String(row.demand),
        competition: String(row.competition),
        trend: Number(row.trend),
      })),
    },
    profile: {
      skills: skills.results.map((row): SkillState => ({ id: String(row.id), name: String(row.name), domain: String(row.domain), competence: Number(row.competence), evidenceCount: Number(row.evidence_count) })),
      experience: experience.results.map((row): ExperienceState => ({ id: String(row.id), domain: String(row.domain), title: String(row.title), outcome: row.outcome as ExperienceState['outcome'], complexity: String(row.complexity), occurredAt: String(row.occurred_at) })),
      credentials: credentials.results.map((row): CredentialState => ({ id: String(row.id), title: String(row.title), issuer: String(row.issuer), progress: Number(row.progress), status: row.status as CredentialState['status'] })),
      assets: assets.results.map((row): AssetState => ({ id: String(row.id), title: String(row.title), kind: row.kind as AssetState['kind'], estimatedValueCents: Number(row.estimated_value_cents), liquidationValueCents: Number(row.liquidation_value_cents), locationName: String(row.location_name) })),
      organizations: organizations.results.map((row): OrganizationState => ({ id: String(row.id), name: String(row.name), kind: String(row.kind), role: String(row.role), ownershipPercent: Number(row.basis_points) / 100, cashCents: Number(row.cash_cents), monthlyRevenueCents: Number(row.monthly_revenue_cents), monthlyProfitCents: Number(row.monthly_profit_cents), members: Number(row.members) })),
      relationships: relationships.results.map((row): RelationshipState => ({ id: String(row.id), name: String(row.target_name), trust: Number(row.trust), respect: Number(row.respect), affection: Number(row.affection), resentment: Number(row.resentment) })),
      reputations: reputations.results.map((row): ReputationState => ({ domain: String(row.domain), value: Number(row.value), visibility: row.visibility as ReputationState['visibility'] })),
      goals: goals.results.map((row) => ({ id: String(row.id), title: String(row.title), status: row.status as 'active', createdAt: String(row.created_at) })),
      storyThreads: storyThreads.results.map((row): StoryThreadState => ({ id: String(row.id), title: String(row.title), status: String(row.status), tension: Number(row.tension) })),
      employment: employment ? {
        organization: String(employment.organization_name),
        title: String(employment.title),
        monthlySalaryCents: Number(employment.monthly_amount_cents),
        dailyPayoutCents: Number(employment.daily_amount_cents),
        performance: String(employment.performance),
        nextSession: String(employment.next_due_at),
      } satisfies EmploymentState : null,
      cases: cases.results.map((row): CaseState => ({ id: String(row.id), title: String(row.title), stage: String(row.stage), visibility: String(row.visibility) })),
    },
    hostMessages: hostMessages.results.reverse().map((row): HostMessageState => ({
      id: String(row.id),
      role: row.role as HostMessageState['role'],
      body: String(row.body),
      createdAt: String(row.created_at),
    })),
  };
}
