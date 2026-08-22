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
  `CREATE INDEX IF NOT EXISTS idx_experience_character_time
    ON experience_events(character_id, occurred_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_assets_owner
    ON assets(owner_id, kind)`,
  `CREATE INDEX IF NOT EXISTS idx_world_events_time
    ON world_events(happened_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_chat_player_time
    ON chat_messages(player_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_journal_postings_entry
    ON journal_postings(journal_entry_id)`,
] as const;
