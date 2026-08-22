CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  role TEXT NOT NULL,
  energy INTEGER NOT NULL CHECK (energy BETWEEN 0 AND 100),
  health INTEGER NOT NULL CHECK (health BETWEEN 0 AND 100),
  focus INTEGER NOT NULL CHECK (focus BETWEEN 0 AND 100),
  reputation INTEGER NOT NULL CHECK (reputation BETWEEN 0 AND 100),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wallets (
  player_id TEXT PRIMARY KEY REFERENCES players(id),
  balance_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UZS'
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id),
  title TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  kind TEXT NOT NULL,
  action_id TEXT UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id),
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  cost_cents INTEGER NOT NULL,
  energy_cost INTEGER NOT NULL,
  reward_focus INTEGER NOT NULL DEFAULT 0,
  reward_health INTEGER NOT NULL DEFAULT 0,
  reward_money_cents INTEGER NOT NULL DEFAULT 0,
  risk_label TEXT NOT NULL,
  created_at TEXT NOT NULL,
  confirmed_at TEXT,
  due_at TEXT,
  resolved_at TEXT,
  outcome TEXT,
  transition_token TEXT,
  idempotency_key TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS routines (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id),
  title TEXT NOT NULL,
  schedule_label TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  streak INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  skip_next INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS domain_events (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_actions_player_status_due ON actions(player_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_ledger_player_created ON ledger_entries(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_player_created ON domain_events(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_routines_player_status ON routines(player_id, status);
