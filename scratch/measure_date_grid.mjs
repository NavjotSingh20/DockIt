import { createRequire } from 'module';
const require = createRequire('C:/Users/navjo/OneDrive/Desktop/DockIt/');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const puppeteer = require('puppeteer-core');
import fs from 'fs';
import path from 'path';

async function testGrid() {
  const bytes = fs.readFileSync('public/templates/314c-standard-form.pdf');
  const doc = await PDFDocument.load(bytes);
  const page = doc.getPages()[0];
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Measure date box:
  // Let's draw horizontal and vertical ticks for APPLICATION DATE (x: 40..250, y: 615..660)
  for (let x = 40; x <= 250; x += 10) {
    page.drawLine({ start: { x, y: 615 }, end: { x, y: 660 }, thickness: 0.2, color: rgb(1, 0, 0) });
    if (x % 20 === 0) {
      page.drawText(String(x), { x: x - 4, y: 608, size: 4, font, color: rgb(1, 0, 0) });
    }
  }

  // Draw ticks for y: 615..660
  for (let y = 615; y <= 660; y += 5) {
    page.drawLine({ start: { x: 35, y }, end: { x: 250, y }, thickness: 0.2, color: rgb(0, 0, 1) });
    if (y % 10 === 0) {
      page.drawText(String(y), { x: 22, y: y - 2, size: 4, font, color: rgb(0, 0, 1) });
    }
  }

  const out = await doc.save();
  const pdfOutPath = 'C:/Users/navjo/.gemini/antigravity-ide/brain/b22bff24-110a-4a1d-8fad-51e538497855/scratch/date_grid.pdf';
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
  await p.screenshot({ path: 'C:/Users/navjo/.gemini/antigravity-ide/brain/b22bff24-110a-4a1d-8fad-51e538497855/scratch/date_grid.png' });
  await browser.close();
  console.log('Saved date_grid.png');
}

testGrid().catch(console.error);
