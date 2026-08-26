/**
 * pdfService.js
 * Client-side PDF generation using jsPDF.
 * Runs entirely in the browser — no server needed.
 */
import { jsPDF } from 'jspdf'
import { formatDate } from '@/utils/formatters'
import { getLicenseTypeById } from '@/utils/licenseTypes'

// Brand colors
const NAVY = [13, 27, 42]
const BLUE = [26, 86, 219]
const GRAY = [107, 114, 128]
const LIGHT_GRAY = [248, 250, 252]
const BLACK = [15, 23, 42]

/**
 * Generate a pre-filled renewal form PDF and return a Blob URL for download.
 *
 * @param {object} businessProfile - business data from Supabase
 * @param {string} licenseType     - e.g. 'FSSAI'
 * @param {object} formData        - Gemini-generated pre-filled form data
 * @returns {string} Blob URL
 */
export function generateRenewalPDF(businessProfile, licenseType, formData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const licInfo = getLicenseTypeById(licenseType)
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentW = pageW - margin * 2
  let y = margin

  // ── Header background ───────────────────────────────────
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, pageW, 40, 'F')

  // Logo text
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.text('ComplianceAI', margin, 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(180, 200, 220)
  doc.text('Smart License Management for Indian Businesses', margin, 23)

  // License type title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(255, 255, 255)
  const licTitle = licInfo?.name || licenseType
  doc.text(`${licTitle} — Renewal Form`, pageW - margin, 16, { align: 'right' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Issuing Authority: ${licInfo?.issuing_authority || '—'}`, pageW - margin, 23, { align: 'right' })

  y = 50

  // ── Business Details Section ─────────────────────────────
  doc.setFillColor(...LIGHT_GRAY)
  doc.roundedRect(margin, y, contentW, 42, 3, 3, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...BLUE)
  doc.text('BUSINESS DETAILS', margin + 5, y + 8)

  const bizFields = [
    ['Business Name', businessProfile.business_name],
    ['Owner Name', businessProfile.owner_name],
    ['Business Type', businessProfile.business_type],
    ['GSTIN', businessProfile.gstin || 'Not Provided'],
    ['Phone', businessProfile.phone || '—'],
    ['Email', businessProfile.email || '—'],
    ['Address', businessProfile.address],
    ['City / State', `${businessProfile.city}, ${businessProfile.state}`],
  ]

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...BLACK)

  const colW = contentW / 2 - 5
  bizFields.forEach((field, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const fx = margin + 5 + col * (colW + 10)
    const fy = y + 15 + row * 7

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GRAY)
    doc.text(`${field[0]}:`, fx, fy)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...BLACK)
    doc.text(String(field[1] || '—'), fx + 32, fy)
  })

  y += 50

  // ── Pre-filled Form Fields ───────────────────────────────
  if (formData?.formFields?.length) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...BLUE)
    doc.text('PRE-FILLED RENEWAL FORM FIELDS', margin, y)
    y += 6

    doc.setDrawColor(...BLUE)
    doc.setLineWidth(0.5)
    doc.line(margin, y, margin + contentW, y)
    y += 5

    // Table header
    doc.setFillColor(...NAVY)
    doc.rect(margin, y, contentW, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    doc.text('FIELD NAME', margin + 3, y + 5.5)
    doc.text('VALUE', margin + contentW * 0.45, y + 5.5)
    doc.text('EDITABLE', margin + contentW * 0.85, y + 5.5)
    y += 8

    doc.setFontSize(8)
    formData.formFields.forEach((field, i) => {
      if (y > pageH - 30) {
        doc.addPage()
        y = margin
      }
      const rowBg = i % 2 === 0 ? [255, 255, 255] : [248, 250, 252]
      doc.setFillColor(...rowBg)
      doc.rect(margin, y, contentW, 7, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...BLACK)
      doc.text(String(field.fieldName || ''), margin + 3, y + 5)

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...GRAY)
      const val = String(field.fieldValue || '—')
      doc.text(val.length > 40 ? val.slice(0, 37) + '…' : val, margin + contentW * 0.45, y + 5)

      doc.setTextColor(field.editable ? [22, 163, 74] : [220, 38, 38])
      doc.text(field.editable ? '✓ Yes' : '✗ No', margin + contentW * 0.85, y + 5)
      y += 7
    })
    y += 6
  }

  // ── Document Checklist ───────────────────────────────────
  const checklist = formData?.documentChecklist || licInfo?.documents_required || []
  if (checklist.length) {
    if (y > pageH - 60) { doc.addPage(); y = margin }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...BLUE)
    doc.text('DOCUMENT CHECKLIST', margin, y)
    y += 8

    checklist.forEach((item, i) => {
      if (y > pageH - 20) { doc.addPage(); y = margin }
      doc.setDrawColor(...GRAY)
      doc.setLineWidth(0.3)
      doc.rect(margin, y - 4, 4, 4)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...BLACK)
      doc.text(`${i + 1}. ${item}`, margin + 7, y)
      y += 7
    })
    y += 6
  }

  // ── Renewal Instructions ─────────────────────────────────
  if (formData?.renewalInstructions?.length) {
    if (y > pageH - 50) { doc.addPage(); y = margin }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...BLUE)
    doc.text('RENEWAL STEPS', margin, y)
    y += 8

    formData.renewalInstructions.forEach((step, i) => {
      if (y > pageH - 20) { doc.addPage(); y = margin }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...BLUE)
      doc.text(`${i + 1}.`, margin, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...BLACK)
      const lines = doc.splitTextToSize(step, contentW - 10)
      doc.text(lines, margin + 7, y)
      y += lines.length * 5.5 + 2
    })
    y += 4
  }

  // ── Cost & Time Estimates ────────────────────────────────
  if (formData?.estimatedCost || formData?.estimatedTime) {
    if (y > pageH - 30) { doc.addPage(); y = margin }

    doc.setFillColor(...LIGHT_GRAY)
    doc.roundedRect(margin, y, contentW, 18, 3, 3, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...NAVY)
    doc.text('Estimated Cost:', margin + 5, y + 7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...BLACK)
    doc.text(formData.estimatedCost || '—', margin + 40, y + 7)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...NAVY)
    doc.text('Estimated Time:', margin + contentW / 2 + 5, y + 7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...BLACK)
    doc.text(formData.estimatedTime || '—', margin + contentW / 2 + 40, y + 7)

    y += 25
  }

  // ── Footer ───────────────────────────────────────────────
  const footerY = pageH - 12
  doc.setFillColor(...NAVY)
  doc.rect(0, footerY - 5, pageW, 17, 'F')

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(180, 200, 220)
  doc.text(
    `Generated by ComplianceAI on ${formatDate(new Date())} — For official use only. Verify all details before submission.`,
    pageW / 2,
    footerY + 3,
    { align: 'center' }
  )

  // ── Return Blob URL ──────────────────────────────────────
  const blob = doc.output('blob')
  return URL.createObjectURL(blob)
}
