-- ═══════════════════════════════════════════════════════════
-- DockIt — Requirements Catalog Seed (NO user UUID needed)
-- Run this in Supabase SQL Editor to populate the master catalog.
-- Safe to re-run — uses ON CONFLICT DO NOTHING.
-- ═══════════════════════════════════════════════════════════

-- ── Mumbai Restaurants ────────────────────────────────────
INSERT INTO requirements (business_type, city, jurisdiction_level, requirement_name, issuing_agency, fee_min, fee_max, renewal_cycle_months, processing_time, description, source_url, last_verified_date) VALUES
('restaurant', 'Mumbai, Maharashtra', 'federal', 'FSSAI Food License', 'Food Safety and Standards Authority of India', 2000, 5000, 12, '7-14 business days', 'Mandatory food safety license for any food business in India. Required for manufacturing, storage, distribution, and sale of food.', 'https://foscos.fssai.gov.in', CURRENT_DATE),
('restaurant', 'Mumbai, Maharashtra', 'state',   'Fire NOC', 'Maharashtra Fire & Emergency Services', 1000, 10000, 12, '14-30 business days', 'No Objection Certificate from fire department certifying fire safety compliance of the premises.', 'https://mumbaimunicipal.gov.in', CURRENT_DATE),
('restaurant', 'Mumbai, Maharashtra', 'city',    'Trade License', 'BMC (Brihatmumbai Municipal Corporation)', 5000, 25000, 12, '7-21 business days', 'Municipal trade license permitting commercial business operations within city jurisdiction.', 'https://portal.mcgm.gov.in', CURRENT_DATE),
('restaurant', 'Mumbai, Maharashtra', 'state',   'Shop & Establishment Registration', 'Maharashtra Labour Department', 500, 2000, 12, '7-14 business days', 'Registration under the Shops and Establishments Act for regulating working conditions and employee welfare.', 'https://mahashramm.gov.in', CURRENT_DATE),
('restaurant', 'Mumbai, Maharashtra', 'city',    'Eating House License', 'Mumbai City Police', 2000, 5000, 12, '21-45 business days', 'Police license required for any establishment serving food and beverages. Ensures public safety compliance.', 'https://mumbaipolice.gov.in', CURRENT_DATE),
('restaurant', 'Mumbai, Maharashtra', 'city',    'Signage / Hoarding License', 'BMC Advertisement Department', 1000, 15000, 12, '14-30 business days', 'License for displaying business signage, hoardings, or advertisements on or near the premises.', 'https://portal.mcgm.gov.in', CURRENT_DATE)
ON CONFLICT (business_type, city, requirement_name) DO NOTHING;

-- ── Federal / All Cities (India) ──────────────────────────
INSERT INTO requirements (business_type, city, jurisdiction_level, requirement_name, issuing_agency, fee_min, fee_max, renewal_cycle_months, processing_time, description, source_url, last_verified_date) VALUES
('all', 'Federal / All Cities', 'federal', 'GST Registration', 'GST Council of India', 0, 0, NULL, '3-7 business days', 'Goods and Services Tax registration. Mandatory for businesses with annual turnover exceeding statutory threshold.', 'https://www.gst.gov.in', CURRENT_DATE),
('all', 'Federal / All Cities', 'federal', 'Permanent Account Number (PAN)', 'Income Tax Department (India)', 107, 107, NULL, '10-15 business days', 'Ten-digit alphanumeric identifier issued by the Income Tax Department of India for all legal and tax reporting entities. (Fee note: estimate — ₹107 NSDL physical card fee; verify against current official NSDL/UTIITSL fee schedule before demo)', 'https://www.incometax.gov.in', CURRENT_DATE)
ON CONFLICT (business_type, city, requirement_name) DO NOTHING;

-- ── New Delhi, Delhi (Restaurant) ──────────────────────────
INSERT INTO requirements (business_type, city, jurisdiction_level, requirement_name, issuing_agency, fee_min, fee_max, renewal_cycle_months, processing_time, description, source_url, last_verified_date) VALUES
('restaurant', 'New Delhi, Delhi', 'city', 'MCD Health Trade License', 'Municipal Corporation of Delhi (MCD)', 1000, 1000, 36, '15-30 business days', 'Mandatory health trade license issued by Municipal Corporation of Delhi for eating and food establishments. (Fee note: ₹1,000 new application fee, ₹500 renewal)', 'https://mcdonline.nic.in/portal/citizenCharter', CURRENT_DATE)
ON CONFLICT (business_type, city, requirement_name) DO NOTHING;

