-- ═══════════════════════════════════════════════════════════
-- ComplianceAI — Supabase Database Schema
-- Run this entire file in Supabase SQL Editor
-- Project: https://supabase.com → your project → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- TABLE: businesses
-- One row per registered business. Owner is auth.users.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS businesses (
  id              UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id        UUID          REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_name   TEXT          NOT NULL,
  business_type   TEXT          NOT NULL,
  owner_name      TEXT          NOT NULL,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  city            TEXT          DEFAULT 'Bengaluru',
  state           TEXT          DEFAULT 'Karnataka',
  gstin           TEXT,
  compliance_score INTEGER      DEFAULT 100 CHECK (compliance_score >= 0 AND compliance_score <= 100),
  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- TABLE: licenses
-- One row per license. Linked to a business.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS licenses (
  id                  UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id         UUID        REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  license_type        TEXT        NOT NULL,                -- e.g. 'FSSAI', 'FIRE_NOC'
  license_number      TEXT,
  issuing_authority   TEXT,
  issue_date          DATE,
  expiry_date         DATE        NOT NULL,
  status              TEXT        DEFAULT 'active'
                                  CHECK (status IN ('active','expiring','expired','unknown')),
  document_url        TEXT,                               -- Supabase Storage path
  extracted_data      JSONB       DEFAULT '{}',           -- raw Gemini output
  confidence_score    INTEGER     DEFAULT 0
                                  CHECK (confidence_score >= 0 AND confidence_score <= 100),
  renewal_portal_url  TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast license lookups by business and status
CREATE INDEX IF NOT EXISTS idx_licenses_business_id   ON licenses(business_id);
CREATE INDEX IF NOT EXISTS idx_licenses_expiry_date   ON licenses(expiry_date);
CREATE INDEX IF NOT EXISTS idx_licenses_status        ON licenses(status);

-- ─────────────────────────────────────────────────────────────
-- TABLE: reminders
-- Log of every reminder email/notification sent.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reminders (
  id              UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  license_id      UUID        REFERENCES licenses(id) ON DELETE CASCADE NOT NULL,
  reminder_stage  INTEGER     NOT NULL CHECK (reminder_stage IN (60, 30, 7, 1)),
  channel         TEXT        DEFAULT 'email' CHECK (channel IN ('email','push','sms')),
  sent_at         TIMESTAMPTZ DEFAULT NOW(),
  status          TEXT        DEFAULT 'sent' CHECK (status IN ('sent','failed','skipped'))
);

CREATE INDEX IF NOT EXISTS idx_reminders_license_id ON reminders(license_id);

-- ─────────────────────────────────────────────────────────────
-- TABLE: renewals
-- Tracks each renewal attempt with pre-filled data.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS renewals (
  id                UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  license_id        UUID        REFERENCES licenses(id) ON DELETE CASCADE NOT NULL,
  initiated_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  pre_filled_data   JSONB       DEFAULT '{}',             -- Gemini-generated form data
  document_checklist JSONB      DEFAULT '[]',             -- Array of {item, checked}
  notes             TEXT,
  status            TEXT        DEFAULT 'in_progress'
                                CHECK (status IN ('in_progress','completed','abandoned'))
);

CREATE INDEX IF NOT EXISTS idx_renewals_license_id ON renewals(license_id);

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- Users can only access data belonging to their own business.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders  ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewals   ENABLE ROW LEVEL SECURITY;

-- businesses: full access to own rows
CREATE POLICY "owner_businesses" ON businesses
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- licenses: access if business belongs to current user
CREATE POLICY "owner_licenses" ON licenses
  FOR ALL
  USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- reminders: access if related license belongs to current user
CREATE POLICY "owner_reminders" ON reminders
  FOR ALL
  USING (
    license_id IN (
      SELECT l.id FROM licenses l
      JOIN businesses b ON b.id = l.business_id
      WHERE b.owner_id = auth.uid()
    )
  );

-- renewals: same pattern
CREATE POLICY "owner_renewals" ON renewals
  FOR ALL
  USING (
    license_id IN (
      SELECT l.id FROM licenses l
      JOIN businesses b ON b.id = l.business_id
      WHERE b.owner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- TRIGGER: auto-update updated_at on businesses + licenses
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_licenses_updated_at
  BEFORE UPDATE ON licenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- STORAGE BUCKET: license-documents
-- Run this in Supabase Dashboard → Storage → New Bucket
-- OR run via SQL below (requires storage schema enabled)
-- ─────────────────────────────────────────────────────────────
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('license-documents', 'license-documents', false)
-- ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can only access their own folder
-- CREATE POLICY "user_license_docs" ON storage.objects
--   FOR ALL
--   USING (bucket_id = 'license-documents' AND auth.uid()::text = (storage.foldername(name))[1])
--   WITH CHECK (bucket_id = 'license-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ═══════════════════════════════════════════════════════════
-- DONE — Schema created successfully
-- Next step: run supabase/seed.sql for demo data
-- ═══════════════════════════════════════════════════════════
