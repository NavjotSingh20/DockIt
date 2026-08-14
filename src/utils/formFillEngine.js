import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

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
      const response = await fetch(templateUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!response.ok) throw new Error(`HTTP ${response.status} when fetching template`);
      
      const buffer = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

      const todayFormatted = format(new Date(), 'MM/dd/yyyy');

      // Value lookup helper based on key name
      const getValue = (keyName) => {
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
            return business?.city || (business?.cities?.[0]?.split(',')[0]?.trim()) || '';
          case 'state':
            return business?.state || (business?.cities?.[0]?.split(',')[1]?.trim()) || '';
          case 'zip':
            return business?.zip || '';
          case 'business_type':
            return (business?.business_type || '').replace('_', ' ').toUpperCase();
          case 'date':
            return todayFormatted;
          case 'requirement_name':
            return requirement?.requirement_name || '';
          case 'issuing_agency':
            return requirement?.issuing_agency || '';
          case 'fee':
            return requirement?.fee_min !== null ? `$${requirement.fee_min}` : 'Verification Pending';
          default:
            return '';
        }
      };

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
              const val = getValue(dataKey);
              if (field.constructor.name === 'PDFTextField' && val) {
                field.setText(String(val));
              }
            }
          } catch (err) {
            console.warn(`Could not fill AcroForm field "${acroFieldName}":`, err);
          }
        });

      } else if (fieldMap.mode === 'overlay') {
        // Coordinate Overlay mode
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const overlayFields = fieldMap.fields || {};

        Object.entries(overlayFields).forEach(([dataKey, pos]) => {
          const val = getValue(dataKey);
          if (!val) return;

          const pageIndex = pos.page || 0;
          const targetPage = pages[pageIndex];
          if (targetPage) {
            targetPage.drawText(String(val), {
              x: pos.x,
              y: pos.y,
              size: pos.fontSize || 10,
              font: font,
              color: rgb(0, 0, 0),
            });
          }
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
