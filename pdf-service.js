import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

const chromePath = findChrome()

app.post('/generate-pdf', async (req, res) => {
  try {
    const { url, html, content, filename, options = {} } = req.body
    const htmlToUse = html || content

    console.log('Generating PDF for:', filename)

    const worker = spawn('node', ['pdf-worker.js', chromePath])
    
    let pdfData = []
    let errorData = ''
    
    if (url) {
      // If URL is provided, send it to worker as HTML with a redirect or something
      // Actually, let's just make the worker handle URLs too
      worker.stdin.write(`___URL___:${url}`)
    } else {
      worker.stdin.write(htmlToUse)
    }
    worker.stdin.end()
    
    worker.stdout.on('data', (data) => pdfData.push(data))
    worker.stderr.on('data', (data) => errorData += data.toString())
    
    worker.on('close', (code) => {
      if (code === 0) {
        res.setHeader('Content-Type', 'application/pdf')
        res.send(Buffer.concat(pdfData))
        console.log('PDF generated via worker.')
      } else {
        console.error('Worker failed:', errorData)
        res.status(500).json({ error: 'Worker failed', details: errorData })
      }
    })
  } catch (error) {
    console.error('Service error:', error)
    res.status(500).json({ error: 'Service error', details: error.message })
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