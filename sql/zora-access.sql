-- Additive migration. Run against FIMS only after a verified backup, in staging first.
-- Does not update, copy, or delete any farmers or users.
BEGIN;
CREATE TABLE IF NOT EXISTS zora_access_grants (
  subject_type text NOT NULL CHECK (subject_type IN ('farmer','agent')),
  subject_id text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  updated_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subject_type, subject_id)
);
CREATE TABLE IF NOT EXISTS zora_access_events (
  id bigserial PRIMARY KEY,
  subject_type text NOT NULL,
  subject_id text NOT NULL,
  enabled boolean NOT NULL,
  actor_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