-- ── Chandigarh (Restaurant) ────────────────────────────────
INSERT INTO requirements (business_type, city, jurisdiction_level, requirement_name, issuing_agency, fee_min, fee_max, renewal_cycle_months, processing_time, description, source_url, last_verified_date) VALUES
('restaurant', 'Chandigarh', 'city', 'Shop & Establishment Registration', 'Chandigarh Labour Department', NULL, NULL, 12, '7-14 business days', 'Statutory registration for commercial establishments under the Punjab Shops and Commercial Establishments Act, 1958 as applicable to the Union Territory of Chandigarh. (Fee note: unverified — verify against official Chandigarh Labour Department fee schedule before demo)', 'https://chandigarh.gov.in', CURRENT_DATE)
ON CONFLICT (business_type, city, requirement_name) DO NOTHING;

-- ── Federal / All Cities (USA) ─────────────────────────────
INSERT INTO requirements (business_type, city, jurisdiction_level, requirement_name, issuing_agency, fee_min, fee_max, renewal_cycle_months, processing_time, description, source_url, template_url, form_field_map, last_verified_date) VALUES
('all', 'Federal / All Cities', 'federal', 'Employer Identification Number (EIN)', 'IRS (Internal Revenue Service)', 0, 0, NULL, 'Instant online', 'Federal Tax Identification Number issued by the Internal Revenue Service for business tax reporting and hiring employees.', 'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online', 'https://www.irs.gov/pub/irs-pdf/fss4.pdf', '{"mode":"acroform","fields":{"topmostSubform[0].Page1[0].f1_2[0]":"business_name","topmostSubform[0].Page1[0].f1_3[0]":"business_name","topmostSubform[0].Page1[0].f1_4[0]":"owner_name","topmostSubform[0].Page1[0].Line4ReadOrder[0].f1_5[0]":"address","topmostSubform[0].Page1[0].Line4ReadOrder[0].f1_6[0]":"city_state_zip","topmostSubform[0].Page1[0].f1_9[0]":"county_state","topmostSubform[0].Page1[0].f1_10[0]":"owner_name","topmostSubform[0].Page1[0].f1_18[0]":"business_type"}}', CURRENT_DATE)
ON CONFLICT (business_type, city, requirement_name) DO UPDATE SET
  template_url = EXCLUDED.template_url,
  form_field_map = EXCLUDED.form_field_map;

-- ── New York, NY (Food Truck) ──────────────────────────────
INSERT INTO requirements (business_type, city, jurisdiction_level, requirement_name, issuing_agency, fee_min, fee_max, renewal_cycle_months, processing_time, description, source_url, template_url, form_field_map, last_verified_date) VALUES
('food_truck', 'New York, NY', 'city',  'Mobile Food Vending License',
 'DCWP (NYC Dept. of Consumer & Worker Protection)', NULL, NULL, 24, '14-30 business days',
 'Personal license authorizing an individual to vend food from a mobile food unit in NYC public space.',
 'https://nyc-business.nyc.gov/nycbusiness/description/mobile-food-vending-license',
 'https://www.nyc.gov/assets/doh/downloads/pdf/sbs/314c-standard-form.pdf',
 '{"mode":"overlay","fields":{"business_name":{"page":0,"x":140,"y":665,"fontSize":10},"owner_name":{"page":0,"x":140,"y":635,"fontSize":10},"phone":{"page":0,"x":420,"y":635,"fontSize":10},"email":{"page":0,"x":140,"y":610,"fontSize":10},"address":{"page":0,"x":140,"y":585,"fontSize":10},"city":{"page":0,"x":420,"y":585,"fontSize":10},"business_type":{"page":0,"x":140,"y":555,"fontSize":10},"date":{"page":0,"x":450,"y":710,"fontSize":10}}}',
 CURRENT_DATE),

('food_truck', 'New York, NY', 'city',  'Mobile Food Vendor (MFV) Permit',
 'DOHMH (NYC Dept. of Health & Mental Hygiene)', NULL, NULL, 24, '30-60 business days',
 'Permit authorizing the operation of a specific mobile food vending truck or pushcart unit.',
 'https://www.nyc.gov/site/doh/business/food-operators/mobile-and-temporary-food-vendors.page',
 'https://www.nyc.gov/assets/doh/downloads/pdf/sbs/314c-standard-form.pdf',
 '{"mode":"overlay","fields":{"business_name":{"page":0,"x":140,"y":665,"fontSize":10},"owner_name":{"page":0,"x":140,"y":635,"fontSize":10},"phone":{"page":0,"x":420,"y":635,"fontSize":10},"email":{"page":0,"x":140,"y":610,"fontSize":10},"address":{"page":0,"x":140,"y":585,"fontSize":10},"city":{"page":0,"x":420,"y":585,"fontSize":10},"business_type":{"page":0,"x":140,"y":555,"fontSize":10},"date":{"page":0,"x":450,"y":710,"fontSize":10}}}',
 CURRENT_DATE),

