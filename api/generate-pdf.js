import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { html, url, options = {} } = req.body;
    
    // Set up chromium
    const executablePath = await chromium.executablePath();
    
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    if (url) {
      await page.goto(url, { waitUntil: 'networkidle0' });
    } else if (html) {
      await page.setContent(html, { waitUntil: 'networkidle0' });
    } else {
      await browser.close();
      return res.status(400).json({ error: 'No content provided' });
    }

    const pdf = await page.pdf({
      format: options.format || 'A4',
      landscape: options.landscape || false,
      printBackground: options.printBackground !== undefined ? options.printBackground : true,
      margin: options.margin || { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
      preferCSSPageSize: options.preferCSSPageSize !== undefined ? options.preferCSSPageSize : true,
      scale: options.scale || 1.0,
      width: options.width,
      height: options.height,
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${req.body.filename || 'document.pdf'}`);
    return res.send(pdf);
  } catch (error) {
    console.error('PDF generation error:', error);
    return res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
  }
}
