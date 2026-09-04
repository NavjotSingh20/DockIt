import {
  fillOfficialForm,
  checkApplicationReadiness,
  hasOfficialForm
} from '../src/utils/formFillEngine.js';
import {
  DEMO_BUSINESS_RICO,
  DEMO_REQUIREMENTS
} from '../src/utils/demoData.js';

async function runTests() {
  console.log('--- 1. Testing Official Form Filling for NYC DCWP (demo-req-nyc-1) ---');
  const nycReq = DEMO_REQUIREMENTS.find(r => r.id === 'demo-req-nyc-1');
  if (!nycReq) throw new Error('demo-req-nyc-1 not found');

  const readinessRico = checkApplicationReadiness(nycReq, DEMO_BUSINESS_RICO);
  console.log('Readiness for Rico (Full profile):', {
    hasOfficialForm: readinessRico.hasOfficialForm,
    isReady: readinessRico.isReady,
    readyFields: readinessRico.readyFields,
    totalFields: readinessRico.totalFields,
    missingFields: readinessRico.missingFields
  });

  const pdfBlob = await fillOfficialForm(nycReq, DEMO_BUSINESS_RICO);
  console.log('Generated PDF size (bytes):', pdfBlob.size, 'type:', pdfBlob.type);
  if (pdfBlob.size < 1000) throw new Error('Generated PDF too small!');

  console.log('\n--- 2. Testing Missing Information Intake Scenario ---');
  const incompleteBiz = {
    business_name: "Rico's Curbside Kitchen",
    city: 'New York, NY',
    country: 'USA'
    // Missing owner_name, phone, address, email
  };

  const readinessIncomplete = checkApplicationReadiness(nycReq, incompleteBiz);
  console.log('Incomplete profile readiness:', {
    hasOfficialForm: readinessIncomplete.hasOfficialForm,
    isReady: readinessIncomplete.isReady,
    missingFields: readinessIncomplete.missingFields.map(f => f.key)
  });

  if (readinessIncomplete.isReady) {
    throw new Error('Incomplete profile should not be ready!');
  }

  console.log('\n--- 3. Testing Simulated AI Extraction & Reconciliation ---');
  // Simulated extraction from user message: "My name is Mara Rosas, call 212-555-0199 at 450 W 42nd St, New York, NY 10036, email mara@test.com"
  const simulatedExtracted = {
    owner_name: 'Mara Rosas',
    phone: '212-555-0199',
    address: '450 W 42nd St, New York, NY 10036',
    email: 'mara@test.com'
  };

  const updatedBiz = { ...incompleteBiz, ...simulatedExtracted };
  const updatedReadiness = checkApplicationReadiness(nycReq, updatedBiz);
  console.log('Updated profile readiness:', {
    isReady: updatedReadiness.isReady,
    readyFields: updatedReadiness.readyFields,
    totalFields: updatedReadiness.totalFields,
    missingFields: updatedReadiness.missingFields
  });

  if (!updatedReadiness.isReady) {
    throw new Error('Profile should be ready after supplying missing fields!');
  }

  const updatedPdfBlob = await fillOfficialForm(nycReq, updatedBiz);
  console.log('Post-intake generated PDF size:', updatedPdfBlob.size);

  console.log('\n--- 4. Testing Multi-Jurisdiction Isolation ---');
  const fssaiReq = DEMO_REQUIREMENTS.find(r => r.requirement_name?.includes('FSSAI'));
  if (fssaiReq) {
    const fssaiReadiness = checkApplicationReadiness(fssaiReq, DEMO_BUSINESS_RICO);
    console.log('FSSAI requirement detected official form:', fssaiReadiness.hasOfficialForm);
    const fssaiPdf = await fillOfficialForm(fssaiReq, {
      business_name: 'Urban Tadka Kitchen',
      owner_name: 'Rajesh Kumar',
      address: 'Connaught Place, New Delhi',
      city: 'Delhi',
      country: 'India',
      phone: '+91 98765 43210',
      email: 'contact@business.in'
    });
    console.log('FSSAI generated PDF size:', fssaiPdf.size);
  }

  console.log('\nALL VERIFICATION TESTS PASSED SUCCESSFULLY! ✅');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
