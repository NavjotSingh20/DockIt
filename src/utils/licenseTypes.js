export const LICENSE_TYPES = [
  // India Licenses (Generalized)
  { 
    id: 'FSSAI', 
    country: 'India', 
    name: 'FSSAI Food License', 
    icon: 'UtensilsCrossed', 
    issuing_authority: 'Food Safety and Standards Authority of India', 
    renewal_portal: 'https://foscos.fssai.gov.in', 
    renewal_days_advance: 30, 
    documents_required: ['Previous FSSAI License copy', 'ID proof of proprietor', 'Address proof of business', 'Latest electricity bill', 'Rent agreement / NOC from owner', 'Food safety management plan'] 
  },
  { 
    id: 'FIRE_NOC', 
    country: 'India', 
    name: 'Fire NOC', 
    icon: 'Flame', 
    issuing_authority: 'State Fire and Emergency Services', 
    renewal_portal: 'https://firenoc.gov.in', 
    renewal_days_advance: 45, 
    documents_required: ['Previous Fire NOC copy', 'Building plan / layout', 'Fire extinguisher inspection report', 'Ownership / tenancy documents', 'ID proof'] 
  },
  { 
    id: 'TRADE_LICENSE', 
    country: 'India', 
    name: 'Trade License', 
    icon: 'Store', 
    issuing_authority: 'Municipal Corporation (e.g. BMC/BBMP)', 
    renewal_portal: 'https://municipalcorporation.gov.in', 
    renewal_days_advance: 30, 
    documents_required: ['Previous Trade License', 'Property tax receipt', 'Rent agreement', 'ID proof', 'Passport photo'] 
  },
  { 
    id: 'SHOP_ESTABLISHMENT', 
    country: 'India', 
    name: 'Shop & Establishment Act', 
    icon: 'Building2', 
    issuing_authority: 'State Labour Department', 
    renewal_portal: 'https://labour.gov.in', 
    renewal_days_advance: 30, 
    documents_required: ['Previous registration certificate', 'Employee list with details', 'Address proof', 'ID proof of owner'] 
  },
  { 
    id: 'EATING_HOUSE', 
    country: 'India', 
    name: 'Eating House License', 
    icon: 'Coffee', 
    issuing_authority: 'City Police Commissionerate', 
    renewal_portal: 'https://citypolice.gov.in', 
    renewal_days_advance: 45, 
    documents_required: ['Previous eating house license', 'FSSAI license copy', 'Address proof', 'ID proof', 'NOC from owner'] 
  },
  { 
    id: 'GST', 
    country: 'India', 
    name: 'GST Registration', 
    icon: 'Receipt', 
    issuing_authority: 'GST Council of India', 
    renewal_portal: 'https://www.gst.gov.in', 
    renewal_days_advance: 0, 
    documents_required: ['PAN card', 'Aadhaar card', 'Bank account statement', 'Address proof of business', 'Digital signature'] 
  },
  { 
    id: 'SIGNAGE', 
    country: 'India', 
    name: 'Signage / Hoarding License', 
    icon: 'SignpostBig', 
    issuing_authority: 'Municipal Advertisement Department', 
    renewal_portal: 'https://municipalcorporation.gov.in', 
    renewal_days_advance: 30, 
    documents_required: ['Previous signage license', 'Photo of existing signboard', 'Trade license copy', 'Address proof'] 
  },
  { 
    id: 'DRUG_LICENSE', 
    country: 'India', 
    name: 'Drug License', 
    icon: 'Pill', 
    issuing_authority: 'State Drugs Control Department', 
    renewal_portal: 'https://drugscontrol.gov.in', 
    renewal_days_advance: 60, 
    documents_required: ['Previous drug license', 'Registered pharmacist certificate', 'Premises proof', 'Storage facility photos'] 
  },

  // USA Licenses
  { 
    id: 'BUSINESS_LICENSE', 
    country: 'USA', 
    name: 'General Business License', 
    icon: 'Briefcase', 
    issuing_authority: 'City Clerk / Municipal License Bureau', 
    renewal_portal: 'https://cityhall.gov', 
    renewal_days_advance: 30, 
    documents_required: ['Previous business license copy', 'Federal EIN certificate', 'State tax ID permit', 'Lease agreement', 'ID proof of owner'] 
  },
  { 
    id: 'HEALTH_PERMIT', 
    country: 'USA', 
    name: 'Health Department Permit', 
    icon: 'UtensilsCrossed', 
    issuing_authority: 'County Department of Health', 
    renewal_portal: 'https://countyhealth.gov', 
    renewal_days_advance: 30, 
    documents_required: ['Previous health permit', 'Food handler cards', 'Pest control logs', 'Water quality test', 'ID proof'] 
  },
  { 
    id: 'SALES_TAX', 
    country: 'USA', 
    name: 'Sales Tax Permit', 
    icon: 'Receipt', 
    issuing_authority: 'State Department of Revenue', 
    renewal_portal: 'https://statetax.gov', 
    renewal_days_advance: 15, 
    documents_required: ['Previous sales tax certificate', 'EIN number', 'Business structure proof', 'Owner details'] 
  },
  { 
    id: 'FIRE_PERMIT', 
    country: 'USA', 
    name: 'Fire Department NOC', 
    icon: 'Flame', 
    issuing_authority: 'City Fire Department / Prevention Bureau', 
    renewal_portal: 'https://cityfire.gov', 
    renewal_days_advance: 45, 
    documents_required: ['Previous fire inspection NOC', 'Fire extinguisher test record', 'Building layout/exits map', 'Emergency contact details'] 
  },
  { 
    id: 'FDA_REG', 
    country: 'USA', 
    name: 'FDA Food Registration', 
    icon: 'UtensilsCrossed', 
    issuing_authority: 'U.S. Food & Drug Administration', 
    renewal_portal: 'https://www.fda.gov', 
    renewal_days_advance: 60, 
    documents_required: ['Facility registration number', 'Owner / agent verification', 'Type of food items processed', 'Food safety plan'] 
  },
  { 
    id: 'SIGN_PERMIT', 
    country: 'USA', 
    name: 'Signage Permit', 
    icon: 'SignpostBig', 
    issuing_authority: 'City Zoning / Building Department', 
    renewal_portal: 'https://cityplanning.gov', 
    renewal_days_advance: 30, 
    documents_required: ['Zoning clearance document', 'Existing signage photos', 'Sign measurements & material description', 'Owner authorization'] 
  },
  { 
    id: 'PHARMACY_LICENSE', 
    country: 'USA', 
    name: 'Pharmacy License', 
    icon: 'Pill', 
    issuing_authority: 'State Board of Pharmacy', 
    renewal_portal: 'https://statepharmacy.gov', 
    renewal_days_advance: 60, 
    documents_required: ['Previous pharmacist/pharmacy license', 'DEA registration copy', 'Staff pharmacist credentials', 'Facility inspection report'] 
  }
];

