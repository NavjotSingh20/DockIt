import { createRequire } from 'module';
const require = createRequire('C:/Users/navjo/OneDrive/Desktop/DockIt/');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const puppeteer = require('puppeteer-core');
import fs from 'fs';
import path from 'path';

async function testExactVectorCoords() {
  const bytes = fs.readFileSync('public/templates/314c-standard-form.pdf');
  const doc = await PDFDocument.load(bytes);
  const page = doc.getPages()[0];
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const inkColor = rgb(0, 0, 0.65);

  // 1. APPLICATION DATE:
  // Month: 20.55..65.6 (center 43.1)
  page.drawText('09', { x: 37, y: 624, size: 8.5, font, color: inkColor });
  // Day: 65.6..109.55 (center 87.6)
  page.drawText('05', { x: 82, y: 624, size: 8.5, font, color: inkColor });
  // Year: 109.55..197.38 (center 153.5)
  page.drawText('2026', { x: 143, y: 624, size: 8.5, font, color: inkColor });

  // 2. NAME OF LICENSE/PERMIT:
  page.drawText('MOBILE FOOD VENDOR (MFV) PERMIT - CLASS A TRUCK', {
    x: 28,
    y: 560,
    size: 9.5,
    font: fontBold,
    color: inkColor
  });

  // 3. Section A - Row 1 (y: 432):
  // Owner Name (Last Name First): 19.25..362.70
  page.drawText('Delgado, Mara', { x: 28, y: 432, size: 9, font, color: inkColor });
  // Telephone: 362.70..593.00
  page.drawText('(212) 555-0199', { x: 372, y: 432, size: 9, font, color: inkColor });

  // 4. Section A - Row 2 (y: 398):
  // Trade Name / DBA: 19.25..362.70
  page.drawText("Rico's Curbside Kitchen", { x: 28, y: 398, size: 9, font, color: inkColor });

  // 5. Section A - Row 3 (y: 368):
  // Building Number: 19.25..107.37
  page.drawText('450', { x: 28, y: 368, size: 9, font, color: inkColor });
  // Street: 107.37..362.70
  page.drawText('W 42nd St', { x: 116, y: 368, size: 9, font, color: inkColor });

  // 6. Section A - Row 4 (y: 338):
  // City: 19.25..219.71
  page.drawText('New York', { x: 28, y: 338, size: 9, font, color: inkColor });
  // State: 219.71..267.12
  page.drawText('NY', { x: 236, y: 338, size: 9, font, color: inkColor });
  // ZIP: 267.12..362.70
  page.drawText('10036', { x: 280, y: 338, size: 9, font, color: inkColor });
  // Email: 362.70..593.00 (Starts at 372, padding of 9.3 points from line 362.70!)
  page.drawText('mara@ricoscurbside.com', { x: 372, y: 338, size: 8.5, font, color: inkColor });

  const out = await doc.save();
  const pdfOutPath = 'C:/Users/navjo/.gemini/antigravity-ide/brain/b22bff24-110a-4a1d-8fad-51e538497855/scratch/exact_vector_nyc.pdf';
  fs.writeFileSync(pdfOutPath, out);

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const p = await browser.newPage();
  await p.setViewport({ width: 1400, height: 1800 });
  await p.goto('file:///' + path.resolve(pdfOutPath).replace(/\\/g, '/'));
  await new Promise(r => setTimeout(r, 1500));
  await p.screenshot({ path: 'C:/Users/navjo/.gemini/antigravity-ide/brain/b22bff24-110a-4a1d-8fad-51e538497855/scratch/exact_vector_nyc.png' });
  await browser.close();
  console.log('Saved exact_vector_nyc.png');
}

testExactVectorCoords().catch(console.error);
