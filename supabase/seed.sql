-- ═══════════════════════════════════════════════════════════
-- DockIt — Demo Seed Data (Normalized Schema)
-- Run AFTER schema.sql
-- Seeds: requirements master data + demo business + checklist
-- NOTE: Replace 'REPLACE_WITH_YOUR_AUTH_USER_ID' with a real
--       UUID from auth.users (sign up once, then use that UUID)
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  demo_owner_id      UUID := 'REPLACE_WITH_YOUR_AUTH_USER_ID';
  demo_biz_id        UUID := uuid_generate_v4();
  demo_rico_biz_id   UUID := uuid_generate_v4();
  demo_grandview_biz_id UUID := uuid_generate_v4();
  today              DATE := CURRENT_DATE;

  -- Mumbai Restaurant Requirement IDs
  req_fssai     UUID := uuid_generate_v4();
  req_fire      UUID := uuid_generate_v4();
  req_trade     UUID := uuid_generate_v4();
  req_shop      UUID := uuid_generate_v4();
  req_eating    UUID := uuid_generate_v4();
  req_gst       UUID := uuid_generate_v4();
  req_signage   UUID := uuid_generate_v4();

  -- Reusable Federal Food Truck Requirement ID
  req_ein       UUID := uuid_generate_v4();

  -- NYC Food Truck Requirement IDs
  req_nyc_1     UUID := uuid_generate_v4();
  req_nyc_2     UUID := uuid_generate_v4();
  req_nyc_3     UUID := uuid_generate_v4();
  req_nyc_4     UUID := uuid_generate_v4();
  req_nyc_5     UUID := uuid_generate_v4();
  req_nyc_6     UUID := uuid_generate_v4();

  -- LA Food Truck Requirement IDs
  req_la_1      UUID := uuid_generate_v4();
  req_la_2      UUID := uuid_generate_v4();
  req_la_3      UUID := uuid_generate_v4();
  req_la_4      UUID := uuid_generate_v4();
  req_la_5      UUID := uuid_generate_v4();
  req_la_6      UUID := uuid_generate_v4();
  req_la_7      UUID := uuid_generate_v4();

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

  INSERT INTO requirements (id, business_type, city, jurisdiction_level, requirement_name, issuing_agency, fee_min, fee_max, renewal_cycle_months, processing_time, description, source_url, last_verified_date) VALUES
  (req_fssai, 'restaurant', 'Mumbai, Maharashtra', 'federal',
   'FSSAI Food License',
   'Food Safety and Standards Authority of India',
   2000, 5000, 12, '7-14 business days',
   'Mandatory food safety license for any food business in India. Required for manufacturing, storage, distribution, and sale of food.',
   'https://foscos.fssai.gov.in', CURRENT_DATE),

  (req_fire, 'restaurant', 'Mumbai, Maharashtra', 'state',
   'Fire NOC',
   'Maharashtra Fire & Emergency Services',
   1000, 10000, 12, '14-30 business days',
   'No Objection Certificate from fire department certifying fire safety compliance of the premises.',
   'https://mumbaimunicipal.gov.in', CURRENT_DATE),

  (req_trade, 'restaurant', 'Mumbai, Maharashtra', 'city',
   'Trade License',
   'BMC (Brihatmumbai Municipal Corporation)',
   5000, 25000, 12, '7-21 business days',
   'Municipal trade license permitting commercial business operations within city jurisdiction.',
   'https://portal.mcgm.gov.in', CURRENT_DATE),

  (req_shop, 'restaurant', 'Mumbai, Maharashtra', 'state',
   'Shop & Establishment Registration',
   'Maharashtra Labour Department',
   500, 2000, 12, '7-14 business days',
   'Registration under the Shops and Establishments Act for regulating working conditions and employee welfare.',
   'https://mahashramm.gov.in', CURRENT_DATE),

  (req_eating, 'restaurant', 'Mumbai, Maharashtra', 'city',
   'Eating House License',
   'Mumbai City Police',
   2000, 5000, 12, '21-45 business days',
   'Police license required for any establishment serving food and beverages. Ensures public safety compliance.',
   'https://mumbaipolice.gov.in', CURRENT_DATE),

  (req_gst, 'restaurant', 'Mumbai, Maharashtra', 'federal',
   'GST Registration',
   'GST Council of India',
   0, 0, NULL, '3-7 business days',
   'Goods and Services Tax registration. Mandatory for businesses with annual turnover exceeding threshold.',
   'https://www.gst.gov.in', CURRENT_DATE),

  (req_signage, 'restaurant', 'Mumbai, Maharashtra', 'city',
   'Signage / Hoarding License',
   'BMC Advertisement Department',
   1000, 15000, 12, '14-30 business days',
   'License for displaying business signage, hoardings, or advertisements on or near the premises.',
   'https://portal.mcgm.gov.in', CURRENT_DATE);


  -- ══════════════════════════════════════════════════════════
  -- REQUIREMENTS — Federal (Reusable across all cities for Food Truck)
  -- ══════════════════════════════════════════════════════════

  INSERT INTO requirements (id, business_type, city, jurisdiction_level, requirement_name, issuing_agency, fee_min, fee_max, renewal_cycle_months, processing_time, description, source_url, last_verified_date) VALUES
  (req_ein, 'food_truck', 'Federal / All Cities', 'federal',
   'Employer Identification Number (EIN)',
   'IRS (Internal Revenue Service)',
   0, 0, NULL, 'Instant online',
   'Federal Tax Identification Number issued by the Internal Revenue Service for business tax reporting and hiring employees.',
   'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online', CURRENT_DATE);


  -- ══════════════════════════════════════════════════════════
  -- REQUIREMENTS — New York, NY (Food Truck)
  -- Mapped to NYC DOHMH 314C application form template
  -- ══════════════════════════════════════════════════════════

  INSERT INTO requirements (id, business_type, city, jurisdiction_level, requirement_name, issuing_agency, fee_min, fee_max, renewal_cycle_months, processing_time, description, source_url, template_url, form_field_map, last_verified_date) VALUES
  (req_nyc_1, 'food_truck', 'New York, NY', 'city',
   'Mobile Food Vending License',
   'DCWP (NYC Dept. of Consumer & Worker Protection)',
   NULL, NULL, 24, '14-30 business days',
   'Personal license authorizing an individual to vend food from a mobile food unit in NYC public space.',
   'https://nyc-business.nyc.gov/nycbusiness/description/mobile-food-vending-license',
   'https://www.nyc.gov/assets/doh/downloads/pdf/sbs/314c-standard-form.pdf',
   '{"mode":"overlay","fields":{"business_name":{"page":0,"x":140,"y":665,"fontSize":10},"owner_name":{"page":0,"x":140,"y":635,"fontSize":10},"phone":{"page":0,"x":420,"y":635,"fontSize":10},"email":{"page":0,"x":140,"y":610,"fontSize":10},"address":{"page":0,"x":140,"y":585,"fontSize":10},"city":{"page":0,"x":420,"y":585,"fontSize":10},"business_type":{"page":0,"x":140,"y":555,"fontSize":10},"date":{"page":0,"x":450,"y":710,"fontSize":10}}}'::jsonb,
   CURRENT_DATE),

  (req_nyc_2, 'food_truck', 'New York, NY', 'city',
   'Mobile Food Vendor (MFV) Permit',
   'DOHMH (NYC Dept. of Health & Mental Hygiene)',
   NULL, NULL, 24, '30-60 business days',
   'Permit authorizing the operation of a specific mobile food vending truck or pushcart unit.',
   'https://www.nyc.gov/site/doh/business/food-operators/mobile-and-temporary-food-vendors.page',
   'https://www.nyc.gov/assets/doh/downloads/pdf/sbs/314c-standard-form.pdf',
   '{"mode":"overlay","fields":{"business_name":{"page":0,"x":140,"y":665,"fontSize":10},"owner_name":{"page":0,"x":140,"y":635,"fontSize":10},"phone":{"page":0,"x":420,"y":635,"fontSize":10},"email":{"page":0,"x":140,"y":610,"fontSize":10},"address":{"page":0,"x":140,"y":585,"fontSize":10},"city":{"page":0,"x":420,"y":585,"fontSize":10},"business_type":{"page":0,"x":140,"y":555,"fontSize":10},"date":{"page":0,"x":450,"y":710,"fontSize":10}}}'::jsonb,
   CURRENT_DATE),

  (req_nyc_3, 'food_truck', 'New York, NY', 'city',
   'Mobile Food Vendor Food Protection Certificate',
   'DOHMH (NYC Dept. of Health & Mental Hygiene)',
   NULL, NULL, NULL, '1-3 business days',
   'Mandatory food protection and safety manager certificate for supervisors of mobile food vending operations.',
   'https://www.nyc.gov/site/doh/business/food-operators/mobile-and-temporary-food-vendors.page',
   'https://www.nyc.gov/assets/doh/downloads/pdf/sbs/314c-standard-form.pdf',
   '{"mode":"overlay","fields":{"business_name":{"page":0,"x":140,"y":665,"fontSize":10},"owner_name":{"page":0,"x":140,"y":635,"fontSize":10},"phone":{"page":0,"x":420,"y":635,"fontSize":10},"email":{"page":0,"x":140,"y":610,"fontSize":10},"address":{"page":0,"x":140,"y":585,"fontSize":10},"city":{"page":0,"x":420,"y":585,"fontSize":10},"business_type":{"page":0,"x":140,"y":555,"fontSize":10},"date":{"page":0,"x":450,"y":710,"fontSize":10}}}'::jsonb,
   CURRENT_DATE),

  (req_nyc_4, 'food_truck', 'New York, NY', 'state',
   'NYS Certificate of Authority (Sales Tax)',
   'NY State Dept. of Taxation & Finance',
   NULL, NULL, NULL, '5-10 business days',
   'State certificate authorizing collection of sales tax on retail food and beverage sales in New York.',
   'https://www.tax.ny.gov', NULL, NULL, CURRENT_DATE),

  (req_nyc_5, 'food_truck', 'New York, NY', 'city',
   'Environmental Control Board (ECB) Clearance',
   'NYC ECB / OATH',
   NULL, NULL, 12, '1-5 business days',
   'Clearance certificate confirming all outstanding NYC ECB vendor notices and violations are cleared.',
   'https://nyc-business.nyc.gov/nycbusiness/description/mobile-food-vending-license', NULL, NULL, CURRENT_DATE),

  (req_nyc_6, 'food_truck', 'New York, NY', 'city',
   'Commissary Agreement',
   'DOHMH Requirement',
   NULL, NULL, 12, '1-7 business days',
   'Official written agreement with a licensed commercial kitchen/commissary for daily servicing and food storage.',
   'https://nyc-business.nyc.gov/nycbusiness/description/mobile-food-vending-unit-permit-full-term',
   'https://www.nyc.gov/assets/doh/downloads/pdf/sbs/314c-standard-form.pdf',
   '{"mode":"overlay","fields":{"business_name":{"page":0,"x":140,"y":665,"fontSize":10},"owner_name":{"page":0,"x":140,"y":635,"fontSize":10},"phone":{"page":0,"x":420,"y":635,"fontSize":10},"email":{"page":0,"x":140,"y":610,"fontSize":10},"address":{"page":0,"x":140,"y":585,"fontSize":10},"city":{"page":0,"x":420,"y":585,"fontSize":10},"business_type":{"page":0,"x":140,"y":555,"fontSize":10},"date":{"page":0,"x":450,"y":710,"fontSize":10}}}'::jsonb,
   CURRENT_DATE);


  -- ══════════════════════════════════════════════════════════
  -- REQUIREMENTS — Los Angeles, CA (Food Truck)
  -- Mapped to LA Public Health Permit Application AcroForm template
  -- ══════════════════════════════════════════════════════════

  INSERT INTO requirements (id, business_type, city, jurisdiction_level, requirement_name, issuing_agency, fee_min, fee_max, renewal_cycle_months, processing_time, description, source_url, template_url, form_field_map, last_verified_date) VALUES
  (req_la_1, 'food_truck', 'Los Angeles, CA', 'city',
   'LA County Mobile Food Facility (MFF) Permit',
   'LACDPH (LA County Dept. of Public Health)',
   NULL, NULL, 12, '14-30 business days',
   'Public health permit authorizing mobile food facility operations within LA County jurisdictions.',
   'https://ftala.org/Permits-and-Licenses-2025',
   'http://publichealth.lacounty.gov/eh/docs/permit/Public-Health-Permit-License-Application.pdf',
   '{"mode":"acroform","fields":{"LEGAL NAME OF BUSINESS DBA":"business_name","Business Street AddressRow1":"address","CityRow1":"city","ZipRow1":"zip","OWNER 1":"owner_name","PhoneOWNER 1":"phone","EmailOWNER 1":"email","Print Name Title":"owner_name","Date of Application":"date","Signature Date":"date","Mobile Food Facility":"checkbox_true","New Business":"checkbox_true"}}'::jsonb,
   CURRENT_DATE),

  (req_la_2, 'food_truck', 'Los Angeles, CA', 'city',
   'City of LA Business Tax Registration Certificate (BTRC)',
   'City of LA Office of Finance',
   NULL, NULL, 12, '3-7 business days',
   'Mandatory municipal tax registration for doing business within the City of Los Angeles limits.',
   'https://streetlegal.io/blog/california/los-angeles-food-truck-permit-guide', NULL, NULL, CURRENT_DATE),

  (req_la_3, 'food_truck', 'Los Angeles, CA', 'state',
   'California Seller''s Permit',
   'CDTFA (California Dept. of Tax & Fee Administration)',
   NULL, NULL, NULL, '1-5 business days',
   'State sales tax permit required for retail sales of food and goods within California.',
   'https://streetlegal.io/blog/california/los-angeles-food-truck-permit-guide', NULL, NULL, CURRENT_DATE),

  (req_la_4, 'food_truck', 'Los Angeles, CA', 'city',
   'Commissary Letter of Agreement',
   'LACDPH Requirement',
   NULL, NULL, 12, '1-7 business days',
   'Formally executed agreement with an approved commercial commissary facility for cleaning, filling, and storage.',
   'https://streetlegal.io/blog/california/los-angeles-food-truck-permit-guide',
   'http://publichealth.lacounty.gov/eh/docs/permit/Public-Health-Permit-License-Application.pdf',
   '{"mode":"acroform","fields":{"LEGAL NAME OF BUSINESS DBA":"business_name","Business Street AddressRow1":"address","CityRow1":"city","ZipRow1":"zip","OWNER 1":"owner_name","PhoneOWNER 1":"phone","EmailOWNER 1":"email","Print Name Title":"owner_name","Date of Application":"date","Signature Date":"date","Mobile Food Facility":"checkbox_true","New Business":"checkbox_true"}}'::jsonb,
   CURRENT_DATE),

  (req_la_5, 'food_truck', 'Los Angeles, CA', 'state',
   'California Food Handler Card',
   'CA Dept. of Public Health',
   NULL, NULL, 36, '1-2 business days',
   'State-mandated food handler training certificate for food service workers in food facility operations.',
   'https://getvendorloop.com/guides/how-to-start-a-food-truck-in-los-angeles', NULL, NULL, CURRENT_DATE),

  (req_la_6, 'food_truck', 'Los Angeles, CA', 'city',
   'Food Protection Manager Certification',
   'LACDPH',
   NULL, NULL, 60, '1-5 business days',
   'Certified food safety manager accreditation required for person-in-charge of mobile food facilities.',
   'https://getvendorloop.com/guides/how-to-start-a-food-truck-in-los-angeles',
   'http://publichealth.lacounty.gov/eh/docs/permit/Public-Health-Permit-License-Application.pdf',
   '{"mode":"acroform","fields":{"LEGAL NAME OF BUSINESS DBA":"business_name","Business Street AddressRow1":"address","CityRow1":"city","ZipRow1":"zip","OWNER 1":"owner_name","PhoneOWNER 1":"phone","EmailOWNER 1":"email","Print Name Title":"owner_name","Date of Application":"date","Signature Date":"date","Mobile Food Facility":"checkbox_true","New Business":"checkbox_true"}}'::jsonb,
   CURRENT_DATE);

  INSERT INTO requirements (id, business_type, city, jurisdiction_level, requirement_name, issuing_agency, fee_min, fee_max, renewal_cycle_months, processing_time, description, source_url, last_verified_date) VALUES
  (req_la_7, 'food_truck', 'Los Angeles, CA', 'state',
   'HCD Insignia (Vehicle Inspection)',
   'CA Dept. of Housing & Community Development',
   NULL, NULL, NULL, '14-30 business days',
   'State safety certification insignia for commercial mobile food trucks and trailers with electrical or gas systems.',
   'https://runpitstop.com/blog/food-truck-permits-california', CURRENT_DATE);


  -- ══════════════════════════════════════════════════════════
  -- DEMO BUSINESS PROFILES
  -- ══════════════════════════════════════════════════════════

  -- Profile 1: Spice Garden Restaurant (Mumbai)
  INSERT INTO businesses (
    id, owner_id, business_name, business_type, owner_name,
    phone, email, address, cities
  ) VALUES (
    demo_biz_id, demo_owner_id, 'Spice Garden Restaurant', 'restaurant', 'Rajesh Kumar',
    '+91 98765 43210', 'rajesh@spicegarden.in', '12, Link Road, Andheri West', '{"Mumbai, Maharashtra"}'
  ) ON CONFLICT (id) DO NOTHING;

  -- Profile 2: Rico's Curbside Kitchen (NYC Food Truck — Incomplete Compliance)
  INSERT INTO businesses (
    id, owner_id, business_name, business_type, owner_name,
    phone, email, address, cities
  ) VALUES (
    demo_rico_biz_id, demo_owner_id, 'Rico''s Curbside Kitchen', 'food_truck', 'Mara Delgado',
    '+1 212 555 0199', 'mara@ricoscurbside.com', '450 W 42nd St, New York, NY', '{"New York, NY"}'
  ) ON CONFLICT (id) DO NOTHING;

  -- Profile 3: Grandview Grill Co. (NYC Food Truck — High Compliance, Ready for LA Multi-City Demo)
  INSERT INTO businesses (
    id, owner_id, business_name, business_type, owner_name,
    phone, email, address, cities
  ) VALUES (
    demo_grandview_biz_id, demo_owner_id, 'Grandview Grill Co.', 'food_truck', 'Owen Castillo',
    '+1 212 555 0188', 'owen@grandviewgrill.com', '100 Grandview Ave, New York, NY', '{"New York, NY"}'
  ) ON CONFLICT (id) DO NOTHING;


  -- ══════════════════════════════════════════════════════════
  -- BUSINESS REQUIREMENTS — Profile 1: Spice Garden Restaurant
  -- ══════════════════════════════════════════════════════════
  INSERT INTO business_requirements (id, business_id, requirement_id, status, license_number, issuing_authority, expiry_date) VALUES
  (br_fssai, demo_biz_id, req_fssai, 'expired', 'FSSAI-10023456789', 'Food Safety and Standards Authority of India', today - INTERVAL '12 days'),
  (br_fire, demo_biz_id, req_fire, 'in_progress', 'KSFE-BLR-2024-8821', 'Maharashtra Fire & Emergency Services', today + INTERVAL '8 days'),
  (br_trade, demo_biz_id, req_trade, 'in_progress', 'BBMP-TL-2024-445521', 'BMC (Brihatmumbai Municipal Corporation)', today + INTERVAL '23 days'),
  (br_shop, demo_biz_id, req_shop, 'in_progress', 'KLAB-SE-2024-112233', 'Maharashtra Labour Department', today + INTERVAL '52 days'),
  (br_gst, demo_biz_id, req_gst, 'satisfied', '29AABCS1429B1Z1', 'GST Council of India', today + INTERVAL '240 days'),
  (br_eating, demo_biz_id, req_eating, 'satisfied', 'BCP-EH-2024-33445', 'Mumbai City Police', today + INTERVAL '180 days');


  -- ══════════════════════════════════════════════════════════
  -- BUSINESS REQUIREMENTS — Profile 2: Rico's Curbside Kitchen (4 Status Types Split)
  -- ══════════════════════════════════════════════════════════
  INSERT INTO business_requirements (business_id, requirement_id, status, license_number, issuing_authority, expiry_date) VALUES
  -- Have it (Satisfied)
  (demo_rico_biz_id, req_nyc_3, 'satisfied', 'NYC-DOHMH-FPC-88912', 'DOHMH (NYC Dept. of Health & Mental Hygiene)', today + INTERVAL '180 days'),
  (demo_rico_biz_id, req_ein, 'satisfied', 'EIN-12-3456789', 'IRS (Internal Revenue Service)', today + INTERVAL '365 days'),
  -- Needed
  (demo_rico_biz_id, req_nyc_1, 'needed', NULL, 'DCWP (NYC Dept. of Consumer & Worker Protection)', NULL),
  (demo_rico_biz_id, req_nyc_2, 'needed', NULL, 'DOHMH (NYC Dept. of Health & Mental Hygiene)', NULL),
  (demo_rico_biz_id, req_nyc_6, 'needed', NULL, 'DOHMH Requirement', NULL),
  -- Expiring Soon (~20 days from today)
  (demo_rico_biz_id, req_nyc_4, 'in_progress', 'NYS-TAX-994821', 'NY State Dept. of Taxation & Finance', today + INTERVAL '20 days'),
  -- Lapsed / Expired (~60 days in past)
  (demo_rico_biz_id, req_nyc_5, 'expired', 'ECB-VIOL-2023-441', 'NYC ECB / OATH', today - INTERVAL '60 days');


  -- ══════════════════════════════════════════════════════════
  -- BUSINESS REQUIREMENTS — Profile 3: Grandview Grill Co. (High Compliance 100%)
  -- ══════════════════════════════════════════════════════════
  INSERT INTO business_requirements (business_id, requirement_id, status, license_number, issuing_authority, expiry_date) VALUES
  (demo_grandview_biz_id, req_ein, 'satisfied', 'EIN-98-7654321', 'IRS (Internal Revenue Service)', today + INTERVAL '365 days'),
  (demo_grandview_biz_id, req_nyc_1, 'satisfied', 'DCWP-MFV-2024-901', 'DCWP (NYC Dept. of Consumer & Worker Protection)', today + INTERVAL '240 days'),
  (demo_grandview_biz_id, req_nyc_2, 'satisfied', 'DOHMH-PERMIT-2024-551', 'DOHMH (NYC Dept. of Health & Mental Hygiene)', today + INTERVAL '300 days'),
  (demo_grandview_biz_id, req_nyc_3, 'satisfied', 'NYC-DOHMH-FPC-11029', 'DOHMH (NYC Dept. of Health & Mental Hygiene)', today + INTERVAL '210 days'),
  (demo_grandview_biz_id, req_nyc_4, 'satisfied', 'NYS-TAX-771029', 'NY State Dept. of Taxation & Finance', today + INTERVAL '330 days'),
  (demo_grandview_biz_id, req_nyc_5, 'satisfied', 'ECB-CLEAR-2024-001', 'NYC ECB / OATH', today + INTERVAL '180 days'),
  (demo_grandview_biz_id, req_nyc_6, 'satisfied', 'COMMISSARY-AGREE-2024', 'DOHMH Requirement', today + INTERVAL '270 days');


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


  RAISE NOTICE 'Demo seed data created successfully!';
END $$;
