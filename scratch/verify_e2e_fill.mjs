import { createRequire } from 'module';
const require = createRequire('C:/Users/navjo/OneDrive/Desktop/DockIt/');
const puppeteer = require('puppeteer-core');
import fs from 'fs';
import path from 'path';

async function testFullOfficialFormPipeline() {
  const { fillOfficialForm } = await import('../src/utils/formFillEngine.js');
  const { DEMO_REQUIREMENTS, DEMO_BUSINESS_RICO } = await import('../src/utils/demoData.js');

  const req = DEMO_REQUIREMENTS.find(r => r.id === 'demo-req-nyc-1');
  console.log('Filling form for:', req.requirement_name);

  const pdfBlob = await fillOfficialForm(req, DEMO_BUSINESS_RICO);
  const buffer = Buffer.from(await pdfBlob.arrayBuffer());
  const outPath = 'scratch/e2e_official_filled.pdf';
  fs.writeFileSync(outPath, buffer);
  console.log('PDF saved, size:', buffer.length);

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const p = await browser.newPage();
  await p.setViewport({ width: 1400, height: 1800 });
  await p.goto('file:///' + path.resolve(outPath).replace(/\\/g, '/'));
  await new Promise(r => setTimeout(r, 1500));
  await p.screenshot({ path: 'scratch/e2e_official_filled.png' });
  await browser.close();
  console.log('Screenshot saved to scratch/e2e_official_filled.png');
}

testFullOfficialFormPipeline().catch(console.error);
