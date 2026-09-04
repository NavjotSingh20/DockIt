import { createRequire } from 'module';
const require = createRequire('C:/Users/navjo/OneDrive/Desktop/DockIt/');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const puppeteer = require('puppeteer-core');
import fs from 'fs';
import path from 'path';

async function measureExact() {
  const bytes = fs.readFileSync('public/templates/314c-standard-form.pdf');
  const doc = await PDFDocument.load(bytes);
  const page = doc.getPages()[0];
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Let's draw vertical ticks every 5 points from x=360 to x=400 at y=340
  for (let x = 360; x <= 400; x += 5) {
    page.drawLine({
      start: { x, y: 330 },
      end: { x, y: 360 },
      thickness: 0.5,
      color: rgb(1, 0, 0)
    });
    page.drawText(String(x), {
      x: x - 4,
      y: 322,
      size: 5,
      font,
      color: rgb(1, 0, 0)
    });
  }

  // Also draw test text at different X positions:
  // Let's see what x=370, x=375, x=380, x=385 look like
  page.drawText('X:375 mara@ricoscurbside.com', { x: 375, y: 340, size: 8.5, font, color: rgb(0, 0, 0.8) });

  const out = await doc.save();
  const pdfOutPath = 'C:/Users/navjo/.gemini/antigravity-ide/brain/b22bff24-110a-4a1d-8fad-51e538497855/scratch/measure_exact.pdf';
  fs.writeFileSync(pdfOutPath, out);

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const p = await browser.newPage();
  await p.setViewport({ width: 1600, height: 2200, deviceScaleFactor: 2 });
  await p.goto('file:///' + path.resolve(pdfOutPath).replace(/\\/g, '/'));
  await new Promise(r => setTimeout(r, 1500));
  await p.screenshot({ path: 'C:/Users/navjo/.gemini/antigravity-ide/brain/b22bff24-110a-4a1d-8fad-51e538497855/scratch/measure_exact.png' });
  await browser.close();
  console.log('Saved measure_exact.png');
}

measureExact().catch(console.error);