('food_truck', 'New York, NY', 'city',  'Mobile Food Vendor Food Protection Certificate',
 'DOHMH (NYC Dept. of Health & Mental Hygiene)', NULL, NULL, NULL, '1-3 business days',
 'Mandatory food protection and safety manager certificate for supervisors of mobile food vending operations.',
 'https://www.nyc.gov/site/doh/business/food-operators/mobile-and-temporary-food-vendors.page',
 'https://www.nyc.gov/assets/doh/downloads/pdf/sbs/314c-standard-form.pdf',
 '{"mode":"overlay","fields":{"business_name":{"page":0,"x":140,"y":665,"fontSize":10},"owner_name":{"page":0,"x":140,"y":635,"fontSize":10},"phone":{"page":0,"x":420,"y":635,"fontSize":10},"email":{"page":0,"x":140,"y":610,"fontSize":10},"address":{"page":0,"x":140,"y":585,"fontSize":10},"city":{"page":0,"x":420,"y":585,"fontSize":10},"business_type":{"page":0,"x":140,"y":555,"fontSize":10},"date":{"page":0,"x":450,"y":710,"fontSize":10}}}',
 CURRENT_DATE),

('food_truck', 'New York, NY', 'state', 'NYS Certificate of Authority (Sales Tax)',
 'NY State Dept. of Taxation & Finance', NULL, NULL, NULL, '5-10 business days',
 'State certificate authorizing collection of sales tax on retail food and beverage sales in New York.',
 'https://www.tax.ny.gov', NULL, NULL, CURRENT_DATE),

('food_truck', 'New York, NY', 'city',  'Environmental Control Board (ECB) Clearance',
 'NYC ECB / OATH', NULL, NULL, 12, '1-5 business days',
 'Clearance certificate confirming all outstanding NYC ECB vendor notices and violations are cleared.',
 'https://nyc-business.nyc.gov/nycbusiness/description/mobile-food-vending-license', NULL, NULL, CURRENT_DATE),

('food_truck', 'New York, NY', 'city',  'Commissary Agreement',
 'DOHMH Requirement', NULL, NULL, 12, '1-7 business days',
 'Official written agreement with a licensed commercial kitchen/commissary for daily servicing and food storage.',
 'https://nyc-business.nyc.gov/nycbusiness/description/mobile-food-vending-unit-permit-full-term',
 'https://www.nyc.gov/assets/doh/downloads/pdf/sbs/314c-standard-form.pdf',
 '{"mode":"overlay","fields":{"business_name":{"page":0,"x":140,"y":665,"fontSize":10},"owner_name":{"page":0,"x":140,"y":635,"fontSize":10},"phone":{"page":0,"x":420,"y":635,"fontSize":10},"email":{"page":0,"x":140,"y":610,"fontSize":10},"address":{"page":0,"x":140,"y":585,"fontSize":10},"city":{"page":0,"x":420,"y":585,"fontSize":10},"business_type":{"page":0,"x":140,"y":555,"fontSize":10},"date":{"page":0,"x":450,"y":710,"fontSize":10}}}',
 CURRENT_DATE)
ON CONFLICT (business_type, city, requirement_name) DO NOTHING;

-- ── New York, NY (Restaurant) ──────────────────────────────
INSERT INTO requirements (business_type, city, jurisdiction_level, requirement_name, issuing_agency, fee_min, fee_max, renewal_cycle_months, processing_time, description, source_url, last_verified_date) VALUES
('restaurant', 'New York, NY', 'city',  'Food Service Establishment Permit',
 'DOHMH (NYC Dept. of Health & Mental Hygiene)', 280, 280, 12, '14-30 business days',
 'Mandatory health permit for operating any restaurant or food service establishment in NYC.',
 'https://www.nyc.gov/site/doh/business/food-operators/food-service-establishment-permits.page', CURRENT_DATE),

('restaurant', 'New York, NY', 'city',  'Food Protection Certificate',
 'DOHMH (NYC Dept. of Health & Mental Hygiene)', 114, 114, NULL, '1-3 business days',
 'Mandatory certificate required for restaurant supervisors overseeing food preparation in NYC.',
 'https://www.nyc.gov/site/doh/business/food-operators/food-safety-course.page', CURRENT_DATE),

