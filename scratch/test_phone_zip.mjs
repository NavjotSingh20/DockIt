import { createRequire } from 'module';
const require = createRequire('C:/Users/navjo/OneDrive/Desktop/DockIt/');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const puppeteer = require('puppeteer-core');
import fs from 'fs';
import path from 'path';

async function testPhoneAndZip() {
  const bytes = fs.readFileSync('public/templates/314c-standard-form.pdf');
  const doc = await PDFDocument.load(bytes);
  const page = doc.getPages()[0];
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const inkColor = rgb(0, 0, 0.65);

  // Phone at x=418, y=432
  page.drawText('(212) 555-0199', { x: 418, y: 432, size: 8.5, font, color: inkColor });

  // ZIP digits spaced nicely:
  const zip = '10036';
  const zipXs = [277, 296, 315, 334, 353];
  for (let i = 0; i < zip.length; i++) {
    page.drawText(zip[i], { x: zipXs[i], y: 338, size: 8.5, font, color: inkColor });
  }

  const out = await doc.save();
  const outPath = 'scratch/test_phone_zip.pdf';
  fs.writeFileSync(outPath, out);

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const p = await browser.newPage();
  await p.setViewport({ width: 1400, height: 1800 });
  await p.goto('file:///' + path.resolve(outPath).replace(/\\/g, '/'));
  await new Promise(r => setTimeout(r, 1500));
  await p.screenshot({ path: 'scratch/test_phone_zip.png' });
  await browser.close();
  console.log('Saved test_phone_zip.png');
}

testPhoneAndZip().catch(console.error);
