import puppeteer from 'puppeteer-core';
import fs from 'fs';

const findChrome = () => {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];
  for (const path of possiblePaths) {
    if (fs.existsSync(path)) return path;
  }
  return null;
};

async function testDirect() {
  const chromePath = findChrome();
  console.log('Using Chrome:', chromePath);
  
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    args: ['--no-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    console.log('Page created');
    
    await page.setContent('<html><body><h1>Direct Test</h1></body></html>', { waitUntil: 'networkidle0' });
    console.log('Content set');
    
    const pdf = await page.pdf({ format: 'A4' });
    fs.writeFileSync('direct-test.pdf', pdf);
    console.log('PDF saved');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
}

testDirect();
