# PDF Generation Setup

## Local Development with PDF Generation

This project uses Puppeteer for PDF generation. It works both locally and online (via Vercel Serverless Functions).

### Quick Start (Local)

1. **Run both services together:**
   ```bash
   npm run dev
   ```
   This starts both the Vite dev server and the local PDF service (port 3001).

### Manual Setup (Local)

1. **Start the PDF service only:**
   ```bash
   npm run pdf-service
   ```

2. **Start the Vite app only:**
   ```bash
   npm run vite
   ```

### How It Works

- **Local Environment**: The app detects `localhost` and uses the local PDF service on port 3001.
- **Online/Production**: The app automatically switches to the Vercel Serverless Function at `/api/generate-pdf`.

### PDF Service Details

- **Local Port**: 3001
- **Local Endpoint**: `POST http://localhost:3001/generate-pdf`
- **Online Endpoint**: `POST /api/generate-pdf`
- **Health Check (Local)**: `GET http://localhost:3001/health`

### Troubleshooting

If PDF generation fails:
1. Make sure the PDF service is running on port 3001
2. Check browser console for error messages
3. Verify Puppeteer installation: `npm list puppeteer`

### Production Deployment

The PDF generation is fully automated for production using Vercel Serverless Functions. No additional configuration is required.