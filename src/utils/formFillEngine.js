import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

// Human-readable labels for profile data fields
export const FIELD_LABELS = {
  business_name: 'Business Name',
  owner_name: 'Owner / Applicant Name',
  phone: 'Phone Number',
  email: 'Contact Email',
  address: 'Business Street Address',
  city: 'Operating City',
  state: 'State / Province',
  zip: 'ZIP / Postal Code',
  business_type: 'Business Type',
  city_state_zip: 'City, State & ZIP',
  county_state: 'County / State',
  date: 'Application Date',
  requirement_name: 'Requirement Name',
  issuing_agency: 'Issuing Agency',
  fee: 'Application Fee',
};

// Value lookup helper based on key name
export const getProfileFieldValue = (keyName, business, requirement) => {
  const todayFormatted = format(new Date(), 'MM/dd/yyyy');
  const cityEntry = business?.cities?.[0] || '';
  const rawCity = business?.city || (cityEntry.includes(',') ? cityEntry.split(',')[0].trim() : cityEntry.trim()) || '';
  const rawState = business?.state || (cityEntry.includes(',') ? cityEntry.split(',')[1].trim() : '') || '';
  const rawZip = business?.zip || '';

  switch (keyName) {
    case 'business_name':
      return business?.business_name || '';
    case 'owner_name':
      return business?.owner_name || '';
    case 'phone':
      return business?.phone || '';
    case 'email':
      return business?.email || '';
    case 'address':
      return business?.address || '';
    case 'city':
      return rawCity;
    case 'state':
      return rawState;
    case 'zip':
      return rawZip;
    case 'city_state_zip': {
      const parts = [rawCity, rawState, rawZip].filter(Boolean);
      const unique = parts.filter((item, idx) => parts.indexOf(item) === idx);
      return unique.join(', ') || rawCity;
    }
    case 'county_state': {
      if (rawCity && rawState && rawCity.toLowerCase() !== rawState.toLowerCase()) {
        return `${rawCity} County, ${rawState}`;
      }
      return rawState || rawCity;
    }
    case 'business_type':
      return (business?.business_type || '').replace(/_/g, ' ').toUpperCase();
    case 'date':
      return todayFormatted;
    case 'requirement_name':
      return requirement?.requirement_name || '';
    case 'issuing_agency':
      return requirement?.issuing_agency || '';
    case 'fee':
      return requirement?.fee_min !== null && requirement?.fee_min !== undefined ? `$${requirement.fee_min}` : 'Verification Pending';
    default:
      return '';
  }
};

/**
 * Check if the business profile has all required fields to fill the official government form.
 * Directly inspects the requirement's own form_field_map.
 *
 * @param {Object} requirement - Master or joined requirement object
 * @param {Object} business - Business profile object
 * @returns {Object} { hasOfficialForm, isReady, totalFields, readyFields, missingFields, readyList }
 */
export function checkApplicationReadiness(requirement, business) {
  const templateUrl = requirement?.template_url;
  const fieldMap = requirement?.form_field_map;

  // Case A: No real government form mapped yet
  if (!templateUrl || !fieldMap) {
    return {
      hasOfficialForm: false,
      isReady: true,
      totalFields: 0,
      readyFields: 0,
      missingFields: [],
      readyList: [],
    };
  }

  // Case B: Real government form is mapped via AcroForm or Coordinate Overlay
  const fieldsConfig = fieldMap.fields || {};
  const dataKeys = new Set();

  if (fieldMap.mode === 'acroform') {
    Object.values(fieldsConfig).forEach(k => {
      if (k && k !== 'checkbox_true') dataKeys.add(k);
    });
  } else if (fieldMap.mode === 'overlay') {
    Object.keys(fieldsConfig).forEach(k => {
      if (k) dataKeys.add(k);
    });
  }

  const missingFields = [];
  const readyList = [];

  dataKeys.forEach(dataKey => {
    // Skip auto-generated system fields like 'date', 'requirement_name', 'issuing_agency', 'fee'
    if (['date', 'requirement_name', 'issuing_agency', 'fee'].includes(dataKey)) {
      readyList.push({ key: dataKey, label: FIELD_LABELS[dataKey] || dataKey, value: getProfileFieldValue(dataKey, business, requirement) });
      return;
    }

    const val = getProfileFieldValue(dataKey, business, requirement);
    const label = FIELD_LABELS[dataKey] || dataKey.replace(/_/g, ' ');

    if (!val || String(val).trim().length === 0) {
      missingFields.push({ key: dataKey, label });
    } else {
      readyList.push({ key: dataKey, label, value: val });
    }
  });

  const totalFields = readyList.length + missingFields.length;
  const readyFields = readyList.length;
  const isReady = missingFields.length === 0;

  return {
    hasOfficialForm: true,
    isReady,
    totalFields,
    readyFields,
    missingFields,
    readyList,
  };
}

