import { useState } from "react"

interface NicheCertificateProps {
  recipientName: string
  role: string
  course: string
  tier: string
  finalScore: number
  cohortNumber: string
  graduationDate: string
  pillar1Score: number
  pillar2Score: number
  pillar3Score: number
  pillar4Score: number
  pillar1Weighted: number
  pillar2Weighted: number
  pillar3Weighted: number
  pillar4Weighted: number
  trainingType: string
  onClose: () => void
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800&family=Poppins:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap');

  .font-cinzel    { font-family: 'Cinzel', serif; }
  .font-playfair  { font-family: 'Playfair Display', serif; }
  .font-poppins   { font-family: 'Poppins', sans-serif; }

  .cert-bg {
    background-color: #FAF9F6;
  }
`;

const ScoreBar = ({ label, score, max }: { label: string; score: number; max: number }) => {
  return (
    <div style={{
      position: "relative",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
      alignItems: "flex-start",
      width: "100%",
      padding: "10px 8px 10px",
      overflow: "hidden",
      height: "clamp(55px,7vw,75px)",
      boxSizing: "border-box",
    }}>

      {/* Underlay: score/total fills the column height */}
      <span className="font-playfair" style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        fontSize: "clamp(30px,3.6vw,46px)",
        fontWeight: 800,
        color: "rgba(217, 86, 55, 0.25)",
        lineHeight: 1,
        pointerEvents: "none",
        userSelect: "none",
        letterSpacing: "-1px",
        zIndex: 0,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textAlign: "center",
      }}>
        {score.toFixed(0)}<span style={{ fontSize:"0.5em" }}>/{max}</span>
      </span>

      {/* Overlay: label only, sits on top */}
      <span className="font-poppins" style={{
        position: "relative",
        zIndex: 1,
        fontSize: "clamp(7px,0.8vw,10.5px)",
        fontWeight: 600,
        color: "#000",
        whiteSpace: "nowrap",
        lineHeight: 1.2,
        textAlign: "center",
        width: "100%",
      }}>
        {label}
      </span>

    </div>
  );
};



const NicheCertificate: React.FC<NicheCertificateProps> = ({
  recipientName,
  role,
  course,
  tier,
  finalScore,
  cohortNumber,
  graduationDate,
  pillar1Score,
  pillar2Score,
  pillar3Score,
  pillar4Score,
  pillar1Weighted,
  pillar2Weighted,
  pillar3Weighted,
  pillar4Weighted,
  trainingType,
  onClose
}) => {
  const nannyPillars = [
    { name: 'Childcare & Development', weight: 1.8, maxWeighted: 45 },
    { name: 'Professional Conduct', weight: 1.2, maxWeighted: 30 },
    { name: 'Housekeeping & Systems', weight: 0.6, maxWeighted: 15 },
    { name: 'Cooking & Nutrition', weight: 0.4, maxWeighted: 10 }
  ]

  const houseManagerPillars = [
    { name: 'Professional Conduct', weight: 1.2, maxWeighted: 30 },
    { name: 'Housekeeping & Systems', weight: 1.2, maxWeighted: 30 },
    { name: 'Cooking & Kitchen', weight: 1.0, maxWeighted: 25 },
    { name: 'Childcare Literacy', weight: 0.6, maxWeighted: 15 }
  ]

  const pillars = trainingType === 'nanny' ? nannyPillars : houseManagerPillars
  const pillarScores = [pillar1Score, pillar2Score, pillar3Score, pillar4Score]
  const weightedScores = [pillar1Weighted, pillar2Weighted, pillar3Weighted, pillar4Weighted]

  const downloadCertificate = async () => {
    // Check if running locally
    const isLocal = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' || 
                   window.location.hostname.includes('192.168') ||
                   window.location.port !== ''
    
    if (!isLocal) {
      alert('Certificate download is only available when running locally. Please use your browser\'s print function (Ctrl+P) and select "Save as PDF".')
      return
    }

    try {
      const element = document.getElementById('certificate-content')
      if (!element) {
        alert('Certificate content not found')
        return
      }

      // Get the exact HTML of the certificate element
      const certificateHTML = element.outerHTML
      
      // Create minimal HTML wrapper with the exact certificate
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>NICHE Certificate - ${recipientName}</title>
          <style>
            ${styles}
            @page {
              size: A4 landscape;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background: #FAF9F6 !important;
              box-sizing: border-box;
              height: 210mm;
              width: 297mm;
              overflow: hidden;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            * {
              background: transparent !important;
              page-break-after: avoid !important;
              page-break-before: avoid !important;
              page-break-inside: avoid !important;
            }
            .cert-bg {
              background: #FAF9F6 !important;
              width: 100% !important;
              height: 100% !important;
              max-width: 297mm !important;
              max-height: 210mm !important;
              aspect-ratio: 1.414 !important;
            }
            #certificate-content {
              width: 297mm !important;
              height: 210mm !important;
              max-width: 297mm !important;
              max-height: 210mm !important;
            }
          </style>
        </head>
        <body>
          ${certificateHTML}
        </body>
        </html>
      `

