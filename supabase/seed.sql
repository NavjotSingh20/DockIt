-- ═══════════════════════════════════════════════════════════
-- DockIt — Demo Seed Data (Normalized Schema)
-- Run AFTER schema.sql
-- Seeds: requirements master data + demo business + checklist
-- NOTE: Replace 'REPLACE_WITH_YOUR_AUTH_USER_ID' with a real
--       UUID from auth.users (sign up once, then use that UUID)
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  demo_owner_id UUID := 'REPLACE_WITH_YOUR_AUTH_USER_ID';
  demo_biz_id   UUID := uuid_generate_v4();
  today         DATE := CURRENT_DATE;

  -- Requirement IDs (we need stable references for business_requirements)
  req_fssai     UUID := uuid_generate_v4();
  req_fire      UUID := uuid_generate_v4();
  req_trade     UUID := uuid_generate_v4();
  req_shop      UUID := uuid_generate_v4();
  req_eating    UUID := uuid_generate_v4();
  req_gst       UUID := uuid_generate_v4();
  req_signage   UUID := uuid_generate_v4();

  -- Business requirement IDs (for ocr_extractions FK)
  br_fssai      UUID := uuid_generate_v4();
  br_fire       UUID := uuid_generate_v4();
  br_trade      UUID := uuid_generate_v4();
  br_shop       UUID := uuid_generate_v4();
  br_gst        UUID := uuid_generate_v4();
  br_eating     UUID := uuid_generate_v4();

