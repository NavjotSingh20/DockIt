import { createRequire } from 'module';
const require = createRequire('C:/Users/navjo/OneDrive/Desktop/DockIt/');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const puppeteer = require('puppeteer-core');
import fs from 'fs';
import path from 'path';

async function testPerfectAlignment() {
  const bytes = fs.readFileSync('public/templates/314c-standard-form.pdf');
  const doc = await PDFDocument.load(bytes);
  const page = doc.getPages()[0];
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const inkColor = rgb(0, 0, 0.65);

  // 1. APPLICATION DATE (y: 624, perfectly centered between horizontal line 638 and ticks 616)
  // Month: 20.55..65.6 (center 43.1) -> start at 38
  page.drawText('09', { x: 38, y: 624, size: 8.5, font, color: inkColor });
  // Day: 65.6..109.55 (center 87.6) -> start at 82
  page.drawText('05', { x: 82, y: 624, size: 8.5, font, color: inkColor });
  // Year: 109.55..197.38 (center 153.5) -> start at 144
  page.drawText('2026', { x: 144, y: 624, size: 8.5, font, color: inkColor });

  // 2. NAME OF LICENSE/PERMIT
  page.drawText('MOBILE FOOD VENDOR (MFV) PERMIT - CLASS A TRUCK', {
    x: 28,
    y: 560,
    size: 9.5,
    font: fontBold,
    color: inkColor
  });

  // 3. Section A - Row 1 (y: 435, comfortably above ticks at y=423..429)
  // Owner Name (Last Name First): 19.25..362.70
  page.drawText('Delgado, Mara', { x: 28, y: 435, size: 9, font, color: inkColor });
  // Telephone: starts at x=372 (to the right of line at 362.7)
  page.drawText('(212) 555-0199', { x: 372, y: 435, size: 9, font, color: inkColor });

  // 4. Section A - Row 2 (y: 400)
  // Trade Name / DBA: 19.25..362.70
  page.drawText("Rico's Curbside Kitchen", { x: 28, y: 400, size: 9, font, color: inkColor });

  // 5. Section A - Row 3 (y: 370)
  // Building Number: 19.25..107.37
  page.drawText('450', { x: 28, y: 370, size: 9, font, color: inkColor });
  // Street: 107.37..362.70
  page.drawText('W 42nd St', { x: 116, y: 370, size: 9, font, color: inkColor });

  // 6. Section A - Row 4 (y: 340, comfortably above ticks at y=330..336)
  // City: 19.25..219.71
  page.drawText('New York', { x: 28, y: 340, size: 9, font, color: inkColor });
  // State: 219.71..267.12 (center 243.4)
  page.drawText('NY', { x: 236, y: 340, size: 9, font, color: inkColor });
  // ZIP: 267.12..362.70 (center 314.9)
  page.drawText('10036', { x: 300, y: 340, size: 9, font, color: inkColor });
  // Email: 362.70..593.00 (Divider at 362.70, starts at 372 -> clean 9.3pt gap!)
  page.drawText('mara@ricoscurbside.com', { x: 372, y: 340, size: 8.5, font, color: inkColor });

  const out = await doc.save();
  const outPath = 'scratch/test_perfect_alignment.pdf';
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
  await p.screenshot({ path: 'scratch/test_perfect_alignment.png' });
  await browser.close();
  console.log('Saved test_perfect_alignment.png');
}

testPerfectAlignment().catch(console.error);
