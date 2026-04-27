-- ============================================================
--  PromoDash — Migration SQL
--
--  Usage options:
--  A) With Prisma (recommended):
--       npx prisma migrate dev --name init
--       npx prisma db seed
--
--  B) Raw psql (no Prisma CLI needed):
--       psql $DATABASE_URL -f prisma/migrations/001_init.sql
--       psql $DATABASE_URL -f prisma/migrations/002_seed.sql
--
--  On Render / Railway, run via the shell console after deploying.
-- ============================================================

-- ── Enums ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('admin', 'client');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "Status" AS ENUM (
    'Draft', 'Pending Approval', 'Approved', 'Revision Required', 'Published'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "FileType" AS ENUM ('image', 'pdf');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Drop & recreate (idempotent reset) ────────────────────────────────────
DROP TABLE IF EXISTS comments        CASCADE;
DROP TABLE IF EXISTS versions        CASCADE;
DROP TABLE IF EXISTS promotions      CASCADE;
DROP TABLE IF EXISTS projects        CASCADE;
DROP TABLE IF EXISTS clients         CASCADE;
DROP TABLE IF EXISTS promotion_types CASCADE;
DROP TABLE IF EXISTS users           CASCADE;

-- ── Users ─────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name        TEXT        NOT NULL,
  email       TEXT        NOT NULL UNIQUE,
  password    TEXT        NOT NULL,
  role        "Role"      NOT NULL,
  company     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Promotion Types ────────────────────────────────────────────────────────
CREATE TABLE promotion_types (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name        TEXT        NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Clients ────────────────────────────────────────────────────────────────
CREATE TABLE clients (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name        TEXT        NOT NULL,
  email       TEXT        NOT NULL UNIQUE,
  company     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Projects ───────────────────────────────────────────────────────────────
CREATE TABLE projects (
  id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name         TEXT        NOT NULL,
  client       TEXT        NOT NULL,
  owner        TEXT        NOT NULL DEFAULT 'Growth Team',
  description  TEXT,
  client_users TEXT[]      NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Promotions ─────────────────────────────────────────────────────────────
CREATE TABLE promotions (
  id                  TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id          TEXT        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title               TEXT        NOT NULL,
  type                TEXT        NOT NULL REFERENCES promotion_types(id),
  scheduled_date      DATE        NOT NULL,
  status              "Status"    NOT NULL DEFAULT 'Draft',
  description         TEXT,
  subject_line        TEXT,
  contact_list        TEXT,
  captions            TEXT[]      NOT NULL DEFAULT '{}',
  current_version_id  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Versions ───────────────────────────────────────────────────────────────
CREATE TABLE versions (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  promotion_id  TEXT        NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  version       INTEGER     NOT NULL,
  label         TEXT        NOT NULL,
  file_name     TEXT        NOT NULL,
  file_type     "FileType"  NOT NULL,
  uploaded_by   TEXT        NOT NULL,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  url           TEXT        NOT NULL,   -- relative: /uploads/<uuid>.<ext>
  notes         TEXT
);

-- Add FK from promotions → versions (deferred so inserts work in any order)
ALTER TABLE promotions
  ADD CONSTRAINT fk_current_version
  FOREIGN KEY (current_version_id) REFERENCES versions(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- ── Comments ───────────────────────────────────────────────────────────────
CREATE TABLE comments (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  promotion_id  TEXT        NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  author        TEXT        NOT NULL,
  role          "Role"      NOT NULL,
  body          TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX idx_promotions_project  ON promotions(project_id);
CREATE INDEX idx_versions_promotion  ON versions(promotion_id);
CREATE INDEX idx_comments_promotion  ON comments(promotion_id);
CREATE INDEX idx_users_email         ON users(email);
CREATE INDEX idx_clients_email       ON clients(email);
