import { createRequire } from 'module';
const require = createRequire('C:/Users/navjo/OneDrive/Desktop/DockIt/');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const puppeteer = require('puppeteer-core');
import fs from 'fs';
import path from 'path';

async function testExactSlots() {
  const bytes = fs.readFileSync('public/templates/314c-standard-form.pdf');
  const doc = await PDFDocument.load(bytes);
  const page = doc.getPages()[0];
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const inkColor = rgb(0, 0, 0.65);

  function drawCharCentered(char, centerX, y, size = 8.5, f = font) {
    const w = f.widthOfTextAtSize(char, size);
    page.drawText(char, { x: centerX - w / 2, y, size, font: f, color: inkColor });
  }

  // 1. APPLICATION DATE
  const dateY = 623.5;
  const monthSlots = [32.09, 54.61];
  const daySlots = [76.59, 98.56];
  const yearSlots = [120.54, 142.60, 164.75, 186.87];

  const month = '09';
  const day = '05';
  const year = '2026';

  month.split('').forEach((c, i) => drawCharCentered(c, monthSlots[i], dateY, 8.5));
  day.split('').forEach((c, i) => drawCharCentered(c, daySlots[i], dateY, 8.5));
  year.split('').forEach((c, i) => drawCharCentered(c, yearSlots[i], dateY, 8.5));

  // 2. NAME OF LICENSE/PERMIT
  page.drawText('MOBILE FOOD VENDOR (MFV) PERMIT - CLASS A TRUCK', {
    x: 28,
    y: 560,
    size: 9.5,
    font: fontBold,
    color: inkColor
  });

  // 3. Section A - Row 1
  page.drawText('Delgado, Mara', { x: 28, y: 432, size: 9, font, color: inkColor });

  // Telephone - 10 slots
  const phoneSlots = [421.28, 439.30, 456.95, 474.97, 493.37, 511.14, 529.17, 547.44, 565.47, 583.74];
  const phoneDigits = '2125550199';
  phoneDigits.split('').forEach((c, i) => drawCharCentered(c, phoneSlots[i], 431, 8.5));

  // 4. Section A - Row 2
  page.drawText("Rico's Curbside Kitchen", { x: 28, y: 398, size: 9, font, color: inkColor });

  // 5. Section A - Row 3
  page.drawText('450', { x: 28, y: 368, size: 9, font, color: inkColor });
  page.drawText('W 42nd St', { x: 116, y: 368, size: 9, font, color: inkColor });

  // 6. Section A - Row 4
  page.drawText('New York', { x: 28, y: 338, size: 9, font, color: inkColor });

  // State - 2 slots
  const stateSlots = [218.26, 247.55];
  const state = 'NY';
  state.split('').forEach((c, i) => drawCharCentered(c, stateSlots[i], 338, 8.5));

  // Zip - 5 slots
  const zipSlots = [271.71, 291.68, 311.84, 332.00, 352.17];
  const zip = '10036';
  zip.split('').forEach((c, i) => drawCharCentered(c, zipSlots[i], 338, 8.5));

  // Email
  page.drawText('mara@ricoscurbside.com', { x: 372, y: 338, size: 8.5, font, color: inkColor });

  const out = await doc.save();
  const pdfOutPath = 'scratch/test_exact_slots.pdf';
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
  await p.screenshot({ path: 'scratch/test_exact_slots.png' });
  await browser.close();
  console.log('Saved test_exact_slots.png');
}

testExactSlots().catch(console.error);
