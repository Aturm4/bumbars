CREATE TABLE IF NOT EXISTS action_targets (
  action_id TEXT PRIMARY KEY REFERENCES actions(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('location')),
  entity_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_action_targets_entity
ON action_targets(entity_type, entity_id);

PRAGMA optimize;

