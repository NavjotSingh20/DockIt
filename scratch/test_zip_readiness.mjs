import { checkApplicationReadiness } from '../src/utils/formFillEngine.js';
import { DEMO_REQUIREMENTS, DEMO_BUSINESS_RICO } from '../src/utils/demoData.js';

const req = DEMO_REQUIREMENTS.find(r => r.id === 'demo-req-nyc-2');
console.log('1. Base readiness for RICO:', checkApplicationReadiness(req, DEMO_BUSINESS_RICO));

// Business missing zip explicitly but address has 10036
const bizWithoutExplicitZip = {
  business_name: "Rico's Curbside Kitchen",
  owner_name: 'Mara Delgado',
  phone: '+1 212 555 0199',
  email: 'mara@ricoscurbside.com',
  address: '450 W 42nd St, New York, NY 10036',
  city: 'New York',
  country: 'USA'
};
const r = checkApplicationReadiness(req, bizWithoutExplicitZip);
console.log('2. Readiness when address contains 10036:', r.isReady, 'missing:', r.missingFields);
