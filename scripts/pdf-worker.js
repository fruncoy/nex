import puppeteer from 'puppeteer-core';
import fs from 'fs';

const chromePath = process.argv[2];
const html = fs.readFileSync(0, 'utf8'); // Read from stdin

async function run() {
  console.error('Worker started');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    args: ['--no-sandbox']
  });
  
  try {
    console.error('Browser launched');
    const page = await browser.newPage();
    console.error('Page created');
    
    if (html.startsWith('___URL___:')) {
      const url = html.replace('___URL___:', '');
      console.error('Navigating to URL:', url);
      await page.goto(url, { waitUntil: 'networkidle0' });
    } else {
      console.error('Setting HTML content');
      await page.setContent(html, { waitUntil: 'networkidle0' });
    }
    
    console.error('Content loaded');
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    console.error('PDF generated');
    process.stdout.write(pdf);
  } catch (e) {
    console.error('Error in worker:', e);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
