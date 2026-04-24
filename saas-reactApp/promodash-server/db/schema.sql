-- ============================================================
--  PromoDash  –  PostgreSQL Schema + Seed Data
--  Run:  psql -U postgres -d promodash -f schema.sql


-- ============================================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS comments       CASCADE;
DROP TABLE IF EXISTS versions       CASCADE;
DROP TABLE IF EXISTS promotions     CASCADE;
DROP TABLE IF EXISTS projects       CASCADE;
DROP TABLE IF EXISTS clients        CASCADE;
DROP TABLE IF EXISTS promotion_types CASCADE;
DROP TABLE IF EXISTS users          CASCADE;

-- ── Users (admin + client accounts) ─────────────────────────────────────
CREATE TABLE users (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,          -- store bcrypt hash in production
  role        TEXT NOT NULL CHECK (role IN ('admin','client')),
  company     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Promotion Types ──────────────────────────────────────────────────────
CREATE TABLE promotion_types (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Clients ──────────────────────────────────────────────────────────────
CREATE TABLE clients (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  company     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Projects ─────────────────────────────────────────────────────────────
CREATE TABLE projects (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  client       TEXT NOT NULL,
  owner        TEXT NOT NULL DEFAULT 'Growth Team',
  description  TEXT,
  client_users TEXT[] NOT NULL DEFAULT '{}',   -- array of client emails
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Promotions ───────────────────────────────────────────────────────────
CREATE TABLE promotions (
  id                  TEXT PRIMARY KEY,
  project_id          TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  type                TEXT NOT NULL REFERENCES promotion_types(id),
  scheduled_date      DATE NOT NULL,
  status              TEXT NOT NULL DEFAULT 'Draft'
                        CHECK (status IN ('Draft','Pending Approval','Approved','Revision Required','Published')),
  description         TEXT,
  subject_line        TEXT,
  contact_list        TEXT,
  captions            TEXT[] NOT NULL DEFAULT '{}',
  current_version_id  TEXT,           -- FK set after versions insert
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Versions (creative assets) ───────────────────────────────────────────
CREATE TABLE versions (
  id            TEXT PRIMARY KEY,
  promotion_id  TEXT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  version       INTEGER NOT NULL,
  label         TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  file_type     TEXT NOT NULL CHECK (file_type IN ('image','pdf')),
  uploaded_by   TEXT NOT NULL,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  url           TEXT,                 -- base64 data-URL or file path
  notes         TEXT
);

-- Back-fill FK now that versions table exists
ALTER TABLE promotions
  ADD CONSTRAINT fk_current_version
  FOREIGN KEY (current_version_id) REFERENCES versions(id) ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

-- ── Comments ─────────────────────────────────────────────────────────────
CREATE TABLE comments (
  id            TEXT PRIMARY KEY,
  promotion_id  TEXT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  author        TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin','client')),
  body          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX idx_promotions_project    ON promotions(project_id);
CREATE INDEX idx_versions_promotion    ON versions(promotion_id);
CREATE INDEX idx_comments_promotion    ON comments(promotion_id);

-- ============================================================
--  Seed Data
-- ============================================================

-- Users
INSERT INTO users (id, name, email, password, role, company) VALUES
  ('user-admin',      'Admin Team',         'admin@promodash.local',      'password', 'admin',  NULL),
  ('user-cognesense', 'Cognesense Client',  'client@cognesense.com',      'password', 'client', 'Cognesense'),
  ('user-northstar',  'Northstar Marketing','marketing@northstar.example', 'password', 'client', 'Northstar Labs');

-- Promotion Types
INSERT INTO promotion_types (id, name, description) VALUES
  ('social', 'Social Media Campaign', 'Banners, captions, and post creatives for social profiles.'),
  ('email',  'Email Campaign',        'PDF or image previews for email blast approvals.');

-- Clients
INSERT INTO clients (id, name, email, company) VALUES
  ('client-cognesense', 'Cognesense Client',  'client@cognesense.com',      'Cognesense'),
  ('client-northstar',  'Northstar Marketing','marketing@northstar.example', 'Northstar Labs');

-- Projects
INSERT INTO projects (id, name, client, owner, description, client_users, created_at) VALUES
  ('project-cognesense', 'Cognesense Projects',     'Cognesense',    'Growth Team',
   'Marketing approvals for social media and email campaigns.',
   ARRAY['client@cognesense.com'], '2026-04-10T09:30:00Z'),
  ('project-northstar',  'Northstar Product Rollout','Northstar Labs', 'Growth Team',
   'Launch promotions and lifecycle email assets.',
   ARRAY['marketing@northstar.example'], '2026-04-12T11:00:00Z');

-- Promotions (current_version_id set after versions)
INSERT INTO promotions
  (id, project_id, title, type, scheduled_date, status, description,
   subject_line, contact_list, captions, created_at)
VALUES
  ('promo-ai-launch', 'project-cognesense', 'AI Workflow Launch', 'social',
   '2026-04-25', 'Pending Approval',
   'LinkedIn launch campaign for the new workflow automation feature.',
   '', '', ARRAY[
     'Cognesense teams can now review complex project signals in one streamlined approval workspace.',
     'Launch faster with one place for context, comments, versions, and final sign-off.'
   ], '2026-04-17T10:30:00Z'),

  ('promo-newsletter', 'project-cognesense', 'April Product Newsletter', 'email',
   '2026-04-28', 'Revision Required',
   'Monthly product update email with customer story and feature highlights.',
   'April product updates from Cognesense', 'Cognesense newsletter subscribers',
   '{}', '2026-04-18T12:15:00Z'),

  ('promo-webinar', 'project-cognesense', 'Customer Webinar Reminder', 'social',
   '2026-05-02', 'Draft',
   'Reminder banner and short caption set for the upcoming webinar.',
   '', '', ARRAY['Reserve your seat for Cognesense Live: practical strategies for faster project approvals.'],
   '2026-04-19T08:30:00Z'),

  ('promo-northstar-drip', 'project-northstar', 'Beta Invite Drip', 'email',
   '2026-04-30', 'Approved',
   'Three-part beta invitation sequence.',
   'Your Northstar beta invitation', 'Northstar beta waitlist',
   '{}', '2026-04-14T15:45:00Z');

-- Versions
INSERT INTO versions (id, promotion_id, version, label, file_name, file_type, uploaded_by, uploaded_at, url, notes) VALUES
  ('ver-ai-launch-1',   'promo-ai-launch',      1, 'Initial banner concept', 'launch-banner-v1.png',        'image', 'Admin', '2026-04-17T10:45:00Z', '', 'First layout with launch headline.'),
  ('ver-ai-launch-2',   'promo-ai-launch',      2, 'Updated CTA',            'launch-banner-v2.png',        'image', 'Admin', '2026-04-19T16:10:00Z', '', 'Adjusted call to action and typography.'),
  ('ver-newsletter-1',  'promo-newsletter',     1, 'PDF email preview',      'april-newsletter-preview.pdf','pdf',   'Admin', '2026-04-18T12:40:00Z', '', 'Email design exported as PDF.'),
  ('ver-webinar-1',     'promo-webinar',        1, 'Draft creative',         'webinar-reminder.png',        'image', 'Admin', '2026-04-19T09:00:00Z', '', 'Draft for internal review.'),
  ('ver-northstar-1',   'promo-northstar-drip', 1, 'Approved PDF',           'beta-invite.pdf',             'pdf',   'Admin', '2026-04-15T11:00:00Z', '', 'Client approved.');

-- Set current_version_id on promotions
UPDATE promotions SET current_version_id = 'ver-ai-launch-2'  WHERE id = 'promo-ai-launch';
UPDATE promotions SET current_version_id = 'ver-newsletter-1' WHERE id = 'promo-newsletter';
UPDATE promotions SET current_version_id = 'ver-webinar-1'    WHERE id = 'promo-webinar';
UPDATE promotions SET current_version_id = 'ver-northstar-1'  WHERE id = 'promo-northstar-drip';

-- Comments
INSERT INTO comments (id, promotion_id, author, role, body, created_at) VALUES
  ('comment-1', 'promo-ai-launch',  'Client', 'client', 'The layout works. Can we make the CTA feel more action-oriented?',       '2026-04-19T09:22:00Z'),
  ('comment-2', 'promo-ai-launch',  'Admin',  'admin',  'Updated in version 2 with a stronger CTA and cleaner hierarchy.',        '2026-04-19T16:12:00Z'),
  ('comment-3', 'promo-newsletter', 'Client', 'client', 'Please move the customer quote higher and shorten the intro paragraph.', '2026-04-20T13:04:00Z');
