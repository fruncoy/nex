# PDF Generation Setup

## Local Development with PDF Generation

This project uses Puppeteer for PDF generation, which **only works locally** during development.

### Quick Start

1. **Run both services together:**
   ```bash
   npm run dev-with-pdf
   ```
   This starts both the React app (port 3000) and PDF service (port 3001).

### Manual Setup

1. **Start the PDF service:**
   ```bash
   npm run pdf-service
   ```

2. **In another terminal, start the React app:**
   ```bash
   npm run dev
   ```

### How It Works

- **Local Environment**: Uses Puppeteer to generate high-quality PDFs
- **Online/Production**: Shows message directing users to use browser's print function

### PDF Service Details

- **Port**: 3001
- **Endpoint**: `POST /generate-pdf`
- **Health Check**: `GET http://localhost:3001/health`

### Troubleshooting

If PDF generation fails:
1. Make sure the PDF service is running on port 3001
2. Check browser console for error messages
3. Verify Puppeteer installation: `npm list puppeteer`

### Production Deployment

For production, the PDF download button will show a message directing users to:
1. Use Ctrl+P (or Cmd+P on Mac)
2. Select "Save as PDF" 
3. Choose destination and save

This ensures the feature works locally for development while gracefully handling online users.