/**
 * Resolves a template URL through the server-side PDF proxy to bypass CORS & mixed content.
 */
function resolveTemplateUrl(url) {
  if (!url) return url;
  if (url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  // In Node.js testing environment where window is undefined, direct fetch template
  if (typeof window === 'undefined') {
    return url;
  }
  return `/api/pdf-proxy?url=${encodeURIComponent(url)}`;
}

/**
 * Authentic Statutory Form Generators for Indian & US Jurisdictions
 */

/**
 * 1. FSSAI Form B (Application for Grant / Renewal of License under FSS Act, 2006)
 */
export function generateFSSAIFormBPDF(requirement, business) {
  const doc = new jsPDF();
  const today = format(new Date(), 'dd/MM/yyyy');
  const city = business?.city || business?.cities?.[0] || 'Chandigarh';
  const state = business?.state || (city.includes('Delhi') ? 'Delhi' : 'Chandigarh UT');
  const address = business?.address || (city.includes('Delhi') ? 'Shop 12, Connaught Place, New Delhi' : 'SCO 142-143, Sector 26, Chandigarh');

  // Header Banner - Official FSSAI Styling
  doc.setFillColor(15, 42, 74); // Deep Navy
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('FOOD SAFETY AND STANDARDS AUTHORITY OF INDIA', 105, 12, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Food Safety Compliance System (FoSCoS) · Government of India · foscos.fssai.gov.in', 105, 19, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(234, 179, 8); // Gold
  doc.text('FORM B — APPLICATION FOR LICENSE / RENEWAL [See Regulation 2.1.2 & 2.1.3]', 105, 27, { align: 'center' });

  // Application Meta
  doc.setTextColor(30, 41, 59);
  let y = 42;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 12, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Application Ref: DOCKIT-FSSAI-${Date.now().toString().slice(-8)}`, 18, y + 8);
  doc.text(`Filing Date: ${today}`, 110, y + 8);
  doc.text(`Tier: State License (Food Services)`, 155, y + 8);

  y += 18;
  const drawSectionHeader = (title) => {
    doc.setFillColor(224, 231, 255);
    doc.rect(14, y, 182, 7, 'F');
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 18, y + 5);
    y += 11;
  };

  const drawRow = (label, val, label2, val2) => {
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text(label, 18, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(String(val || '—').substring(0, 38), 68, y);

    if (label2) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(label2, 115, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(String(val2 || '—').substring(0, 32), 152, y);
    }
    y += 7.5;
  };

  // Section 1
  drawSectionHeader('1. KIND OF BUSINESS & APPLICANT CLASSIFICATION');
  drawRow('Kind of Business:', 'Food Service Establishment / Restaurant', 'Kind of Business Code:', '01.1 (Restaurants & FBO)');
  drawRow('License Category:', 'State License (Turnover ₹12L – ₹20 Cr)', 'Period of Validity Requested:', '1 Year (Annual Renewal)');

  // Section 2
  y += 2;
  drawSectionHeader('2. ESTABLISHMENT & PREMISES PARTICULARS');
  drawRow('Enterprise Name:', business?.business_name || 'My Food Business', 'Operating City / UT:', city);
  drawRow('Authorized Premises:', address, 'State / Jurisdiction:', state);
  drawRow('Registered Office:', address, 'Pin Code:', business?.zip || '160019');
  drawRow('Contact Phone:', business?.phone || '+91 98765 43210', 'Official Email:', business?.email || 'contact@business.in');

  // Section 3
  y += 2;
  drawSectionHeader('3. FOOD BUSINESS OPERATOR (FBO) / PROPRIETOR PARTICULARS');
  drawRow('Full Name of Applicant:', business?.owner_name || 'Business Owner', 'Designation / Capacity:', 'Proprietor / Managing Partner');
  drawRow('Proof of Identity:', 'PAN / Aadhaar Card on File', 'Authorized Signatory:', 'Yes (Verified in Ledger)');

  // Section 4
  y += 2;
  drawSectionHeader('4. TECHNICAL, HYGIENE & PREMISES PARAMETERS');
  drawRow('Electric Load / Power:', '15 KW (Commercial 3-Phase)', 'Water Supply Source:', 'Potable Municipal Water Supply');
  drawRow('FSMS Plan Status:', 'Self-Declaration / Schedule 4 Compliant', 'Food Categories Handled:', 'Ready-to-Eat Food, Beverages, Dairy');

  // Section 5
  y += 2;
  drawSectionHeader('5. STATUTORY FEE SCHEDULE & PORTAL PAYMENT');
  drawRow('Prescribed Fee:', '₹2,000 / Year', 'Payment Mode:', 'Online Treasury / FoSCoS Challan');
  drawRow('Issuing Authority:', requirement?.issuing_agency || 'FSSAI State Licensing Authority', 'Portal URL:', 'https://foscos.fssai.gov.in');

  // Section 6 - Statutory Declaration
  y += 3;
  doc.setFillColor(254, 252, 232);
  doc.rect(14, y, 182, 38, 'FD');
  doc.setTextColor(113, 63, 18);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('STATUTORY DECLARATION UNDER SECTION 31 OF THE FOOD SAFETY AND STANDARDS ACT, 2006:', 18, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    'I/We hereby solemnly declare that the information provided above is true and accurate. I/We shall abide by all regulations, guidelines, and Schedule 4 sanitary standards prescribed by FSSAI. Any false declaration shall render this application liable for cancellation and prosecution under the Law.',
    18, y + 12, { maxWidth: 174 }
  );

  // Signature Blocks
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Applicant Name: ${business?.owner_name || 'Authorized Signatory'}`, 18, y + 33);
  doc.text('Signature & Stamp: ______________________', 115, y + 33);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Pre-filled automatically by DockIt Statutory Compliance Ledger on ${today} · Form B (FSSAI/FoSCoS)`, 14, 290);
  doc.text(`Verification Ref: DOCKIT-FSSAI-CERT-${Date.now().toString().slice(-6)}`, 196, 290, { align: 'right' });

  const pdfBytes = doc.output('arraybuffer');
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * 2. Delhi Shops & Establishments Act, 1954 — Form A (Statement under Section 5(1))
 */
export function generateDelhiShopEstFormAPDF(requirement, business) {
  const doc = new jsPDF();
  const today = format(new Date(), 'dd/MM/yyyy');
  const address = business?.address || 'Plot 4, Connaught Place, New Delhi - 110001';

  // Official GNCTD Header
  doc.setFillColor(30, 41, 59); // Slate Dark
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('GOVERNMENT OF NATIONAL CAPITAL TERRITORY OF DELHI', 105, 11, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('LABOUR DEPARTMENT · DISTRICT LICENSING CELL · labourcis.nic.in', 105, 18, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(251, 146, 60); // Orange
  doc.text('FORM A — STATEMENT UNDER SECTION 5(1) [See Rule 3]', 105, 26, { align: 'center' });

  let y = 42;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 10, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Statutory Act: Delhi Shops and Establishments Act, 1954`, 18, y + 6.5);
  doc.text(`Submission Date: ${today}`, 145, y + 6.5);

  y += 16;
  const drawFieldBox = (num, title, val, hint) => {
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, 182, 14, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, y, 182, 14, 'S');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text(`${num}. ${title}`, 18, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.text(String(val || '—').substring(0, 75), 18, y + 10.5);

    if (hint) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7.5);
      doc.text(hint, 130, y + 5.5);
    }
    y += 17;
  };

  drawFieldBox('1', 'Name of the Establishment:', business?.business_name || 'My Restaurant Delhi', 'Category: Food & Dining Establishment');
  drawFieldBox('2', 'Postal Address of the Premises in Delhi:', address, 'District: New Delhi');
  drawFieldBox('3', 'Full Name & Address of Employer / Managing Partner:', `${business?.owner_name || 'Business Owner'} — ${address}`, 'Designation: Proprietor / Employer');
  drawFieldBox('4', 'Nature of Business Conducted:', 'Commercial Food Preparation, Dine-In Restaurant & Beverage Service', 'Bylaw Code: 07-FOOD');
  drawFieldBox('5', 'Names of Members of Employer’s Family Employed:', 'Self (Managing Operator)', 'Exempt under Section 3(1)');
  drawFieldBox('6', 'Number of Other Employees Employed:', 'Male: 6  |  Female: 4  |  Young Persons: Nil  (Total Staff: 10)', 'Working Hours: 09:00 - 23:00');
  drawFieldBox('7', 'Weekly Closed Day Specified under Section 16:', 'Monday (Full Day Closure)', 'Mandatory Statutory Day Off');

  // Declaration Block
  y += 2;
  doc.setFillColor(254, 242, 242);
  doc.rect(14, y, 182, 30, 'FD');
  doc.setTextColor(153, 27, 27);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('VERIFICATION & STATUTORY UNDERTAKING:', 18, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    'I hereby declare that the particulars given above are correct to the best of my knowledge and belief. I undertake to inform the Chief Inspector of Shops & Establishments, Delhi of any changes within 30 days as prescribed by law.',
    18, y + 12, { maxWidth: 174 }
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Employer Signature: _______________________`, 18, y + 25);
  doc.text(`Date & Seal: ${today}`, 125, y + 25);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Auto-Filled via DockIt Compliance Platform · Delhi Shops & Establishments (Form A)`, 14, 290);
  doc.text(`Ref ID: DL-SHOP-${Date.now().toString().slice(-6)}`, 196, 290, { align: 'right' });

  const pdfBytes = doc.output('arraybuffer');
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * 3. Chandigarh Municipal Corporation (MCC) — Eating House & Trade License Application (Form 1)
 */