export const getLicenseById = (id) => LICENSE_TYPES.find((l) => l.id === id);

export const BUSINESS_TYPES = [
  { id: 'restaurant', label: 'Restaurant', icon: 'UtensilsCrossed', commonLicenses: ['FSSAI', 'BUSINESS_LICENSE', 'FIRE_NOC', 'FIRE_PERMIT', 'TRADE_LICENSE', 'HEALTH_PERMIT', 'SHOP_ESTABLISHMENT', 'SALES_TAX', 'EATING_HOUSE', 'FDA_REG', 'GST'] },
  { id: 'food_truck', label: 'Food Truck / Vendor', icon: 'Truck', commonLicenses: ['BUSINESS_LICENSE', 'HEALTH_PERMIT', 'FIRE_PERMIT', 'SALES_TAX', 'FSSAI'] },
  { id: 'salon', label: 'Salon / Spa', icon: 'Scissors', commonLicenses: ['TRADE_LICENSE', 'BUSINESS_LICENSE', 'SHOP_ESTABLISHMENT', 'SALES_TAX', 'FIRE_NOC', 'FIRE_PERMIT', 'GST'] },
  { id: 'retail', label: 'Retail Shop', icon: 'ShoppingBag', commonLicenses: ['TRADE_LICENSE', 'BUSINESS_LICENSE', 'SHOP_ESTABLISHMENT', 'SALES_TAX', 'GST', 'SIGNAGE', 'SIGN_PERMIT'] },
  { id: 'clinic', label: 'Clinic / Pharmacy', icon: 'Stethoscope', commonLicenses: ['DRUG_LICENSE', 'PHARMACY_LICENSE', 'TRADE_LICENSE', 'BUSINESS_LICENSE', 'SHOP_ESTABLISHMENT', 'SALES_TAX', 'FIRE_NOC', 'FIRE_PERMIT', 'GST'] },
  { id: 'contractor', label: 'Contractor', icon: 'HardHat', commonLicenses: ['TRADE_LICENSE', 'BUSINESS_LICENSE', 'SHOP_ESTABLISHMENT', 'SALES_TAX', 'GST'] },
  { id: 'coaching', label: 'Coaching Center', icon: 'GraduationCap', commonLicenses: ['TRADE_LICENSE', 'BUSINESS_LICENSE', 'SHOP_ESTABLISHMENT', 'SALES_TAX', 'FIRE_NOC', 'FIRE_PERMIT', 'GST'] },
  { id: 'manufacturing', label: 'Manufacturing', icon: 'Factory', commonLicenses: ['TRADE_LICENSE', 'BUSINESS_LICENSE', 'SHOP_ESTABLISHMENT', 'SALES_TAX', 'FIRE_NOC', 'FIRE_PERMIT', 'GST'] },
  { id: 'other', label: 'Other', icon: 'Briefcase', commonLicenses: ['TRADE_LICENSE', 'BUSINESS_LICENSE', 'SHOP_ESTABLISHMENT', 'SALES_TAX', 'GST'] },
];
