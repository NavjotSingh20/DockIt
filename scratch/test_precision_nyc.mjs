import { createRequire } from 'module';
const require = createRequire('C:/Users/navjo/OneDrive/Desktop/DockIt/');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const puppeteer = require('puppeteer-core');
import fs from 'fs';
import path from 'path';

async function testFullPrecisionNYC() {
  const bytes = fs.readFileSync('public/templates/314c-standard-form.pdf');
  const doc = await PDFDocument.load(bytes);
  const page = doc.getPages()[0];
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const inkColor = rgb(0, 0, 0.65);

  // 1. APPLICATION DATE (y: 625, perfectly centered in boxes)
  // Month: box 42.5..94.5 (center 68.5)
  page.drawText('09', { x: 63, y: 625, size: 8.5, font, color: inkColor });
  // Day: box 94.5..146.5 (center 120.5)
  page.drawText('05', { x: 115, y: 625, size: 8.5, font, color: inkColor });
  // Year: box 146.5..198.5 (center 172.5)
  page.drawText('2026', { x: 162, y: 625, size: 8.5, font, color: inkColor });

  // 2. NAME OF LICENSE/PERMIT (y: 554)
  page.drawText('MOBILE FOOD VENDOR (MFV) PERMIT - CLASS A TRUCK', {
    x: 50,
    y: 554,
    size: 9.5,
    font: fontBold,
    color: inkColor
  });

  // 3. Section A - Row 1 (y: 430)
  // Owner Name (Last Name First): box 42.5..378.5
  page.drawText('Delgado, Mara', { x: 48, y: 430, size: 9, font, color: inkColor });
  // Telephone: box 378.5..568
  page.drawText('(212) 555-0199', { x: 386, y: 430, size: 9, font, color: inkColor });

  // 4. Section A - Row 2 (y: 396)
  // Trade Name / DBA: box 42.5..378.5
  page.drawText("Rico's Curbside Kitchen", { x: 48, y: 396, size: 9, font, color: inkColor });

  // 5. Section A - Row 3 (y: 364)
  // Building Number: box 42.5..112.5
  page.drawText('450', { x: 48, y: 364, size: 9, font, color: inkColor });
  // Street: box 112.5..378.5
  page.drawText('W 42nd St', { x: 120, y: 364, size: 9, font, color: inkColor });

  // 6. Section A - Row 4 (y: 332)
  // City: box 42.5..227
  page.drawText('New York', { x: 48, y: 332, size: 9, font, color: inkColor });
  // State: box 227..270
  page.drawText('NY', { x: 240, y: 332, size: 9, font, color: inkColor });
  // ZIP: box 270..378.5
  page.drawText('10036', { x: 285, y: 332, size: 9, font, color: inkColor });
  // Email: box 378.5..568 (Divider is at 378.5, label starts at 385, text starts at 386!)
  page.drawText('mara@ricoscurbside.com', { x: 386, y: 332, size: 8.5, font, color: inkColor });

  const out = await doc.save();
  const pdfOutPath = 'C:/Users/navjo/.gemini/antigravity-ide/brain/b22bff24-110a-4a1d-8fad-51e538497855/scratch/precision_nyc.pdf';
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
  await p.screenshot({ path: 'C:/Users/navjo/.gemini/antigravity-ide/brain/b22bff24-110a-4a1d-8fad-51e538497855/scratch/precision_nyc.png' });
  await browser.close();
  console.log('Saved precision_nyc.png');
}

testFullPrecisionNYC().catch(console.error);