('restaurant', 'New York, NY', 'state', 'NYS Certificate of Authority (Sales Tax)',
 'NY State Dept. of Taxation & Finance', 0, 0, NULL, '5-10 business days',
 'State certificate authorizing collection of sales tax on retail food and beverage sales in New York.',
 'https://www.tax.ny.gov', CURRENT_DATE),

('restaurant', 'New York, NY', 'federal', 'Employer Identification Number (EIN)',
 'IRS (Internal Revenue Service)', 0, 0, NULL, 'Instant online',
 'Federal Tax Identification Number issued by the IRS for business tax reporting.',
 'https://www.irs.gov', CURRENT_DATE)
ON CONFLICT (business_type, city, requirement_name) DO NOTHING;

-- ── Los Angeles, CA (Food Truck) ───────────────────────────
INSERT INTO requirements (business_type, city, jurisdiction_level, requirement_name, issuing_agency, fee_min, fee_max, renewal_cycle_months, processing_time, description, source_url, template_url, form_field_map, last_verified_date) VALUES
('food_truck', 'Los Angeles, CA', 'city',  'LA County Mobile Food Facility (MFF) Permit',
 'LACDPH (LA County Dept. of Public Health)', NULL, NULL, 12, '14-30 business days',
 'Public health permit authorizing mobile food facility operations within LA County jurisdictions.',
 'https://ftala.org/Permits-and-Licenses-2025',
 'http://publichealth.lacounty.gov/eh/docs/permit/Public-Health-Permit-License-Application.pdf',
 '{"mode":"acroform","fields":{"LEGAL NAME OF BUSINESS DBA":"business_name","Business Street AddressRow1":"address","CityRow1":"city","ZipRow1":"zip","OWNER 1":"owner_name","PhoneOWNER 1":"phone","EmailOWNER 1":"email","Print Name Title":"owner_name","Date of Application":"date","Signature Date":"date","Mobile Food Facility":"checkbox_true","New Business":"checkbox_true"}}',
 CURRENT_DATE),

('food_truck', 'Los Angeles, CA', 'city',  'City of LA Business Tax Registration Certificate (BTRC)',
 'City of LA Office of Finance', NULL, NULL, 12, '3-7 business days',
 'Mandatory municipal tax registration for doing business within the City of Los Angeles limits.',
 'https://streetlegal.io/blog/california/los-angeles-food-truck-permit-guide', NULL, NULL, CURRENT_DATE),

('food_truck', 'Los Angeles, CA', 'state', 'California Seller''s Permit',
 'CDTFA (California Dept. of Tax & Fee Administration)', NULL, NULL, NULL, '1-5 business days',
 'State sales tax permit required for retail sales of food and goods within California.',
 'https://streetlegal.io/blog/california/los-angeles-food-truck-permit-guide', NULL, NULL, CURRENT_DATE),

('food_truck', 'Los Angeles, CA', 'city',  'Commissary Letter of Agreement',
 'LACDPH Requirement', NULL, NULL, 12, '1-7 business days',
 'Formally executed agreement with an approved commercial commissary facility for cleaning, filling, and storage.',
 'https://streetlegal.io/blog/california/los-angeles-food-truck-permit-guide',
 'http://publichealth.lacounty.gov/eh/docs/permit/Public-Health-Permit-License-Application.pdf',
 '{"mode":"acroform","fields":{"LEGAL NAME OF BUSINESS DBA":"business_name","Business Street AddressRow1":"address","CityRow1":"city","ZipRow1":"zip","OWNER 1":"owner_name","PhoneOWNER 1":"phone","EmailOWNER 1":"email","Print Name Title":"owner_name","Date of Application":"date","Signature Date":"date","Mobile Food Facility":"checkbox_true","New Business":"checkbox_true"}}',
 CURRENT_DATE),

('food_truck', 'Los Angeles, CA', 'state', 'California Food Handler Card',
 'CA Dept. of Public Health', NULL, NULL, 36, '1-2 business days',
 'State-mandated food handler training certificate for food service workers in food facility operations.',
 'https://getvendorloop.com/guides/how-to-start-a-food-truck-in-los-angeles', NULL, NULL, CURRENT_DATE),

