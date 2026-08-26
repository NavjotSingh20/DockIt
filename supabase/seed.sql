-- ═══════════════════════════════════════════════════════════
-- ComplianceAI — Demo Seed Data
-- Run AFTER schema.sql
-- Creates a demo business + 6 licenses for judge demonstration
-- NOTE: Replace 'REPLACE_WITH_YOUR_AUTH_USER_ID' with a real
--       UUID from auth.users (sign up once, then use that UUID)
-- ═══════════════════════════════════════════════════════════

-- Set the demo owner UUID (replace with real auth user UUID)
DO $$
DECLARE
  demo_owner_id UUID := 'REPLACE_WITH_YOUR_AUTH_USER_ID';
  demo_biz_id   UUID := uuid_generate_v4();
  today         DATE := CURRENT_DATE;
BEGIN

  -- ── Demo Business ────────────────────────────────────────
  INSERT INTO businesses (
    id, owner_id, business_name, business_type, owner_name,
    phone, email, address, city, state, gstin, compliance_score
  ) VALUES (
    demo_biz_id,
    demo_owner_id,
    'Spice Garden Restaurant',
    'Restaurant',
    'Rajesh Kumar',
    '+91 98765 43210',
    'rajesh@spicegarden.in',
    '12, Indiranagar 100 Feet Road',
    'Bengaluru',
    'Karnataka',
    '29AABCS1429B1Z1',
    52
  ) ON CONFLICT (id) DO NOTHING;

  -- ── License 1: FSSAI — EXPIRED 12 days ago ───────────────
  INSERT INTO licenses (
    business_id, license_type, license_number, issuing_authority,
    issue_date, expiry_date, status, confidence_score, renewal_portal_url
  ) VALUES (
    demo_biz_id, 'FSSAI', 'FSSAI-10023456789',
    'Food Safety and Standards Authority of India',
    today - INTERVAL '365 days',
    today - INTERVAL '12 days',
    'expired', 95,
    'https://foscos.fssai.gov.in'
  );

  -- ── License 2: Fire NOC — expires in 8 days ──────────────
  INSERT INTO licenses (
    business_id, license_type, license_number, issuing_authority,
    issue_date, expiry_date, status, confidence_score, renewal_portal_url
  ) VALUES (
    demo_biz_id, 'FIRE_NOC', 'KSFE-BLR-2024-8821',
    'Karnataka State Fire and Emergency Services',
    today - INTERVAL '357 days',
    today + INTERVAL '8 days',
    'expiring', 88,
    'https://ksfe.karnataka.gov.in'
  );

  -- ── License 3: Trade License — expires in 23 days ────────
  INSERT INTO licenses (
    business_id, license_type, license_number, issuing_authority,
    issue_date, expiry_date, status, confidence_score, renewal_portal_url
  ) VALUES (
    demo_biz_id, 'TRADE_LICENSE', 'BBMP-TL-2024-445521',
    'BBMP (Bruhat Bengaluru Mahanagara Palike)',
    today - INTERVAL '342 days',
    today + INTERVAL '23 days',
    'expiring', 92,
    'https://bbmptax.karnataka.gov.in'
  );

  -- ── License 4: Shop & Establishment — expires in 52 days ─
  INSERT INTO licenses (
    business_id, license_type, license_number, issuing_authority,
    issue_date, expiry_date, status, confidence_score, renewal_portal_url
  ) VALUES (
    demo_biz_id, 'SHOP_ESTABLISHMENT', 'KLAB-SE-2024-112233',
    'Karnataka Labour Department',
    today - INTERVAL '313 days',
    today + INTERVAL '52 days',
    'expiring', 85,
    'https://labour.karnataka.gov.in'
  );

  -- ── License 5: GST — expires in 240 days ─────────────────
  INSERT INTO licenses (
    business_id, license_type, license_number, issuing_authority,
    issue_date, expiry_date, status, confidence_score, renewal_portal_url
  ) VALUES (
    demo_biz_id, 'GST', '29AABCS1429B1Z1',
    'GST Council of India',
    today - INTERVAL '125 days',
    today + INTERVAL '240 days',
    'active', 99,
    'https://www.gst.gov.in'
  );

  -- ── License 6: Eating House — expires in 180 days ────────
  INSERT INTO licenses (
    business_id, license_type, license_number, issuing_authority,
    issue_date, expiry_date, status, confidence_score, renewal_portal_url
  ) VALUES (
    demo_biz_id, 'EATING_HOUSE', 'BCP-EH-2024-33445',
    'Bengaluru City Police',
    today - INTERVAL '185 days',
    today + INTERVAL '180 days',
    'active', 91,
    'https://bengalurupolice.karnataka.gov.in'
  );

  RAISE NOTICE 'Demo data seeded successfully for business: %', demo_biz_id;
END $$;
