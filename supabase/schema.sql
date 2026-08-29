-- ═══════════════════════════════════════════════════════════
-- DockIt — Supabase Database Schema (Normalized)
-- Run this entire file in Supabase SQL Editor
-- Project: https://supabase.com → your project → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- TABLE: requirements
-- Master permit/license catalog — scraped or manually curated.
-- One row per (business_type + city + requirement).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS requirements (
  id                    UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_type         TEXT          NOT NULL,                    -- e.g. 'restaurant', 'salon'
  city                  TEXT          NOT NULL,                    -- e.g. 'New York, NY', 'Mumbai, Maharashtra'
  jurisdiction_level    TEXT          NOT NULL DEFAULT 'city'
                                     CHECK (jurisdiction_level IN ('federal','state','city')),
  requirement_name      TEXT          NOT NULL,                    -- e.g. 'FSSAI Food License'
  issuing_agency        TEXT          NOT NULL,
  fee_min               NUMERIC(10,2) DEFAULT 0,
  fee_max               NUMERIC(10,2) DEFAULT 0,
  renewal_cycle_months  INTEGER,                                  -- NULL = one-time / no renewal
  processing_time       TEXT,                                     -- e.g. '7-14 business days'
  description           TEXT,
  source_url            TEXT,
  template_url          TEXT,
  form_field_map        JSONB,
  last_verified_date    DATE          DEFAULT CURRENT_DATE,
  created_at            TIMESTAMPTZ   DEFAULT NOW(),
  CONSTRAINT uq_requirements_type_city_name UNIQUE (business_type, city, requirement_name)
);

CREATE INDEX IF NOT EXISTS idx_requirements_type_city ON requirements(business_type, city);
CREATE INDEX IF NOT EXISTS idx_requirements_city      ON requirements(city);

-- ─────────────────────────────────────────────────────────────
-- TABLE: businesses
-- One row per registered business. Owner is auth.users.
-- cities[] holds all operating cities (multi-city support).
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
  city            TEXT,
  state           TEXT,
  country         TEXT          DEFAULT 'USA',
  cities          TEXT[]        DEFAULT '{}',   -- e.g. '{"Mumbai, Maharashtra", "New York, NY"}'
  email_reminders_enabled BOOLEAN DEFAULT true,
  reminder_days   INTEGER[]     DEFAULT '{60,30,7}',  -- which day-milestones to send alerts
  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- TABLE: business_requirements
-- Per-business checklist — the live join between a business
-- and the requirements it must satisfy.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_requirements (
  id                UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id       UUID          REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  requirement_id    UUID          REFERENCES requirements(id) ON DELETE CASCADE NOT NULL,
  status            TEXT          DEFAULT 'needed'
                                  CHECK (status IN ('needed','in_progress','satisfied','expired','waived')),
  license_number    TEXT,                           -- actual permit number
  issuing_authority TEXT,                           -- agency name
  document_url      TEXT,                           -- uploaded proof document path
  expiry_date       DATE,
  extracted_via_ocr BOOLEAN       DEFAULT FALSE,
  created_at        TIMESTAMPTZ   DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE(business_id, requirement_id)
);

CREATE INDEX IF NOT EXISTS idx_br_business    ON business_requirements(business_id);
CREATE INDEX IF NOT EXISTS idx_br_requirement ON business_requirements(requirement_id);
CREATE INDEX IF NOT EXISTS idx_br_status      ON business_requirements(status);
CREATE INDEX IF NOT EXISTS idx_br_expiry      ON business_requirements(expiry_date);

-- ─────────────────────────────────────────────────────────────
-- TABLE: ocr_extractions
-- Raw OCR / AI output audit trail. One row per scan attempt.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ocr_extractions (
  id                      UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_requirement_id UUID          REFERENCES business_requirements(id) ON DELETE CASCADE NOT NULL,
  raw_ocr_text            TEXT,
  extracted_json          JSONB         DEFAULT '{}',
  confidence_flag         TEXT          DEFAULT 'low'
                                        CHECK (confidence_flag IN ('low','medium','high')),
  created_at              TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ocr_br ON ocr_extractions(business_requirement_id);

-- ─────────────────────────────────────────────────────────────
-- TABLE: reminders
-- Log of every reminder email/notification sent.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reminders (
  id                      UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_requirement_id UUID        REFERENCES business_requirements(id) ON DELETE CASCADE NOT NULL,
  reminder_stage          INTEGER     NOT NULL CHECK (reminder_stage IN (60, 30, 7, 1)),
  channel                 TEXT        DEFAULT 'email' CHECK (channel IN ('email','push','sms')),
  sent_at                 TIMESTAMPTZ DEFAULT NOW(),
  status                  TEXT        DEFAULT 'sent' CHECK (status IN ('sent','failed','skipped'))
);

CREATE INDEX IF NOT EXISTS idx_reminders_br ON reminders(business_requirement_id);

-- ─────────────────────────────────────────────────────────────
-- TABLE: renewals
-- Tracks each renewal attempt with pre-filled data.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS renewals (
  id                      UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_requirement_id UUID        REFERENCES business_requirements(id) ON DELETE CASCADE NOT NULL,
  initiated_at            TIMESTAMPTZ DEFAULT NOW(),
  completed_at            TIMESTAMPTZ,
  pre_filled_data         JSONB       DEFAULT '{}',             -- Gemini-generated form data
  document_checklist      JSONB       DEFAULT '[]',             -- Array of {item, checked}
  notes                   TEXT,
  status                  TEXT        DEFAULT 'in_progress'
                                      CHECK (status IN ('in_progress','completed','abandoned'))
);

CREATE INDEX IF NOT EXISTS idx_renewals_br ON renewals(business_requirement_id);

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

-- requirements: public read for all authenticated users
ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_requirements" ON requirements
  FOR SELECT USING (true);

-- businesses: full access to own rows
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_businesses" ON businesses
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- business_requirements: access if business belongs to current user
ALTER TABLE business_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_business_requirements" ON business_requirements
  FOR ALL
  USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- ocr_extractions: access if parent business_requirement belongs to current user
ALTER TABLE ocr_extractions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_ocr_extractions" ON ocr_extractions
  FOR ALL
  USING (
    business_requirement_id IN (
      SELECT br.id FROM business_requirements br
      JOIN businesses b ON b.id = br.business_id
      WHERE b.owner_id = auth.uid()
    )
  );

-- reminders: access if related business_requirement belongs to current user
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_reminders" ON reminders
  FOR ALL
  USING (
    business_requirement_id IN (
      SELECT br.id FROM business_requirements br
      JOIN businesses b ON b.id = br.business_id
      WHERE b.owner_id = auth.uid()
    )
  );

-- renewals: same pattern
ALTER TABLE renewals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_renewals" ON renewals
  FOR ALL
  USING (
    business_requirement_id IN (
      SELECT br.id FROM business_requirements br
      JOIN businesses b ON b.id = br.business_id
      WHERE b.owner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- TRIGGER: auto-update updated_at
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

CREATE TRIGGER trg_br_updated_at
  BEFORE UPDATE ON business_requirements
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
