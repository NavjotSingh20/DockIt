export const LICENSE_TYPES = [
  { id: 'FSSAI', name: 'FSSAI Food License', icon: 'UtensilsCrossed', issuing_authority: 'Food Safety and Standards Authority of India', renewal_portal: 'https://foscos.fssai.gov.in', renewal_days_advance: 30, documents_required: ['Previous FSSAI License copy', 'ID proof of proprietor', 'Address proof of business', 'Latest electricity bill', 'Rent agreement / NOC from owner', 'Food safety management plan'] },
  { id: 'FIRE_NOC', name: 'Fire NOC', icon: 'Flame', issuing_authority: 'Karnataka State Fire and Emergency Services', renewal_portal: 'https://ksfe.karnataka.gov.in', renewal_days_advance: 45, documents_required: ['Previous Fire NOC copy', 'Building plan / layout', 'Fire extinguisher inspection report', 'Ownership / tenancy documents', 'ID proof'] },
  { id: 'TRADE_LICENSE', name: 'Trade License', icon: 'Store', issuing_authority: 'BBMP (Bruhat Bengaluru Mahanagara Palike)', renewal_portal: 'https://bbmptax.karnataka.gov.in', renewal_days_advance: 30, documents_required: ['Previous Trade License', 'Property tax receipt', 'Rent agreement', 'ID proof', 'Passport photo'] },
  { id: 'SHOP_ESTABLISHMENT', name: 'Shop & Establishment Act', icon: 'Building2', issuing_authority: 'Karnataka Labour Department', renewal_portal: 'https://labour.karnataka.gov.in', renewal_days_advance: 30, documents_required: ['Previous registration certificate', 'Employee list with details', 'Address proof', 'ID proof of owner'] },
  { id: 'EATING_HOUSE', name: 'Eating House License', icon: 'Coffee', issuing_authority: 'Bengaluru City Police', renewal_portal: 'https://bengalurupolice.karnataka.gov.in', renewal_days_advance: 45, documents_required: ['Previous eating house license', 'FSSAI license copy', 'Address proof', 'ID proof', 'NOC from owner'] },
  { id: 'GST', name: 'GST Registration', icon: 'Receipt', issuing_authority: 'GST Council of India', renewal_portal: 'https://www.gst.gov.in', renewal_days_advance: 0, documents_required: ['PAN card', 'Aadhaar card', 'Bank account statement', 'Address proof of business', 'Digital signature'] },
  { id: 'SIGNAGE', name: 'Signage / Hoarding License', icon: 'SignpostBig', issuing_authority: 'BBMP Advertisement Department', renewal_portal: 'https://bbmptax.karnataka.gov.in', renewal_days_advance: 30, documents_required: ['Previous signage license', 'Photo of existing signboard', 'Trade license copy', 'Address proof'] },
  { id: 'DRUG_LICENSE', name: 'Drug License', icon: 'Pill', issuing_authority: 'Karnataka State Drugs Control Department', renewal_portal: 'https://drugscontrol.karnataka.gov.in', renewal_days_advance: 60, documents_required: ['Previous drug license', 'Registered pharmacist certificate', 'Premises proof', 'Storage facility photos'] },
];

export const getLicenseById = (id) => LICENSE_TYPES.find((l) => l.id === id);

export const BUSINESS_TYPES = [
  { id: 'restaurant', label: 'Restaurant', icon: 'UtensilsCrossed', commonLicenses: ['FSSAI', 'FIRE_NOC', 'TRADE_LICENSE', 'SHOP_ESTABLISHMENT', 'EATING_HOUSE', 'GST'] },
  { id: 'salon', label: 'Salon / Spa', icon: 'Scissors', commonLicenses: ['TRADE_LICENSE', 'SHOP_ESTABLISHMENT', 'FIRE_NOC', 'GST'] },
  { id: 'retail', label: 'Retail Shop', icon: 'ShoppingBag', commonLicenses: ['TRADE_LICENSE', 'SHOP_ESTABLISHMENT', 'GST', 'SIGNAGE'] },
  { id: 'clinic', label: 'Clinic / Pharmacy', icon: 'Stethoscope', commonLicenses: ['DRUG_LICENSE', 'TRADE_LICENSE', 'SHOP_ESTABLISHMENT', 'FIRE_NOC', 'GST'] },
  { id: 'contractor', label: 'Contractor', icon: 'HardHat', commonLicenses: ['TRADE_LICENSE', 'SHOP_ESTABLISHMENT', 'GST'] },
  { id: 'coaching', label: 'Coaching Center', icon: 'GraduationCap', commonLicenses: ['TRADE_LICENSE', 'SHOP_ESTABLISHMENT', 'FIRE_NOC', 'GST'] },
  { id: 'manufacturing', label: 'Manufacturing', icon: 'Factory', commonLicenses: ['TRADE_LICENSE', 'SHOP_ESTABLISHMENT', 'FIRE_NOC', 'GST'] },
  { id: 'other', label: 'Other', icon: 'Briefcase', commonLicenses: ['TRADE_LICENSE', 'SHOP_ESTABLISHMENT', 'GST'] },
];
