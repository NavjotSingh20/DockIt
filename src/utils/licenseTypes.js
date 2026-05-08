/**
 * licenseTypes.js
 * Master list of all supported Indian SMB license types.
 * Used across the app for icons, documents checklist, and portal URLs.
 */

export const LICENSE_TYPES = [
  {
    id: 'FSSAI',
    name: 'FSSAI Food License',
    icon: 'UtensilsCrossed',
    issuing_authority: 'Food Safety and Standards Authority of India',
    renewal_portal: 'https://foscos.fssai.gov.in',
    renewal_days_advance: 30,
    description: 'Mandatory for all food businesses — restaurants, bakeries, caterers, cloud kitchens.',
    validity_years: 1,
    documents_required: [
      'Previous FSSAI License copy',
      'ID proof of proprietor (Aadhaar/PAN)',
      'Address proof of business premises',
      'Latest electricity bill (< 3 months)',
      'Rent agreement / NOC from property owner',
      'Food safety management plan',
      'List of food products to be manufactured/sold',
      'Passport size photograph of proprietor',
    ],
  },
  {
    id: 'FIRE_NOC',
    name: 'Fire NOC',
    icon: 'Flame',
    issuing_authority: 'Karnataka State Fire and Emergency Services',
    renewal_portal: 'https://ksfe.karnataka.gov.in',
    renewal_days_advance: 45,
    description: 'Required for commercial buildings, restaurants, hotels, hospitals, and schools.',
    validity_years: 1,
    documents_required: [
      'Previous Fire NOC copy',
      'Building plan / layout (approved by authority)',
      'Fire extinguisher inspection report (< 6 months)',
      'Ownership / tenancy documents',
      'ID proof of owner/authorized signatory',
      'Photographs of fire safety equipment installed',
    ],
  },
  {
    id: 'TRADE_LICENSE',
    name: 'Trade License',
    icon: 'Store',
    issuing_authority: 'BBMP (Bruhat Bengaluru Mahanagara Palike)',
    renewal_portal: 'https://bbmptax.karnataka.gov.in',
    renewal_days_advance: 30,
    description: 'Required for all commercial establishments operating within BBMP limits.',
    validity_years: 1,
    documents_required: [
      'Previous Trade License',
      'Property tax receipt (latest)',
      'Rent agreement / lease deed',
      'ID proof (Aadhaar/PAN/Passport)',
      'Passport size photograph',
      'Proof of business activity',
    ],
  },
  {
    id: 'SHOP_ESTABLISHMENT',
    name: 'Shop & Establishment Act',
    icon: 'Building2',
    issuing_authority: 'Karnataka Labour Department',
    renewal_portal: 'https://labour.karnataka.gov.in',
    renewal_days_advance: 30,
    description: 'Mandatory for all shops, commercial establishments, and offices in Karnataka.',
    validity_years: 5,
    documents_required: [
      'Previous registration certificate',
      'Employee list with name, designation, salary details',
      'Address proof of establishment',
      'ID proof of owner',
      'PAN card of establishment',
    ],
  },
  {
    id: 'EATING_HOUSE',
    name: 'Eating House License',
    icon: 'Coffee',
    issuing_authority: 'Bengaluru City Police',
    renewal_portal: 'https://bengalurupolice.karnataka.gov.in',
    renewal_days_advance: 45,
    description: 'Required for any establishment that serves food/beverages for consumption on premises.',
    validity_years: 1,
    documents_required: [
      'Previous eating house license',
      'FSSAI license copy (current)',
      'Address proof of premises',
      'ID proof of owner',
      'NOC from building owner',
      'Passport size photograph',
      'Electricity bill (< 3 months)',
    ],
  },
  {
    id: 'GST',
    name: 'GST Registration',
    icon: 'Receipt',
    issuing_authority: 'GST Council of India',
    renewal_portal: 'https://www.gst.gov.in',
    renewal_days_advance: 0,
    description: 'Mandatory for businesses with turnover > ₹40L (goods) or ₹20L (services).',
    validity_years: 0, // perpetual — no renewal, just annual returns
    documents_required: [
      'PAN card of business/proprietor',
      'Aadhaar card of proprietor/partners/directors',
      'Bank account statement / cancelled cheque',
      'Address proof of principal place of business',
      'Digital signature certificate (DSC)',
      'Photographs of proprietor/partners',
    ],
  },
  {
    id: 'SIGNAGE',
    name: 'Signage / Hoarding License',
    icon: 'SignpostBig',
    issuing_authority: 'BBMP Advertisement Department',
    renewal_portal: 'https://bbmptax.karnataka.gov.in',
    renewal_days_advance: 30,
    description: 'Required for all commercial signboards, hoardings, and flex banners visible from public areas.',
    validity_years: 1,
    documents_required: [
      'Previous signage license',
      'Photograph of existing signboard (front view)',
      'Trade license copy',
      'Address proof of establishment',
      'Dimensions of signboard (length × width)',
    ],
  },
  {
    id: 'DRUG_LICENSE',
    name: 'Drug License',
    icon: 'Pill',
    issuing_authority: 'Karnataka State Drugs Control Department',
    renewal_portal: 'https://drugscontrol.karnataka.gov.in',
    renewal_days_advance: 60,
    description: 'Required for pharmacies, medical stores, and any establishment dealing in scheduled drugs.',
    validity_years: 5,
    documents_required: [
      'Previous drug license (Form 20/21)',
      'Registered pharmacist certificate (with registration number)',
      'Premises proof (ownership/rent agreement)',
      'Storage facility photographs (refrigerator, shelves)',
      'Affidavit from registered pharmacist',
      'NOC from building owner',
    ],
  },
]

/**
 * Get a license type by its ID
 * @param {string} id - e.g. 'FSSAI'
 * @returns {object|undefined}
 */
export const getLicenseTypeById = (id) =>
  LICENSE_TYPES.find((lt) => lt.id === id)

/**
 * Get just the IDs — useful for dropdowns
 */
export const LICENSE_TYPE_IDS = LICENSE_TYPES.map((lt) => lt.id)
