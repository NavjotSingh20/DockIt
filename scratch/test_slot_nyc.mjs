import { createRequire } from 'module';
const require = createRequire('C:/Users/navjo/OneDrive/Desktop/DockIt/');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const puppeteer = require('puppeteer-core');
import fs from 'fs';
import path from 'path';

async function testPerfection() {
  const bytes = fs.readFileSync('public/templates/314c-standard-form.pdf');
  const doc = await PDFDocument.load(bytes);
  const page = doc.getPages()[0];
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const inkColor = rgb(0, 0, 0.65);

  // Helper to draw centered char in a slot [xStart, xEnd] at baseline y
  function drawInSlot(char, xStart, xEnd, y, size = 8.5, f = font) {
    const w = f.widthOfTextAtSize(char, size);
    const x = xStart + (xEnd - xStart - w) / 2;
    page.drawText(char, { x, y, size, font: f, color: inkColor });
  }

  // 1. APPLICATION DATE (y: 625)
  // Month: 2 slots [42.5, 68.5] and [68.5, 94.5]
  drawInSlot('0', 42.5, 68.5, 625, 8.5);
  drawInSlot('9', 68.5, 94.5, 625, 8.5);

  // Day: 2 slots [94.5, 120.5] and [120.5, 146.5]
  drawInSlot('0', 94.5, 120.5, 625, 8.5);
  drawInSlot('5', 120.5, 146.5, 625, 8.5);

  // Year: 4 slots [146.5, 159.5], [159.5, 172.5], [172.5, 185.5], [185.5, 198.5]
  drawInSlot('2', 146.5, 159.5, 625, 8.5);
  drawInSlot('0', 159.5, 172.5, 625, 8.5);
  drawInSlot('2', 172.5, 185.5, 625, 8.5);
  drawInSlot('6', 185.5, 198.5, 625, 8.5);

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

  // Telephone: Area code 3 slots [398, 415], [415, 432], [432, 449]
  // Let's verify area code ticks:
  drawInSlot('2', 398, 415, 430, 8.5);
  drawInSlot('1', 415, 432, 430, 8.5);
  drawInSlot('2', 432, 449, 430, 8.5);

  // 7 digits of phone: slots from 450 to 568
  // 7 slots of width ~16.8:
  const phoneDigits = '5550199';
  const startX = 450;
  const slotW = (568 - 450) / 7;
  for (let i = 0; i < phoneDigits.length; i++) {
    drawInSlot(phoneDigits[i], startX + i * slotW, startX + (i + 1) * slotW, 430, 8.5);
  }

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

  // State: 2 slots [227, 248.5] and [248.5, 270]
  drawInSlot('N', 227, 248.5, 332, 8.5);
  drawInSlot('Y', 248.5, 270, 332, 8.5);

  // ZIP: 5 slots [270, 292], [292, 313], [313, 335], [335, 356], [356, 378.5]
  const zipDigits = '10036';
  const zipSlots = [
    [270, 292],
    [292, 313.5],
    [313.5, 335],
    [335, 356.5],
    [356.5, 378.5]
  ];
  for (let i = 0; i < 5; i++) {
    drawInSlot(zipDigits[i], zipSlots[i][0], zipSlots[i][1], 332, 8.5);
  }

  // Email: box 378.5..568
  page.drawText('mara@ricoscurbside.com', { x: 386, y: 332, size: 8.5, font, color: inkColor });

  const out = await doc.save();
  const pdfOutPath = 'C:/Users/navjo/.gemini/antigravity-ide/brain/b22bff24-110a-4a1d-8fad-51e538497855/scratch/perfect_slot_nyc.pdf';
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
  await p.screenshot({ path: 'C:/Users/navjo/.gemini/antigravity-ide/brain/b22bff24-110a-4a1d-8fad-51e538497855/scratch/perfect_slot_nyc.png' });
  await browser.close();
  console.log('Saved perfect_slot_nyc.png');
}

testPerfection().catch(console.error);