('food_truck', 'Los Angeles, CA', 'city',  'Food Protection Manager Certification',
 'LACDPH', NULL, NULL, 60, '1-5 business days',
 'Certified food safety manager accreditation required for person-in-charge of mobile food facilities.',
 'https://getvendorloop.com/guides/how-to-start-a-food-truck-in-los-angeles',
 'http://publichealth.lacounty.gov/eh/docs/permit/Public-Health-Permit-License-Application.pdf',
 '{"mode":"acroform","fields":{"LEGAL NAME OF BUSINESS DBA":"business_name","Business Street AddressRow1":"address","CityRow1":"city","ZipRow1":"zip","OWNER 1":"owner_name","PhoneOWNER 1":"phone","EmailOWNER 1":"email","Print Name Title":"owner_name","Date of Application":"date","Signature Date":"date","Mobile Food Facility":"checkbox_true","New Business":"checkbox_true"}}',
 CURRENT_DATE),

('food_truck', 'Los Angeles, CA', 'state', 'HCD Insignia (Vehicle Inspection)',
 'CA Dept. of Housing & Community Development', NULL, NULL, NULL, '14-30 business days',
 'State safety certification insignia for commercial mobile food trucks and trailers with electrical or gas systems.',
 'https://runpitstop.com/blog/food-truck-permits-california', NULL, NULL, CURRENT_DATE)
ON CONFLICT (business_type, city, requirement_name) DO NOTHING;

-- ── Los Angeles, CA (Restaurant) ───────────────────────────
INSERT INTO requirements (business_type, city, jurisdiction_level, requirement_name, issuing_agency, fee_min, fee_max, renewal_cycle_months, processing_time, description, source_url, template_url, form_field_map, last_verified_date) VALUES
('restaurant', 'Los Angeles, CA', 'city',  'LA County Public Health Permit',
 'LACDPH (LA County Dept. of Public Health)', 450, 950, 12, '14-30 business days',
 'Mandatory public health operating permit for food service establishments in LA County.',
 'http://publichealth.lacounty.gov/eh',
 'http://publichealth.lacounty.gov/eh/docs/permit/Public-Health-Permit-License-Application.pdf',
 '{"mode":"acroform","fields":{"LEGAL NAME OF BUSINESS DBA":"business_name","Business Street AddressRow1":"address","CityRow1":"city","ZipRow1":"zip","OWNER 1":"owner_name","PhoneOWNER 1":"phone","EmailOWNER 1":"email","Print Name Title":"owner_name","Date of Application":"date","Signature Date":"date","New Business":"checkbox_true"}}',
 CURRENT_DATE),

('restaurant', 'Los Angeles, CA', 'city',  'City of LA Business Tax Registration Certificate (BTRC)',
 'City of LA Office of Finance', 0, 150, 12, '3-7 business days',
 'Mandatory municipal tax registration for doing business within City of Los Angeles limits.',
 'https://streetlegal.io/blog/california/los-angeles-food-truck-permit-guide', NULL, NULL, CURRENT_DATE),

('restaurant', 'Los Angeles, CA', 'state', 'California Seller''s Permit',
 'CDTFA (California Dept. of Tax & Fee Administration)', 0, 0, NULL, '1-5 business days',
 'State sales tax permit required for retail sales of food and goods within California.',
 'https://streetlegal.io/blog/california/los-angeles-food-truck-permit-guide', NULL, NULL, CURRENT_DATE),

('restaurant', 'Los Angeles, CA', 'state', 'California Food Handler Card',
 'CA Dept. of Public Health', 15, 30, 36, '1-2 business days',
 'State-mandated food handler training certificate for food service workers.',
 'https://getvendorloop.com/guides/how-to-start-a-food-truck-in-los-angeles', NULL, NULL, CURRENT_DATE),

('restaurant', 'Los Angeles, CA', 'city',  'Food Protection Manager Certification',
 'LACDPH', 150, 200, 60, '1-5 business days',
 'Certified food safety manager accreditation required for person-in-charge of food facility operations.',
 'https://getvendorloop.com/guides/how-to-start-a-food-truck-in-los-angeles',
 'http://publichealth.lacounty.gov/eh/docs/permit/Public-Health-Permit-License-Application.pdf',
 '{"mode":"acroform","fields":{"LEGAL NAME OF BUSINESS DBA":"business_name","Business Street AddressRow1":"address","CityRow1":"city","ZipRow1":"zip","OWNER 1":"owner_name","PhoneOWNER 1":"phone","EmailOWNER 1":"email","Print Name Title":"owner_name","Date of Application":"date","Signature Date":"date","New Business":"checkbox_true"}}',
 CURRENT_DATE)
ON CONFLICT (business_type, city, requirement_name) DO NOTHING;

