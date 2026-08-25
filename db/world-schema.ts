export const WORLD_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL UNIQUE REFERENCES players(id),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    morale INTEGER NOT NULL CHECK (morale BETWEEN 0 AND 100),
    stress INTEGER NOT NULL CHECK (stress BETWEEN 0 AND 100),
    confidence INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
    fatigue INTEGER NOT NULL CHECK (fatigue BETWEEN 0 AND 100),
    biography TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS action_mechanics (
    action_id TEXT PRIMARY KEY REFERENCES actions(id),
    difficulty_label TEXT NOT NULL,
    capacity TEXT NOT NULL,
    probability_bp INTEGER NOT NULL CHECK (probability_bp BETWEEN 0 AND 10000),
    rng_seed TEXT NOT NULL,
    roll_bp INTEGER,
    succeeded INTEGER,
    resolved_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS action_targets (
    action_id TEXT PRIMARY KEY REFERENCES actions(id),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('location')),
    entity_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ledger_accounts (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    currency TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    reference_type TEXT NOT NULL,
    reference_id TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(reference_type, reference_id)
  )`,
  `CREATE TABLE IF NOT EXISTS journal_postings (
    id TEXT PRIMARY KEY,
    journal_entry_id TEXT NOT NULL REFERENCES journal_entries(id),
    account_id TEXT NOT NULL REFERENCES ledger_accounts(id),
    side TEXT NOT NULL CHECK (side IN ('debit', 'credit')),
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    parent_id TEXT,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    note TEXT NOT NULL,
    risk_label TEXT NOT NULL,
    travel_cost_cents INTEGER NOT NULL DEFAULT 0,
    travel_minutes INTEGER NOT NULL DEFAULT 0,
    map_x REAL NOT NULL,
    map_y REAL NOT NULL,
    glyph TEXT NOT NULL,
    action_kind TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS character_locations (
    character_id TEXT PRIMARY KEY REFERENCES characters(id),
    location_id TEXT NOT NULL REFERENCES locations(id),
    visited_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL REFERENCES characters(id),
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    competence INTEGER NOT NULL CHECK (competence BETWEEN 0 AND 100),
    evidence_count INTEGER NOT NULL DEFAULT 0,
    UNIQUE(character_id, name)
  )`,
  `CREATE TABLE IF NOT EXISTS experience_events (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL REFERENCES characters(id),
    domain TEXT NOT NULL,
    title TEXT NOT NULL,
    outcome TEXT NOT NULL,
    complexity TEXT NOT NULL,
    occurred_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS credentials (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL REFERENCES characters(id),
    title TEXT NOT NULL,
    issuer TEXT NOT NULL,
    progress INTEGER NOT NULL CHECK (progress BETWEEN 0 AND 100),
    status TEXT NOT NULL,
    issued_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL REFERENCES characters(id),
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    title TEXT NOT NULL,
    kind TEXT NOT NULL,
    estimated_value_cents INTEGER NOT NULL,
    liquidation_value_cents INTEGER NOT NULL,
    location_name TEXT NOT NULL,
    valuation_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    cash_cents INTEGER NOT NULL,
    monthly_revenue_cents INTEGER NOT NULL,
    monthly_profit_cents INTEGER NOT NULL,
    members INTEGER NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS organization_memberships (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    character_id TEXT NOT NULL REFERENCES characters(id),
    role TEXT NOT NULL,
    permissions_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(organization_id, character_id)
  )`,
  `CREATE TABLE IF NOT EXISTS ownership_stakes (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    owner_id TEXT NOT NULL,
    basis_points INTEGER NOT NULL CHECK (basis_points BETWEEN 0 AND 10000),
    created_at TEXT NOT NULL,
    UNIQUE(organization_id, owner_id)
  )`,
  `CREATE TABLE IF NOT EXISTS relationships (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL REFERENCES characters(id),
    target_name TEXT NOT NULL,
    trust INTEGER NOT NULL,
    respect INTEGER NOT NULL,
    affection INTEGER NOT NULL,
    resentment INTEGER NOT NULL,
    UNIQUE(character_id, target_name)
  )`,
  `CREATE TABLE IF NOT EXISTS reputation_scores (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL REFERENCES characters(id),
    domain TEXT NOT NULL,
    value INTEGER NOT NULL,
    visibility TEXT NOT NULL,
    UNIQUE(character_id, domain)
  )`,
  `CREATE TABLE IF NOT EXISTS world_events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    scope TEXT NOT NULL,
    visibility TEXT NOT NULL,
    happened_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS markets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location_id TEXT NOT NULL REFERENCES locations(id),
    demand TEXT NOT NULL,
    competition TEXT NOT NULL,
    trend INTEGER NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL REFERENCES characters(id),
    organization_id TEXT,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    monthly_amount_cents INTEGER NOT NULL,
    daily_amount_cents INTEGER NOT NULL,
    performance TEXT NOT NULL,
    next_due_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS story_threads (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL REFERENCES characters(id),
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    tension INTEGER NOT NULL CHECK (tension BETWEEN 0 AND 100),
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL REFERENCES characters(id),
    title TEXT NOT NULL,
    stage TEXT NOT NULL,
    visibility TEXT NOT NULL,
    status TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS knowledge_records (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL REFERENCES characters(id),
    subject TEXT NOT NULL,
    statement TEXT NOT NULL,
    confidence INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
    freshness_at TEXT NOT NULL,
    visibility TEXT NOT NULL,
    source TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY,
    speaker_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    statement TEXT NOT NULL,
    truth_status TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS component_definitions (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    json_schema TEXT NOT NULL,
    ui_schema TEXT NOT NULL,
    version INTEGER NOT NULL,
    status TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS entity_components (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    definition_id TEXT NOT NULL REFERENCES component_definitions(id),
    data_json TEXT NOT NULL,
    version INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(entity_id, definition_id)
  )`,
  `CREATE TABLE IF NOT EXISTS capability_gaps (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    fingerprint TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    severity TEXT NOT NULL,
    occurrences INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS agent_runs (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL REFERENCES players(id),
    role TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    provider TEXT NOT NULL,
    skill_keys TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL REFERENCES players(id),
    role TEXT NOT NULL,
    source TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS player_settings (
    player_id TEXT PRIMARY KEY REFERENCES players(id),
    age INTEGER CHECK (age IS NULL OR age BETWEEN 14 AND 120),
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS character_conditions (
    character_id TEXT PRIMARY KEY REFERENCES characters(id),
    strength INTEGER NOT NULL CHECK (strength BETWEEN 0 AND 100),
    intelligence INTEGER NOT NULL CHECK (intelligence BETWEEN 0 AND 100),
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS action_effects (
    action_id TEXT PRIMARY KEY REFERENCES actions(id),
    resolution_mode TEXT NOT NULL,
    energy_delta INTEGER NOT NULL DEFAULT 0,
    health_delta INTEGER NOT NULL DEFAULT 0,
    strength_delta INTEGER NOT NULL DEFAULT 0,
    intelligence_delta INTEGER NOT NULL DEFAULT 0,
    morale_delta INTEGER NOT NULL DEFAULT 0,
    confidence_delta INTEGER NOT NULL DEFAULT 0,
    fatigue_delta INTEGER NOT NULL DEFAULT 0,
    skill_name TEXT,
    skill_domain TEXT,
    summary TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS action_payloads (
    action_id TEXT PRIMARY KEY REFERENCES actions(id),
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS chat_action_links (
    message_id TEXT PRIMARY KEY REFERENCES chat_messages(id),
    action_id TEXT NOT NULL REFERENCES actions(id)
  )`,
  `CREATE TABLE IF NOT EXISTS daily_plan_items (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL REFERENCES players(id),
    action_id TEXT,
    title TEXT NOT NULL,
    details TEXT NOT NULL,
    scheduled_for TEXT,
    start_condition TEXT NOT NULL DEFAULT 'WHEN_FREE',
    status TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL REFERENCES players(id),
    sender_name TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unread',
    can_accept INTEGER NOT NULL DEFAULT 0,
    can_reply INTEGER NOT NULL DEFAULT 0,
    payload_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS fund_reservations (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL REFERENCES players(id),
    reference_type TEXT NOT NULL,
    reference_id TEXT NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    released_at TEXT,
    UNIQUE(reference_type, reference_id, player_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_plan_player_time
    ON daily_plan_items(player_id, scheduled_for, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_player_status
    ON notifications(player_id, status, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_reservations_player_status
    ON fund_reservations(player_id, status)`,  `CREATE INDEX IF NOT EXISTS idx_experience_character_time
    ON experience_events(character_id, occurred_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_assets_owner
    ON assets(owner_id, kind)`,
  `CREATE INDEX IF NOT EXISTS idx_world_events_time
    ON world_events(happened_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_chat_player_time
    ON chat_messages(player_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_action_targets_entity
    ON action_targets(entity_type, entity_id)`,
  `CREATE INDEX IF NOT EXISTS idx_journal_postings_entry
    ON journal_postings(journal_entry_id)`,
] as const;