      // Send to Puppeteer service for PDF generation
      const response = await fetch('http://localhost:3001/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: htmlContent,
          filename: `${recipientName.replace(/\s+/g, '_')}_NICHE_Certificate.pdf`,
          options: {
            format: 'A4',
            landscape: true,
            printBackground: true,
            margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
            preferCSSPageSize: true,
            width: '297mm',
            height: '210mm',
            scale: 1.0
          }
        })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${recipientName.replace(/\s+/g, '_')}_NICHE_Certificate.pdf`
        a.click()
        window.URL.revokeObjectURL(url)
        
        console.log('Certificate PDF downloaded successfully')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.details || 'Certificate generation failed')
      }
    } catch (error) {
      console.error('Certificate generation failed:', error)
      alert(`Certificate generation failed: ${error.message}. Make sure the PDF service is running on localhost:3001`)
    }
  }

  return (
    <>
      <style>{styles}</style>
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="relative w-full h-full max-w-7xl max-h-[95vh] overflow-auto">
          
          {/* Close Button and Download - Fixed position */}
          <div className="absolute top-4 left-4 right-4 flex justify-between z-20">
            <button
              onClick={downloadCertificate}
              className="flex items-center gap-2 bg-[#c5a059] text-white px-4 py-2 rounded-lg hover:bg-[#b8944f] transition-colors shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Certificate
            </button>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 text-3xl font-bold bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center shadow-lg"
            >
              ×
            </button>
          </div>

          {/* Certificate - Exact original styling */}
          <div style={{ minHeight:"100vh", width:"100%", background:"#1a1a1a", display:"flex", justifyContent:"center", alignItems:"flex-start", padding:"40px 16px", boxSizing:"border-box" }}>
            <div style={{ width:"100%", maxWidth:1123, margin:"0 auto", padding:"8px 16px" }}>

              {/* Certificate card — fixed A4-landscape aspect ratio */}
              <div className="cert-bg" style={{
                position:"relative",
                width:"100%",
                aspectRatio:"1.414",
                display:"flex",
                flexDirection:"column",
                alignItems:"center",
                justifyContent:"center",
                gap:"3%",
                padding:"6% 8% 6%",
                boxSizing:"border-box",
                overflow:"hidden"
              }} id="certificate-content">

                {/* Concave Corner Certificate Border */}
                {/* Parent container must have: position: relative, overflow: hidden */}
                {/* The viewBox 1414x1000 matches a 1.414 aspect ratio (A4 landscape) */}
                <svg
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 1,
                  }}
                  viewBox="0 0 1414 1000"
                  preserveAspectRatio="none"
                  fill="none"
                  shapeRendering="crispEdges"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Outer border - thick solid red-orange line, inset 30 units from edge, concave corner radius 35 */}
                  <path
                    d="M 65,30 L 1349,30 Q 1349,65 1384,65 L 1384,935 Q 1349,935 1349,970 L 65,970 Q 65,935 30,935 L 30,65 Q 65,65 65,30 Z"
                    stroke="#d95637"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  {/* Inner border - solid red-orange line, inset 43 units from edge, same concave corner radius 35 */}
                  <path
                    d="M 78,43 L 1336,43 Q 1336,78 1371,78 L 1371,922 Q 1336,922 1336,957 L 78,957 Q 78,922 43,922 L 43,78 Q 78,78 78,43 Z"
                    stroke="#d95637"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>



                {/* ── HEADER ── */}
                <div style={{ textAlign:"center", zIndex:10, width:"100%", marginBottom:"20px" }}>
                  <h1 className="font-cinzel" style={{ fontSize:"clamp(24px,4.2vw,48px)", color:"#000", fontWeight:700, letterSpacing:"0.1em", marginBottom:"12px", lineHeight:1.1 }}>
                    CERTIFICATE OF MERIT
                  </h1>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:16 }}>
                    <div style={{ height:1, width:"clamp(50px,8vw,100px)", background:"#d95637" }} />
                    <p className="font-poppins" style={{ fontSize:"clamp(7px,0.85vw,11px)", letterSpacing:"0.2em", color:"#000", textTransform:"uppercase", whiteSpace:"nowrap" }}>
                      Nestara Institute of Care and Hospitality Excellence
                    </p>
                    <div style={{ height:1, width:"clamp(50px,8vw,100px)", background:"#d95637" }} />
                  </div>
                </div>

                {/* ── RECIPIENT ── */}
                <div style={{ textAlign:"center", zIndex:10, width:"100%", maxWidth:800, marginBottom:"20px" }}>
                  <p className="font-playfair" style={{ fontStyle:"italic", fontSize:"clamp(13px,1.5vw,17px)", color:"#000", marginBottom:"4px" }}>
                    This honor is proudly bestowed upon
                  </p>
                  <h2 className="font-playfair" style={{ fontWeight:700, fontSize:"clamp(28px,3.8vw,48px)", color:"#000", marginBottom:"12px", letterSpacing:"0.02em", lineHeight:1.1 }}>
                    {recipientName}
                  </h2>
                  <p className="font-poppins" style={{ fontSize:"clamp(10px,1.05vw,13px)", color:"#000", lineHeight:1.6, maxWidth:650, margin:"0 auto" }}>
                    In recognition of her exceptional dedication and outstanding achievement within the{" "}
                    <span className="font-cinzel" style={{ color:"#d95637", fontWeight:700, letterSpacing:"0.08em", fontSize:"clamp(10px,1.05vw,13px)" }}>{course}</span>
                    . {recipientName.split(' ')[0]} has met the most stringent requirements of the curriculum, exhibiting a level of competency that transcends standard expectations and earns her the rank of{" "}
                    <span className="font-cinzel" style={{ color:"#d95637", fontWeight:700, letterSpacing:"0.08em", fontSize:"clamp(10px,1.05vw,13px)" }}>{tier}</span>
                  </p>
                </div>

                {/* ── SCORES + SIGNATURES ── */}
                <div style={{ width:"100%", maxWidth:780, zIndex:10 }}>

                  {/* Scores box */}
                  <div style={{ marginBottom:"24px" }}>
                    <h3 className="font-cinzel" style={{ textAlign:"center", fontSize:"clamp(10px,1vw,13px)", fontWeight:700, color:"#000", letterSpacing:"0.15em", marginBottom:"0px" }}>
                      Professional Competency Pillars
                    </h3>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0 8px", alignItems:"stretch" }}>
                      {pillars.map((pillar, index) => (
                        <ScoreBar 
                          key={index}
                          label={pillar.name} 
                          score={parseFloat(weightedScores[index]?.toFixed(1))} 
                          max={pillar.maxWeighted} 
                        />
                      ))}
                    </div>
                  </div>

                  {/* Signatures */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"end", padding:"0 40px" }}>
                    <div style={{ width:"200px", textAlign:"center" }}>
                      <div style={{ borderBottom:"2px solid #000", height:"40px", marginBottom:"8px", position:"relative" }}>
                      </div>
                      <span className="font-poppins" style={{ fontSize:"clamp(9px,0.9vw,12px)", color:"#000", fontWeight:500, display:"block", whiteSpace:"nowrap" }}>
                        Nestara Limited
                      </span>
                    </div>
                    <div style={{ width:"200px", textAlign:"center" }}>
                      <div style={{ borderBottom:"2px solid #000", height:"40px", marginBottom:"8px", position:"relative" }}>
                      </div>
                      <span className="font-poppins" style={{ fontSize:"clamp(9px,0.9vw,12px)", color:"#000", fontWeight:500, display:"block", whiteSpace:"nowrap" }}>
                        Lead Trainer, NICHE
                      </span>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default NicheCertificate