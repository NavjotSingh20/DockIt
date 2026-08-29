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
 * Generic Form Fill Engine
 * Loads a requirement's official PDF template (if mapped) and fills it either via:
 * 1. AcroForm fields (if form_field_map.mode === 'acroform')
 * 2. Coordinate-based text overlay (if form_field_map.mode === 'overlay')
 * 3. jsPDF Application Summary Sheet (Fallback if no template_url or download fails)
 *
 * @param {Object} requirement - Requirement object from DB or demoData
 * @param {Object} business - Business profile object
 * @returns {Promise<Blob>} Filled PDF Blob ready for download/preview
 */
export async function fillOfficialForm(requirement, business) {
  const templateUrl = requirement?.template_url;
  const fieldMap = requirement?.form_field_map;

  // Try loading and filling official template PDF if template_url is present
  if (templateUrl && fieldMap) {
    try {
      const fetchUrl = resolveTemplateUrl(templateUrl);
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status} when fetching template via proxy`);
      
      const buffer = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

      if (fieldMap.mode === 'acroform') {
        // AcroForm mode
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
        // Coordinate Overlay mode with bounding-box width calculation & auto-scaling
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

          // Step 1: Auto-shrink font size down to minFontSize to prevent collision
          while (textWidth > maxBoxWidth && currentFontSize > minFontSize) {
            currentFontSize = Math.max(minFontSize, currentFontSize - 0.5);
            textWidth = font.widthOfTextAtSize(renderedText, currentFontSize);
          }

          // Step 2: If still exceeding maxWidth at minFontSize, truncate with ellipsis
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

    } catch (err) {
      console.warn(`Official PDF template fill failed, falling back to jsPDF summary:`, err);
    }
  }

  // Fallback: jsPDF summary document
  return generateJsPdfSummary(requirement, business);
}

/**
 * Fallback jsPDF Application Summary Generator
 */
export function generateJsPdfSummary(requirement, business) {
  const doc = new jsPDF();
  const today = format(new Date(), 'dd MMM yyyy');

  // Header Banner
  doc.setFillColor(13, 27, 42);
  doc.rect(0, 0, 210, 38, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('DockIt Compliance Packet', 15, 18);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Official Application Summary — ${requirement?.requirement_name || 'License Application'}`, 15, 29);

  // Business Profile Section
  doc.setTextColor(20, 24, 33);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Applicant Business Profile', 15, 52);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const bizInfo = [
    ['Legal Business Name:', business?.business_name || '[Not provided]'],
    ['Owner / Applicant Name:', business?.owner_name || '[Not provided]'],
    ['Business Type:', (business?.business_type || '').replace('_', ' ').toUpperCase() || '[Not provided]'],
    ['Operating Address:', business?.address || '[Not provided]'],
    ['Operating Cities:', (business?.cities || [business?.city || '[Not provided]']).join(', ')],
    ['Phone Number:', business?.phone || '[Not provided]'],
    ['Contact Email:', business?.email || '[Not provided]'],
  ];

  let y = 62;
  bizInfo.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(val), 75, y);
    y += 8;
  });

  // Requirement & Permit Details Section
  y += 6;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Permit & Agency Details', 15, y);
  y += 10;

  const reqInfo = [
    ['Requirement Name:', requirement?.requirement_name || '—'],
    ['Issuing Agency:', requirement?.issuing_agency || '—'],
    ['Jurisdiction Level:', (requirement?.jurisdiction_level || 'city').toUpperCase()],
    ['Estimated Processing Time:', requirement?.processing_time || '14-30 business days'],
    ['Estimated Fee Range:', requirement?.fee_min !== null && requirement?.fee_max !== null ? `$${requirement.fee_min} – $${requirement.fee_max}` : 'Verification Pending'],
    ['Official Portal:', requirement?.source_url || 'https://nyc-business.nyc.gov'],
  ];

  reqInfo.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(val), 75, y);
    y += 8;
  });

  // Application Instructions
  y += 6;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('3. Next Steps & Checklist', 15, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const checklist = [
    '☐  Verify all applicant business details above.',
    '☐  Attach required proof of identification & commissary agreement.',
    '☐  Submit application fee directly to the issuing agency portal.',
    '☐  Upload issued permit document to DockIt for automated OCR expiry tracking.'
  ];

  checklist.forEach((item) => {
    doc.text(item, 15, y);
    y += 8;
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text(`Generated automatically by DockIt Compliance Platform on ${today}`, 15, 285);

  const pdfBytes = doc.output('arraybuffer');
  return new Blob([pdfBytes], { type: 'application/pdf' });
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
