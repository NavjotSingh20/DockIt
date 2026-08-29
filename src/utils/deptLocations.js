/**
 * deptLocations.js
 * Hardcoded government department office locations for major seeded cities.
 * Used by JurisdictionMap to render department pins on hover.
 */

export const DEPT_TYPE_CONFIG = {
  health:   { color: '#10b981', icon: 'H', label: 'Health Dept' },
  tax:      { color: '#f59e0b', icon: 'T', label: 'Tax / Finance' },
  business: { color: '#6366f1', icon: 'B', label: 'Business Licensing' },
  fire:     { color: '#ef4444', icon: 'F', label: 'Fire Dept' },
  police:   { color: '#3b82f6', icon: 'P', label: 'Police Licensing' },
  labor:    { color: '#8b5cf6', icon: 'L', label: 'Labour / Employment' },
  revenue:  { color: '#f97316', icon: 'R', label: 'Revenue / Sales Tax' },
  cityHall: { color: '#06b6d4', icon: 'C', label: 'City Hall' },
  food:     { color: '#84cc16', icon: 'FS', label: 'Food Safety' },
};

export const DEPT_LOCATIONS = {
  'new york, ny': [
    { name: 'NYC Dept. of Consumer & Worker Protection (DCWP)', type: 'business', address: '42 Broadway, New York, NY 10004', lat: 40.7074, lng: -74.0134, phone: '(212) 361-7900', url: 'https://www.nyc.gov/dcwp', issues: 'Mobile Food Vending License, General Vendor License' },
    { name: 'NYC Dept. of Health & Mental Hygiene (DOHMH)', type: 'health', address: '125 Worth St, New York, NY 10013', lat: 40.7149, lng: -74.0036, phone: '(212) 788-9600', url: 'https://www.nyc.gov/health', issues: 'Food Handler Certificate, Mobile Food Vendor Permit' },
    { name: 'NYC Dept. of Finance — Business Tax', type: 'tax', address: '66 John St, New York, NY 10038', lat: 40.7081, lng: -74.0091, phone: '(212) 291-4085', url: 'https://www.nyc.gov/dof', issues: 'Business Income Tax, Hotel Tax Filings' },
    { name: 'NY State Dept. of Taxation & Finance', type: 'revenue', address: '2 Metrotech Center, Brooklyn, NY 11201', lat: 40.6925, lng: -73.9872, phone: '(518) 457-5181', url: 'https://www.tax.ny.gov', issues: 'Certificate of Authority (Sales Tax)' },
    { name: 'FDNY — Fire Department HQ', type: 'fire', address: '9 MetroTech Center, Brooklyn, NY 11201', lat: 40.6929, lng: -73.9869, phone: '(718) 999-2000', url: 'https://www.nyc.gov/fdny', issues: 'Fire Safety Inspection, Certificate of Occupancy' },
    { name: 'NYC City Hall', type: 'cityHall', address: 'City Hall Park, New York, NY 10007', lat: 40.7128, lng: -74.0059, phone: '(212) 788-3000', url: 'https://www.nyc.gov', issues: 'General Business Enquiries, Permits' },
  ],
  'los angeles, ca': [
    { name: 'LA County Dept. of Public Health — Environmental Health', type: 'health', address: '313 N. Figueroa St, Los Angeles, CA 90012', lat: 34.0574, lng: -118.2431, phone: '(888) 700-9995', url: 'http://publichealth.lacounty.gov/eh', issues: 'Mobile Food Facility Permit, Food Handler Certification' },
    { name: 'City of LA Office of Finance', type: 'tax', address: '200 N Spring St, Los Angeles, CA 90012', lat: 34.0538, lng: -118.2427, phone: '(844) 663-4411', url: 'https://finance.lacity.gov', issues: 'Business Tax Registration Certificate (BTRC)' },
    { name: 'CDTFA — California Dept. of Tax & Fee Administration', type: 'revenue', address: '300 S Spring St, Los Angeles, CA 90013', lat: 34.0498, lng: -118.2506, phone: '(800) 400-7115', url: 'https://www.cdtfa.ca.gov', issues: "California Seller's Permit, Sales & Use Tax" },
    { name: 'LA City Hall', type: 'cityHall', address: '200 N Spring St, Los Angeles, CA 90012', lat: 34.0538, lng: -118.2427, phone: '(213) 473-3231', url: 'https://www.lacity.gov', issues: 'Zoning, Land Use Permits' },
    { name: 'LAFD — Fire Dept. HQ', type: 'fire', address: '200 N Main St, Los Angeles, CA 90012', lat: 34.0556, lng: -118.2430, phone: '(213) 978-3800', url: 'https://www.lafd.org', issues: 'Fire Safety Certificate' },
  ],
  'chicago, il': [
    { name: 'City of Chicago — Dept. of Business Affairs & Consumer Protection', type: 'business', address: '121 N LaSalle St, Chicago, IL 60602', lat: 41.8833, lng: -87.6316, phone: '(312) 744-6060', url: 'https://www.chicago.gov/bacp', issues: 'Business License, Food Establishment Permit' },
    { name: 'Chicago Dept. of Public Health', type: 'health', address: '333 S State St, Chicago, IL 60604', lat: 41.8771, lng: -87.6278, phone: '(312) 747-9884', url: 'https://www.chicago.gov/health', issues: 'Food Sanitation Certificate, Health Inspection' },
    { name: 'Illinois Dept. of Revenue', type: 'revenue', address: '100 W Randolph St, Chicago, IL 60601', lat: 41.8845, lng: -87.6317, phone: '(800) 732-8866', url: 'https://www2.illinois.gov/rev', issues: 'Illinois Business Tax Registration, Sales Tax' },
    { name: 'Chicago City Hall', type: 'cityHall', address: '121 N LaSalle St, Chicago, IL 60602', lat: 41.8833, lng: -87.6316, phone: '(312) 744-5000', url: 'https://www.chicago.gov', issues: 'General City Business' },
  ],
  'houston, tx': [
    { name: 'City of Houston — Permitting Center', type: 'business', address: '1002 Washington Ave, Houston, TX 77002', lat: 29.7637, lng: -95.3803, phone: '(832) 394-8800', url: 'https://www.houstontx.gov/permits', issues: 'Business License, General Permits' },
    { name: 'Texas Comptroller of Public Accounts — Houston Office', type: 'revenue', address: '1919 Smith St, Houston, TX 77002', lat: 29.7562, lng: -95.3697, phone: '(800) 252-5555', url: 'https://comptroller.texas.gov', issues: 'Sales & Use Tax Permit, Franchise Tax' },
    { name: 'Houston Health Dept.', type: 'health', address: '8000 N Stadium Dr, Houston, TX 77054', lat: 29.6854, lng: -95.4103, phone: '(832) 393-5080', url: 'https://www.houstontx.gov/health', issues: 'Food Establishment Permit, Health Inspection' },
    { name: 'Houston City Hall', type: 'cityHall', address: '901 Bagby St, Houston, TX 77002', lat: 29.7602, lng: -95.3699, phone: '(832) 393-0832', url: 'https://www.houstontx.gov', issues: 'City Administration, Zoning' },
  ],
  'san francisco, ca': [
    { name: 'SF Dept. of Public Health — Environmental Health', type: 'health', address: '49 South Van Ness Ave, San Francisco, CA 94103', lat: 37.7749, lng: -122.4194, phone: '(415) 252-3800', url: 'https://www.sfdph.org', issues: 'Food Facility Permit, Health Inspection' },
    { name: 'SF Office of the Treasurer & Tax Collector', type: 'tax', address: '1 Dr Carlton B Goodlett Pl, San Francisco, CA 94102', lat: 37.7793, lng: -122.4193, phone: '(415) 554-6330', url: 'https://sftreasurer.org', issues: 'Business Registration Certificate, Payroll Tax' },
    { name: 'SF City Hall', type: 'cityHall', address: '1 Dr Carlton B Goodlett Pl, San Francisco, CA 94102', lat: 37.7793, lng: -122.4193, phone: '(415) 554-4000', url: 'https://sfgov.org', issues: 'Business Permits, Zoning Appeals' },
    { name: 'SFFD — Fire Prevention Bureau', type: 'fire', address: '698 2nd St, San Francisco, CA 94107', lat: 37.7795, lng: -122.3964, phone: '(415) 558-3300', url: 'https://sf-fire.org', issues: 'Fire Code Compliance' },
  ],
  'seattle, wa': [
    { name: 'City of Seattle — Finance & Administrative Services', type: 'business', address: '700 5th Ave, Seattle, WA 98104', lat: 47.6035, lng: -122.3297, phone: '(206) 684-0444', url: 'https://www.seattle.gov/fas', issues: 'General Business License' },
    { name: 'WA State Dept. of Revenue — Seattle Office', type: 'revenue', address: '2101 4th Ave, Seattle, WA 98121', lat: 47.6152, lng: -122.3390, phone: '(800) 647-7706', url: 'https://dor.wa.gov', issues: 'Business License, Sales Tax Registration' },
    { name: 'Seattle & King County Public Health', type: 'health', address: '401 5th Ave, Seattle, WA 98104', lat: 47.6013, lng: -122.3293, phone: '(206) 263-9566', url: 'https://kingcounty.gov/health', issues: 'Food Worker Card, Mobile Food Permit' },
    { name: 'Seattle City Hall', type: 'cityHall', address: '600 4th Ave, Seattle, WA 98104', lat: 47.6031, lng: -122.3305, phone: '(206) 684-2489', url: 'https://www.seattle.gov', issues: 'Permits, Licenses' },
  ],
  'phoenix, az': [
    { name: 'City of Phoenix — Development Services', type: 'business', address: '200 W Washington St, Phoenix, AZ 85003', lat: 33.4484, lng: -112.0740, phone: '(602) 262-7811', url: 'https://www.phoenix.gov', issues: 'Business License, Permits' },
    { name: 'Arizona Dept. of Revenue — Phoenix', type: 'revenue', address: '1600 W Monroe St, Phoenix, AZ 85007', lat: 33.4481, lng: -112.0956, phone: '(602) 255-3381', url: 'https://azdor.gov', issues: 'Transaction Privilege Tax, Sales Tax License' },
    { name: 'Maricopa County Dept. of Public Health', type: 'health', address: '4041 N Central Ave, Phoenix, AZ 85012', lat: 33.4782, lng: -112.0736, phone: '(602) 506-6900', url: 'https://www.maricopa.gov/health', issues: 'Food Establishment Permit' },
  ],
  'mumbai, maharashtra': [
    { name: 'BMC — Brihanmumbai Municipal Corporation HQ', type: 'cityHall', address: 'Mahapalika Marg, Fort, Mumbai 400001', lat: 18.9355, lng: 72.8348, phone: '022-22621919', url: 'https://portal.mcgm.gov.in', issues: 'Trade License, Health License' },
    { name: 'FSSAI — Western Regional Office', type: 'food', address: 'Parel, Mumbai 400012', lat: 18.9940, lng: 72.8428, phone: '022-24137815', url: 'https://foscos.fssai.gov.in', issues: 'FSSAI Food License' },
    { name: 'Maharashtra Fire & Emergency Services — Mumbai', type: 'fire', address: 'CST Road, Kurla, Mumbai 400070', lat: 19.0655, lng: 72.8778, phone: '022-24924100', url: 'https://mumbaimunicipal.gov.in', issues: 'Fire NOC, Fire Safety Certificate' },
    { name: 'Maharashtra Labour Dept. — Mumbai Regional Office', type: 'labor', address: 'Kamgar Bhavan, Deonar, Mumbai 400088', lat: 19.0439, lng: 72.9131, phone: '022-25565600', url: 'https://mahashramm.gov.in', issues: 'Shop & Establishment Registration' },
    { name: 'GST Seva Kendra — Mumbai', type: 'tax', address: 'Churchgate, Mumbai 400020', lat: 18.9340, lng: 72.8274, phone: '1800-1200-232', url: 'https://www.gst.gov.in', issues: 'GST Registration, Tax Filings' },
    { name: 'Mumbai Police — Licensing Unit', type: 'police', address: 'Crawford Market, Mumbai 400001', lat: 18.9474, lng: 72.8353, phone: '022-22621855', url: 'https://mumbaipolice.gov.in', issues: 'Eating House License, NOCs' },
  ],
  'delhi, nct': [
    { name: 'MCD — Municipal Corporation of Delhi HQ', type: 'cityHall', address: 'Dr S P Mukherjee Civic Centre, JLN Marg, New Delhi 110002', lat: 28.6346, lng: 77.2403, phone: '011-23234661', url: 'https://www.mcdonline.nic.in', issues: 'Trade License, Health Trade License' },
    { name: 'FSSAI — Delhi Regional Office', type: 'food', address: 'FDA Bhawan, Kotla Road, New Delhi 110002', lat: 28.6396, lng: 77.2475, phone: '011-23236975', url: 'https://foscos.fssai.gov.in', issues: 'FSSAI Food License' },
    { name: 'Dept. of Labour — Delhi', type: 'labor', address: '5 Sham Nath Marg, Delhi 110054', lat: 28.6700, lng: 77.2260, phone: '011-23810001', url: 'https://labour.delhi.gov.in', issues: 'Shop & Establishment Registration' },
    { name: 'GST Seva Kendra — Delhi', type: 'tax', address: 'SCOPE Minar, Laxmi Nagar, Delhi 110092', lat: 28.6344, lng: 77.2779, phone: '1800-1200-232', url: 'https://www.gst.gov.in', issues: 'GST Registration' },
    { name: 'Delhi Fire Service HQ', type: 'fire', address: '27 Vikram Nagar, Delhi 110007', lat: 28.6680, lng: 77.1948, phone: '011-23221491', url: 'https://dfs.delhi.gov.in', issues: 'Fire NOC, Fire Safety' },
  ],
  'new delhi, delhi': [
    { name: 'MCD — Municipal Corporation of Delhi HQ', type: 'cityHall', address: 'Dr S P Mukherjee Civic Centre, JLN Marg, New Delhi 110002', lat: 28.6346, lng: 77.2403, phone: '011-23234661', url: 'https://www.mcdonline.nic.in', issues: 'Trade License, Health Trade License' },
    { name: 'FSSAI — Delhi Regional Office', type: 'food', address: 'FDA Bhawan, Kotla Road, New Delhi 110002', lat: 28.6396, lng: 77.2475, phone: '011-23236975', url: 'https://foscos.fssai.gov.in', issues: 'FSSAI Food License' },
    { name: 'Dept. of Labour — Delhi', type: 'labor', address: '5 Sham Nath Marg, Delhi 110054', lat: 28.6700, lng: 77.2260, phone: '011-23810001', url: 'https://labour.delhi.gov.in', issues: 'Shop & Establishment Registration' },
    { name: 'GST Seva Kendra — Delhi', type: 'tax', address: 'SCOPE Minar, Laxmi Nagar, Delhi 110092', lat: 28.6344, lng: 77.2779, phone: '1800-1200-232', url: 'https://www.gst.gov.in', issues: 'GST Registration' },
    { name: 'Income Tax Department — Delhi HQ', type: 'tax', address: 'CR Building, IP Estate, New Delhi 110002', lat: 28.6294, lng: 77.2461, phone: '011-23370075', url: 'https://www.incometax.gov.in', issues: 'Permanent Account Number (PAN)' },
  ],
  'chandigarh': [
    { name: 'Chandigarh Labour Dept. — UT Administration', type: 'labor', address: 'Sector 30-B, Chandigarh 160030', lat: 30.7225, lng: 76.7905, phone: '0172-2703893', url: 'https://chandigarh.gov.in', issues: 'Shop & Establishment Registration' },
    { name: 'FSSAI — Chandigarh UT Food Safety Cell', type: 'food', address: 'Government Multi Specialty Hospital, Sector 16, Chandigarh 160015', lat: 30.7455, lng: 76.7825, phone: '0172-2752042', url: 'https://foscos.fssai.gov.in', issues: 'FSSAI Food License (Chandigarh UT)' },
    { name: 'Municipal Corporation Chandigarh (MCC)', type: 'cityHall', address: 'New Deluxe Building, Sector 17, Chandigarh 160017', lat: 30.7410, lng: 76.7850, phone: '0172-2787200', url: 'https://mcchandigarh.gov.in', issues: 'Trade License, Sanitation NOC' },
    { name: 'GST Bhawan — Chandigarh Commissionerate', type: 'tax', address: 'Sector 17-C, Chandigarh 160017', lat: 30.7405, lng: 76.7812, phone: '0172-2702377', url: 'https://www.gst.gov.in', issues: 'GST Registration' },
    { name: 'Income Tax Department — Chandigarh Aayakar Bhawan', type: 'tax', address: 'Sector 17-E, Chandigarh 160017', lat: 30.7390, lng: 76.7830, phone: '0172-2544155', url: 'https://www.incometax.gov.in', issues: 'Permanent Account Number (PAN)' },
  ],
  'hyderabad, telangana': [
    { name: 'GHMC — Greater Hyderabad Municipal Corporation', type: 'cityHall', address: 'Tank Bund Rd, Lower Tank Bund, Hyderabad 500380', lat: 17.4126, lng: 78.4737, phone: '040-21112222', url: 'https://www.ghmc.gov.in', issues: 'Trade License, Building Permissions' },
    { name: 'FSSAI — Telangana State Licensing Authority', type: 'food', address: 'Hyderabad', lat: 17.3900, lng: 78.4867, phone: '040-23450246', url: 'https://foscos.fssai.gov.in', issues: 'State FSSAI License' },
    { name: 'TS GST Office — Hyderabad', type: 'tax', address: 'GST Bhawan, Begumpet, Hyderabad 500016', lat: 17.4437, lng: 78.4607, phone: '040-27663700', url: 'https://tsgst.in', issues: 'GST Registration' },
  ],
  'pune, maharashtra': [
    { name: 'PMC — Pune Municipal Corporation', type: 'cityHall', address: 'Shivajinagar, Pune 411005', lat: 18.5298, lng: 73.8474, phone: '020-25501000', url: 'https://pmc.gov.in', issues: 'Trade License, Health License' },
    { name: 'FSSAI — Pune Regional Office', type: 'food', address: 'FDA Bhawan, Shivajinagar, Pune 411005', lat: 18.5305, lng: 73.8515, phone: '020-25538303', url: 'https://foscos.fssai.gov.in', issues: 'Food Safety License' },
    { name: 'Maharashtra Fire — Pune', type: 'fire', address: 'Pune 411001', lat: 18.5244, lng: 73.8565, phone: '020-24451100', url: 'https://pmc.gov.in', issues: 'Fire NOC' },
  ],
  'chennai, tamil nadu': [
    { name: 'GCC — Greater Chennai Corporation HQ', type: 'cityHall', address: 'Rippon Building, EVR Salai, Chennai 600003', lat: 13.0748, lng: 80.2704, phone: '044-25384680', url: 'https://www.chennaicorporation.gov.in', issues: 'Trade License, Building License' },
    { name: 'FSSAI — Tamil Nadu State Licensing Authority', type: 'food', address: 'DMS Campus, Chennai 600006', lat: 13.0790, lng: 80.2620, phone: '044-28512785', url: 'https://foscos.fssai.gov.in', issues: 'State Food Safety License' },
    { name: 'Tamil Nadu Fire & Rescue Services', type: 'fire', address: 'Arignar Anna Nagar, Chennai 600050', lat: 13.0878, lng: 80.2086, phone: '044-26231101', url: 'https://www.tnfrs.tn.gov.in', issues: 'Fire NOC' },
  ],
  'kolkata, west bengal': [
    { name: 'KMC — Kolkata Municipal Corporation', type: 'cityHall', address: '5 S N Banerjee Rd, Kolkata 700013', lat: 22.5643, lng: 88.3524, phone: '1800-345-5000', url: 'https://www.kmcgov.in', issues: 'Trade License, Building Permit' },
    { name: 'FSSAI — Eastern Regional Office', type: 'food', address: 'Nizam Palace, AJC Bose Rd, Kolkata 700020', lat: 22.5492, lng: 88.3510, phone: '033-22814073', url: 'https://foscos.fssai.gov.in', issues: 'FSSAI Food License' },
    { name: 'West Bengal GST Commissionerate', type: 'tax', address: '14 Strand Rd, Kolkata 700001', lat: 22.5728, lng: 88.3466, phone: '033-22435075', url: 'https://www.gst.gov.in', issues: 'GST Registration' },
  ],
  'ahmedabad, gujarat': [
    { name: 'AMC — Ahmedabad Municipal Corporation', type: 'cityHall', address: 'Sardar Patel Bhavan, Danapith, Ahmedabad 380001', lat: 23.0285, lng: 72.5850, phone: '079-25391811', url: 'https://ahmedabadcity.gov.in', issues: 'Trade License' },
    { name: 'FSSAI — Gujarat State Licensing Authority', type: 'food', address: 'FDA Block 5, Ahmedabad 380006', lat: 23.0387, lng: 72.5685, phone: '079-26305131', url: 'https://foscos.fssai.gov.in', issues: 'Food Safety License' },
    { name: 'Gujarat GST Office', type: 'tax', address: 'Ahmedabad', lat: 23.0225, lng: 72.5714, phone: '1800-1200-232', url: 'https://www.gst.gov.in', issues: 'GST Registration' },
  ],
};

export function getDeptLocations(cityStr) {
  if (!cityStr) return [];
  const key = cityStr.toLowerCase().trim();
  if (DEPT_LOCATIONS[key]) return DEPT_LOCATIONS[key];
  const firstWord = key.split(',')[0].trim();
  const found = Object.entries(DEPT_LOCATIONS).find(([k]) => k.startsWith(firstWord));
  return found ? found[1] : [];
}