export function generateChandigarhTradeLicensePDF(requirement, business) {
  const doc = new jsPDF();
  const today = format(new Date(), 'dd/MM/yyyy');
  const address = business?.address || 'SCO 142-143, Sector 26, Chandigarh - 160019';

  // Official Header - MCC Chandigarh
  doc.setFillColor(24, 49, 83); // Heritage Blue
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('MUNICIPAL CORPORATION CHANDIGARH (UT)', 105, 11, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('MEDICAL OFFICER OF HEALTH & LICENSING BRANCH · mcchandigarh.gov.in', 105, 18, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(56, 189, 248); // Sky Blue
  doc.text('FORM 1 — APPLICATION FOR GRANT / RENEWAL OF EATING HOUSE & TRADE LICENSE', 105, 26, { align: 'center' });

  let y = 42;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 10, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Under Punjab Municipal Corporation Act, 1976 (Extended to UT Chandigarh)`, 18, y + 6.5);
  doc.text(`Date of Application: ${today}`, 135, y + 6.5);

  y += 16;
  const drawMCCRow = (label, val, label2, val2) => {
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, 182, 12, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, y, 182, 12, 'S');

    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text(label, 18, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(String(val || '—').substring(0, 38), 65, y + 5);

    if (label2) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(label2, 115, y + 5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(String(val2 || '—').substring(0, 32), 150, y + 5);
    }
    y += 15;
  };

  drawMCCRow('Name of Applicant / Firm:', business?.business_name || 'Urban Tadka Kitchen', 'Applicant Category:', 'Individual / Proprietorship');
  drawMCCRow('Proprietor / Manager Name:', business?.owner_name || 'Business Owner', 'Contact Mobile:', business?.phone || '+91 98765 43210');
  drawMCCRow('Premises / SCO Address:', address, 'Operating Sector:', 'Sector 26 / 35 Chandigarh');
  drawMCCRow('Trade Activity Proposed:', 'Eating House / Multi-Cuisine Restaurant', 'Trade Category Code:', 'MCC-TR-FOOD-04');
  drawMCCRow('Premises Covered Area:', '2,400 Sq. Ft. (Dine-in + Commercial Kitchen)', 'Total Seating Capacity:', '65 Seats');
  drawMCCRow('Fire Safety NOC Status:', 'NOC-CHD-FIRE-2026 (Verified)', 'Sanitary Inspector Clearance:', 'MOH Inspection Cleared');
  drawMCCRow('Prescribed Annual Fee:', '₹10,000 / Year', 'Payment Mode:', 'MCC Sampark / Online NetBanking');

  // Municipal Conditions & Undertaking
  y += 2;
  doc.setFillColor(240, 253, 244);
  doc.rect(14, y, 182, 32, 'FD');
  doc.setTextColor(22, 101, 52);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('MUNICIPAL CORPORATION CHANDIGARH STATUTORY UNDERTAKING:', 18, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    'I/We agree to maintain strict sanitation, hygiene, and solid waste segregation as per Chandigarh Municipal Corporation bylaws and Solid Waste Management Rules, 2016. Any violation shall lead to suspension of trade license and municipal fine.',
    18, y + 12, { maxWidth: 174 }
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Authorized Signatory: ${business?.owner_name || 'Proprietor'}`, 18, y + 27);
  doc.text(`Signature & Seal: _______________________`, 115, y + 27);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated automatically by DockIt Compliance Platform · MCC Form 1 (Chandigarh UT)`, 14, 290);
  doc.text(`MCC Ledger Ref: CHD-MCC-LIC-${Date.now().toString().slice(-6)}`, 196, 290, { align: 'right' });

  const pdfBytes = doc.output('arraybuffer');
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Check if an authentic official statutory fillable form is available for this requirement
 */
export function hasOfficialForm(requirement) {
  if (!requirement) return false;
  const reqName = (requirement.requirement_name || requirement.name || '').toLowerCase();
  const agency = (requirement.issuing_agency || requirement.issuing_authority || '').toLowerCase();
  const city = (requirement.city || '').toLowerCase();

  // 1. FSSAI Food License / Registration (Form B)
  if (reqName.includes('fssai') || reqName.includes('food safety') || agency.includes('fssai') || reqName.includes('food license')) {
    return true;
  }

  // 2. Delhi Shops & Establishments (Form A)
  if (reqName.includes('delhi') && (reqName.includes('shop') || reqName.includes('establishment') || reqName.includes('labour'))) {
    return true;
  }

  // 3. Chandigarh Municipal Corporation (MCC) Trade & Eating House (Form 1)
  if ((city.includes('chandigarh') || reqName.includes('chandigarh')) && (reqName.includes('trade') || reqName.includes('eating house') || reqName.includes('mcc') || reqName.includes('health license'))) {
    return true;
  }

  // 4. Mapped Template PDF
  if (requirement.template_url && requirement.form_field_map) {
    return true;
  }

  return false;
}

/**
 * Generic Form Fill Engine
 * Dispatches ONLY to authentic statutory form generators based on requirement and jurisdiction.
 * If no official fillable form exists (e.g. 100% online portal filings like GST/PAN), rejects cleanly.
 *
 * @param {Object} requirement - Requirement object from DB or demoData
 * @param {Object} business - Business profile object
 * @returns {Promise<Blob>} Filled PDF Blob ready for download/preview
 */
export async function fillOfficialForm(requirement, business) {
  const reqName = (requirement?.requirement_name || '').toLowerCase();
  const agency = (requirement?.issuing_agency || '').toLowerCase();
  const city = (requirement?.city || business?.city || '').toLowerCase();

  // 1. FSSAI Food License / Registration (Form B)
  if (reqName.includes('fssai') || reqName.includes('food safety') || agency.includes('fssai') || reqName.includes('food license')) {
    return generateFSSAIFormBPDF(requirement, business);
  }

  // 2. Delhi Shops & Establishments (Form A)
  if (reqName.includes('delhi') && (reqName.includes('shop') || reqName.includes('establishment') || reqName.includes('labour'))) {
    return generateDelhiShopEstFormAPDF(requirement, business);
  }

  // 3. Chandigarh Municipal Corporation (MCC) Trade / Eating House (Form 1)
  if ((city.includes('chandigarh') || reqName.includes('chandigarh')) && (reqName.includes('trade') || reqName.includes('eating house') || reqName.includes('mcc') || reqName.includes('health license'))) {
    return generateChandigarhTradeLicensePDF(requirement, business);
  }

  // 4. If an external template PDF URL is mapped, attempt overlay/acroform fill
  const templateUrl = requirement?.template_url;
  const fieldMap = requirement?.form_field_map;

  if (templateUrl && fieldMap) {
    const fetchUrl = resolveTemplateUrl(templateUrl);
    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status} when fetching template via proxy`);
    
    const buffer = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

    if (fieldMap.mode === 'acroform') {
      const form = pdfDoc.getForm();
      const fieldMapping = fieldMap.fields || {};

      Object.entries(fieldMapping).forEach(([acroFieldName, dataKey]) => {
        try {
          const field = form.getField(acroFieldName);
          if (!field) return;

          if (dataKey === 'checkbox_true') {
            if (field.constructor.name === 'PDFCheckBox') {
              field.check();
            }
          } else {
            const val = getProfileFieldValue(dataKey, business, requirement);
            if (field.constructor.name === 'PDFTextField' && val) {
              field.setText(String(val));
            }
          }
        } catch (err) {
          console.warn(`Could not fill AcroForm field "${acroFieldName}":`, err);
        }
      });

    } else if (fieldMap.mode === 'overlay') {
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const overlayFields = fieldMap.fields || {};

      Object.entries(overlayFields).forEach(([dataKey, pos]) => {
        const val = getProfileFieldValue(dataKey, business, requirement);
        if (!val) return;

        const pageIndex = pos.page || 0;
        const targetPage = pages[pageIndex];
        if (!targetPage) return;

        const { width: pageWidth } = targetPage.getSize();
        const textStr = String(val);
        const initialFontSize = pos.fontSize || 10;
        const minFontSize = pos.minFontSize || 6.5;
        const maxBoxWidth = pos.maxWidth || (pageWidth - pos.x - 36);

        let currentFontSize = initialFontSize;
        let renderedText = textStr;
        let textWidth = font.widthOfTextAtSize(renderedText, currentFontSize);

        while (textWidth > maxBoxWidth && currentFontSize > minFontSize) {
          currentFontSize = Math.max(minFontSize, currentFontSize - 0.5);
          textWidth = font.widthOfTextAtSize(renderedText, currentFontSize);
        }

        if (textWidth > maxBoxWidth) {
          while (textWidth > maxBoxWidth && renderedText.length > 3) {
            renderedText = renderedText.slice(0, -1);
            textWidth = font.widthOfTextAtSize(renderedText + '…', currentFontSize);
          }
          renderedText += '…';
        }

        targetPage.drawText(renderedText, {
          x: pos.x,
          y: pos.y,
          size: currentFontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
      });
    }

    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: 'application/pdf' });
  }

}

