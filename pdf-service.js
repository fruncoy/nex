import express from 'express'
import puppeteer from 'puppeteer-core'
import cors from 'cors'
import fs from 'fs'

const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Function to find Chrome executable
const findChrome = () => {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `C:\\Users\\${process.env.USERNAME}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
    '/usr/bin/google-chrome', // Linux
    '/usr/bin/chromium-browser' // Linux Chromium
  ]
  
  for (const path of possiblePaths) {
    try {
      if (fs.existsSync(path)) {
        console.log('Found Chrome at:', path)
        return path
      }
    } catch (error) {
      // Continue to next path
    }
  }
  
  console.log('No Chrome installation found in standard locations')
  return null
}

app.post('/generate-pdf', async (req, res) => {
  try {
    const { html, filename, options = {} } = req.body
    
    console.log('Generating PDF for:', filename)
    
    const chromePath = findChrome()
    
    if (!chromePath) {
      throw new Error('Chrome browser not found. Please install Google Chrome.')
    }
    
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: chromePath,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-default-apps'
      ]
    })
    
    const page = await browser.newPage()
    
    // Set content and wait for it to load
    await page.setContent(html, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    })
    
    // Default PDF options
    const defaultOptions = {
      format: 'A4',
      printBackground: true,
      margin: { 
        top: '20px', 
        bottom: '20px', 
        left: '20px', 
        right: '20px' 
      },
      preferCSSPageSize: true
    }
    
    // Merge with custom options
    const pdfOptions = { ...defaultOptions, ...options }
    
    // Generate PDF
    const pdf = await page.pdf(pdfOptions)
    
    await browser.close()
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(pdf)
    
    console.log('PDF generated successfully:', filename)
    
  } catch (error) {
    console.error('PDF generation error:', error)
    res.status(500).json({ error: 'PDF generation failed', details: error.message })
  }
})

app.post('/generate-image', async (req, res) => {
  try {
    const { html, filename, options = {} } = req.body
    
    console.log('Generating image for:', filename)
    
    const chromePath = findChrome()
    
    if (!chromePath) {
      throw new Error('Chrome browser not found. Please install Google Chrome.')
    }
    
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: chromePath,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-default-apps'
      ]
    })
    
    const page = await browser.newPage()
    
    // Set viewport for image generation
    if (options.width && options.height) {
      await page.setViewport({ 
        width: options.width, 
        height: options.height,
        deviceScaleFactor: 2 // For high quality
      })
    }
    
    // Set content and wait for it to load
    await page.setContent(html, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    })
    
    // Generate screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: true,
      ...options
    })
    
    await browser.close()
    
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(screenshot)
    
    console.log('Image generated successfully:', filename)
    
  } catch (error) {
    console.error('Image generation error:', error)
    res.status(500).json({ error: 'Image generation failed', details: error.message })
  }
})

app.get('/health', (req, res) => {
  res.json({ status: 'PDF service is running' })
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`PDF service running on http://localhost:${PORT}`)
  console.log('Ready to generate PDFs and images!')
  console.log('Using system Chrome browser')
  
  // Test Chrome detection on startup
  const chromePath = findChrome()
  if (chromePath) {
    console.log('✅ Chrome detected successfully')
  } else {
    console.log('❌ Chrome not found - PDF generation will fail')
    console.log('Please install Google Chrome from https://www.google.com/chrome/')
  }
})