BEGIN

  -- ══════════════════════════════════════════════════════════
  -- REQUIREMENTS — Master permit catalog for Mumbai restaurants
  -- ══════════════════════════════════════════════════════════

  INSERT INTO requirements (id, business_type, city, jurisdiction_level, requirement_name, issuing_agency, fee_min, fee_max, renewal_cycle_months, processing_time, description, source_url) VALUES
  (req_fssai, 'restaurant', 'Mumbai, Maharashtra', 'federal',
   'FSSAI Food License',
   'Food Safety and Standards Authority of India',
   2000, 5000, 12, '7-14 business days',
   'Mandatory food safety license for any food business in India. Required for manufacturing, storage, distribution, and sale of food.',
   'https://foscos.fssai.gov.in'),

  (req_fire, 'restaurant', 'Mumbai, Maharashtra', 'state',
   'Fire NOC',
   'Maharashtra Fire & Emergency Services',
   1000, 10000, 12, '14-30 business days',
   'No Objection Certificate from fire department certifying fire safety compliance of the premises.',
   'https://mumbaimunicipal.gov.in'),

  (req_trade, 'restaurant', 'Mumbai, Maharashtra', 'city',
   'Trade License',
   'BMC (Brihatmumbai Municipal Corporation)',
   5000, 25000, 12, '7-21 business days',
   'Municipal trade license permitting commercial business operations within city jurisdiction.',
   'https://portal.mcgm.gov.in'),

  (req_shop, 'restaurant', 'Mumbai, Maharashtra', 'state',
   'Shop & Establishment Registration',
   'Maharashtra Labour Department',
   500, 2000, 12, '7-14 business days',
   'Registration under the Shops and Establishments Act for regulating working conditions and employee welfare.',
   'https://mahashramm.gov.in'),

  (req_eating, 'restaurant', 'Mumbai, Maharashtra', 'city',
   'Eating House License',
   'Mumbai City Police',
   2000, 5000, 12, '21-45 business days',
   'Police license required for any establishment serving food and beverages. Ensures public safety compliance.',
   'https://mumbaipolice.gov.in'),

  (req_gst, 'restaurant', 'Mumbai, Maharashtra', 'federal',
   'GST Registration',
   'GST Council of India',
   0, 0, NULL, '3-7 business days',
   'Goods and Services Tax registration. Mandatory for businesses with annual turnover exceeding threshold.',
   'https://www.gst.gov.in'),

  (req_signage, 'restaurant', 'Mumbai, Maharashtra', 'city',
   'Signage / Hoarding License',
   'BMC Advertisement Department',
   1000, 15000, 12, '14-30 business days',
   'License for displaying business signage, hoardings, or advertisements on or near the premises.',
   'https://portal.mcgm.gov.in');


  -- ══════════════════════════════════════════════════════════
  -- DEMO BUSINESS
  -- ══════════════════════════════════════════════════════════

  INSERT INTO businesses (
    id, owner_id, business_name, business_type, owner_name,
    phone, email, address, cities
  ) VALUES (
    demo_biz_id,
    demo_owner_id,
    'Spice Garden Restaurant',
    'restaurant',
    'Rajesh Kumar',
    '+91 98765 43210',
    'rajesh@spicegarden.in',
    '12, Link Road, Andheri West',
    '{"Mumbai, Maharashtra"}'
  ) ON CONFLICT (id) DO NOTHING;


  -- ══════════════════════════════════════════════════════════
  -- BUSINESS REQUIREMENTS — Demo checklist
  -- ══════════════════════════════════════════════════════════

  -- FSSAI — EXPIRED 12 days ago
  INSERT INTO business_requirements (id, business_id, requirement_id, status, license_number, issuing_authority, expiry_date) VALUES
  (br_fssai, demo_biz_id, req_fssai, 'expired', 'FSSAI-10023456789', 'Food Safety and Standards Authority of India', today - INTERVAL '12 days');

  -- Fire NOC — expiring in 8 days
  INSERT INTO business_requirements (id, business_id, requirement_id, status, license_number, issuing_authority, expiry_date) VALUES
  (br_fire, demo_biz_id, req_fire, 'in_progress', 'KSFE-BLR-2024-8821', 'Maharashtra Fire & Emergency Services', today + INTERVAL '8 days');

  -- Trade License — expiring in 23 days
  INSERT INTO business_requirements (id, business_id, requirement_id, status, license_number, issuing_authority, expiry_date) VALUES
  (br_trade, demo_biz_id, req_trade, 'in_progress', 'BBMP-TL-2024-445521', 'BMC (Brihatmumbai Municipal Corporation)', today + INTERVAL '23 days');

  -- Shop & Establishment — expiring in 52 days
  INSERT INTO business_requirements (id, business_id, requirement_id, status, license_number, issuing_authority, expiry_date) VALUES
  (br_shop, demo_biz_id, req_shop, 'in_progress', 'KLAB-SE-2024-112233', 'Maharashtra Labour Department', today + INTERVAL '52 days');

  -- GST — satisfied, expires in 240 days
  INSERT INTO business_requirements (id, business_id, requirement_id, status, license_number, issuing_authority, expiry_date) VALUES
  (br_gst, demo_biz_id, req_gst, 'satisfied', '29AABCS1429B1Z1', 'GST Council of India', today + INTERVAL '240 days');

  -- Eating House — satisfied, expires in 180 days
  INSERT INTO business_requirements (id, business_id, requirement_id, status, license_number, issuing_authority, expiry_date) VALUES
  (br_eating, demo_biz_id, req_eating, 'satisfied', 'BCP-EH-2024-33445', 'Mumbai City Police', today + INTERVAL '180 days');


  -- ══════════════════════════════════════════════════════════
  -- OCR EXTRACTIONS — Sample audit trail
  -- ══════════════════════════════════════════════════════════

  INSERT INTO ocr_extractions (business_requirement_id, raw_ocr_text, extracted_json, confidence_flag) VALUES
  (br_fssai,
   'FSSAI License No: FSSAI-2021-MH-0049821\nBusiness: Spice Garden Restaurant\nIssued: 2023-07-01\nExpiry: 2024-07-01',
   '{"license_number": "FSSAI-2021-MH-0049821", "business_name": "Spice Garden Restaurant", "issue_date": "2023-07-01", "expiry_date": "2024-07-01"}',
   'high'),

  (br_gst,
   'GSTIN: 27AABCS1429B1Z1\nLegal Name: Spice Garden Restaurant\nState: Maharashtra',
   '{"license_number": "27AABCS1429B1Z1", "business_name": "Spice Garden Restaurant", "state": "Maharashtra"}',
   'high');


  RAISE NOTICE 'Demo data seeded successfully for business: %', demo_biz_id;
END $$;