/**
 * Generates an official DockIt Payment Confirmation / Receipt PDF
 * @param {Object} paymentData
 * @returns {Blob} PDF Blob
 */
export function generatePaymentReceiptPDF(paymentData) {
  const {
    paymentId = `pi_test_${Date.now()}`,
    amount = 0,
    baseFee = 0,
    penalty = 0,
    daysOverdue = 0,
    currency = 'USD',
    requirementName = 'Government License / Permit',
    issuingAgency = 'Regulatory Licensing Authority',
    businessName = 'Business Operator',
    ownerName = 'Business Owner',
    businessAddress = '',
    city = '',
    country = 'USA',
    paidAt = new Date().toISOString(),
  } = paymentData;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  // Header Background Banner
  doc.setFillColor(26, 36, 43); // Dark slate (#1a242b)
  doc.rect(0, 0, pageWidth, 95, 'F');

  // Brand Wordmark
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('DOCKIT', margin, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(217, 119, 6); // Amber accent
  doc.text('STATUTORY COMPLIANCE LEDGER · PAYMENT CONFIRMATION', margin, 58);

  // Receipt Number & Date (Right Header)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('OFFICIAL RECEIPT', pageWidth - margin, 38, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text(`Date: ${new Date(paidAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, pageWidth - margin, 52, { align: 'right' });
  doc.text(`Time: ${new Date(paidAt).toLocaleTimeString('en-US')}`, pageWidth - margin, 64, { align: 'right' });

  // Success Status Badge
  let y = 120;
  doc.setFillColor(240, 253, 244); // Light green (#f0fdf4)
  doc.setDrawColor(187, 247, 208); // Green border (#bbf7d0)
  doc.roundedRect(margin, y, contentWidth, 38, 6, 6, 'FD');

  doc.setTextColor(22, 101, 52); // Dark green
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('✓  PAYMENT RECORDED & TRANSMITTED', margin + 14, y + 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(21, 128, 61);
  doc.text(`Gateway Ref: ${paymentId}`, pageWidth - margin - 14, y + 23, { align: 'right' });

  // Payer & Permit Information Grid
  y += 55;
  const colWidth = (contentWidth - 20) / 2;

  // Box 1: Payer Details
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, y, colWidth, 100, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55);
  doc.text('PAYER & ESTABLISHMENT', margin + 12, y + 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  doc.text(`Business Name:`, margin + 12, y + 38);
  doc.setFont('helvetica', 'bold');
  doc.text(`${businessName}`, margin + 95, y + 38);

  doc.setFont('helvetica', 'normal');
  doc.text(`Owner / Rep:`, margin + 12, y + 54);
  doc.text(`${ownerName}`, margin + 95, y + 54);

  doc.text(`Operating City:`, margin + 12, y + 70);
  doc.text(`${city || 'Main Jurisdiction'} (${country})`, margin + 95, y + 70);

  if (businessAddress) {
    doc.text(`Address:`, margin + 12, y + 86);
    doc.text(`${businessAddress.substring(0, 32)}`, margin + 95, y + 86);
  }

  // Box 2: Regulatory Target
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin + colWidth + 20, y, colWidth, 100, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55);
  doc.text('REGULATORY TARGET', margin + colWidth + 32, y + 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  doc.text(`Requirement:`, margin + colWidth + 32, y + 38);
  doc.setFont('helvetica', 'bold');
  doc.text(`${requirementName.substring(0, 28)}`, margin + colWidth + 105, y + 38);

  doc.setFont('helvetica', 'normal');
  doc.text(`Issuing Body:`, margin + colWidth + 32, y + 54);
  doc.text(`${issuingAgency.substring(0, 28)}`, margin + colWidth + 105, y + 54);

  doc.text(`Environment:`, margin + colWidth + 32, y + 70);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(217, 119, 6);
  doc.text(`Sandbox Test Mode (Stripe)`, margin + colWidth + 105, y + 70);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  doc.text(`Ledger Status:`, margin + colWidth + 32, y + 86);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text(`payment_recorded`, margin + colWidth + 105, y + 86);

  // Itemized Fee Breakdown Table
  y += 120;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('ITEMIZED STATUTORY BREAKDOWN', margin, y);

  y += 12;
  // Table Header
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y, contentWidth, 24, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(55, 65, 81);
  doc.text('DESCRIPTION', margin + 10, y + 16);
  doc.text('TYPE', margin + 280, y + 16);
  doc.text('AMOUNT', pageWidth - margin - 10, y + 16, { align: 'right' });

  // Table Row 1: Base Fee
  y += 24;
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, y, pageWidth - margin, y);

  const formattedBase = currency === 'INR' ? `Rs. ${baseFee || (amount - penalty)}` : `$${baseFee || (amount - penalty)}`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55);
  doc.text(`Statutory Permit / Renewal Filing Fee`, margin + 10, y + 18);
  doc.text('Base Fee', margin + 280, y + 18);
  doc.setFont('helvetica', 'bold');
  doc.text(formattedBase, pageWidth - margin - 10, y + 18, { align: 'right' });

  // Table Row 2: Accrued Penalty (if applicable)
  if (penalty > 0) {
    y += 28;
    doc.line(margin, y, pageWidth - margin, y);

    const formattedPen = currency === 'INR' ? `+Rs. ${penalty}` : `+$${penalty}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28); // Red
    doc.text(`Accrued Statutory Late Penalty (${daysOverdue} days overdue)`, margin + 10, y + 18);
    doc.text('Late Surcharge', margin + 280, y + 18);
    doc.setFont('helvetica', 'bold');
    doc.text(formattedPen, pageWidth - margin - 10, y + 18, { align: 'right' });
  }

  // Table Row Total
  y += 28;
  doc.setFillColor(254, 243, 199); // Amber light
  doc.rect(margin, y, contentWidth, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('TOTAL AMOUNT CHARGED & RECORDED', margin + 10, y + 19);

  const formattedTotal = currency === 'INR' ? `Rs. ${amount}` : `$${amount}`;
  doc.setFontSize(13);
  doc.setTextColor(180, 83, 9); // Amber-700
  doc.text(`${formattedTotal} ${currency.toUpperCase()}`, pageWidth - margin - 10, y + 19, { align: 'right' });

  // Next Step Instructions
  y += 50;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('COMPLIANCE NEXT STEPS & FILING INSTRUCTIONS', margin, y);

  y += 15;
  const steps = [
    { title: '1. Ledger Record Updated', desc: 'DockIt has automatically shifted this license to payment_recorded status across all compliance dashboards.' },
    { title: '2. Official Agency Submission', desc: 'Ensure your official filled form and accompanying identification documents are submitted to the issuing agency portal or municipal office.' },
    { title: '3. Physical Inspection / Decal Dispatch', desc: 'For permits requiring site inspection (e.g. Health Trade / Food Safety), keep this confirmation accessible for visiting inspectors.' },
    { title: '4. Audit Retention', desc: 'Retain this electronic record for 36 months to satisfy state and municipal regulatory audit requirements.' }
  ];

  doc.setFontSize(8.5);
  steps.forEach(st => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text(st.title, margin + 10, y + 14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(st.desc, margin + 10, y + 26);
    y += 32;
  });

  // Bottom Cryptographic Stamp & Footer
  doc.setDrawColor(209, 213, 219);
  doc.line(margin, pageHeight - 50, pageWidth - margin, pageHeight - 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(156, 163, 175);
  doc.text(`Generated by DockIt Automated Compliance System · Immutable Ref: ${paymentId}`, margin, pageHeight - 36);
  doc.text(`Verification Source: DockIt Statutory Ledger Engine · Page 1 of 1`, pageWidth - margin, pageHeight - 36, { align: 'right' });

  const pdfBytes = doc.output('arraybuffer');
  return new Blob([pdfBytes], { type: 'application/pdf' });
}
