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
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800&family=Montserrat:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap');

  .font-cinzel    { font-family: 'Cinzel', serif; }
  .font-playfair  { font-family: 'Playfair Display', serif; }
  .font-montserrat{ font-family: 'Montserrat', sans-serif; }

  .cert-bg {
    background-color: #FAF9F6;
    background-image:
      radial-gradient(rgba(197,160,89,0.07) 1px, transparent 1px),
      radial-gradient(rgba(197,160,89,0.03) 1px, transparent 1px);
    background-size: 20px 20px;
    background-position: 0 0, 10px 10px;
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
      padding: "8px 8px 10px",
      overflow: "hidden",
      height: "clamp(55px,7vw,75px)",
      boxSizing: "border-box",
    }}>

      {/* Underlay: score/total fills the column height */}
      <span className="font-playfair" style={{
        position: "absolute",
        bottom: 0,
        left: 4,
        right: 0,
        fontSize: "clamp(36px,4.2vw,56px)",
        fontWeight: 800,
        color: "rgba(107,29,44,0.11)",
        lineHeight: 1,
        pointerEvents: "none",
        userSelect: "none",
        letterSpacing: "-1px",
        zIndex: 0,
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}>
        {score}<span style={{ fontSize:"0.5em" }}>/{max}</span>
      </span>

      {/* Overlay: label only, sits on top */}
      <span className="font-montserrat" style={{
        position: "relative",
        zIndex: 1,
        fontSize: "clamp(7px,0.8vw,10.5px)",
        fontWeight: 600,
        color: "#2a1a10",
        whiteSpace: "nowrap",
        lineHeight: 1.2,
      }}>
        {label}
      </span>

    </div>
  );
};

const CornerOrnament = ({ style }: { style: React.CSSProperties }) => (
  <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
    <path d="M0 0H60V2H2V60H0V0Z" fill="#c5a059" />
    <path d="M6 6H54V8H8V54H6V6Z" fill="#6b1d2c" />
    <path d="M12 12H24V14H14V24H12V12Z" fill="#c5a059" />
    <circle cx="18" cy="18" r="3" fill="#6b1d2c" />
  </svg>
);

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
    { name: 'Housekeeping', weight: 0.6, maxWeighted: 15 },
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

      // Create HTML content for certificate with exact styling
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>NICHE Certificate - ${recipientName}</title>
          <style>
            ${styles}
            body {
              margin: 0;
              padding: 0;
              background: #1a1a1a;
              display: flex;
              justify-content: center;
              align-items: flex-start;
              padding: 40px 16px;
              box-sizing: border-box;
            }
            .certificate-wrapper {
              width: 100%;
              max-width: 1123px;
              margin: 0 auto;
              padding: 8px 16px;
            }
          </style>
        </head>
        <body>
          <div class="certificate-wrapper">
            <div class="cert-bg" style="position: relative; width: 100%; aspect-ratio: 1.414; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 1.2%; padding: 7% 7% 5%; box-sizing: border-box; border: 1px solid #ccc; box-shadow: 0 25px 60px rgba(0,0,0,0.5); overflow: hidden;">
              
              <!-- Outer gold border -->
              <div style="position: absolute; inset: 3.5%; border: 3px solid #c5a059; pointer-events: none;"></div>
              <!-- Inner burgundy border -->
              <div style="position: absolute; inset: 5%; border: 1px solid #6b1d2c; pointer-events: none;"></div>

              <!-- Corner ornaments -->
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style="position: absolute; top: 3.5%; left: 3.5%;">
                <path d="M0 0H60V2H2V60H0V0Z" fill="#c5a059" />
                <path d="M6 6H54V8H8V54H6V6Z" fill="#6b1d2c" />
                <path d="M12 12H24V14H14V24H12V12Z" fill="#c5a059" />
                <circle cx="18" cy="18" r="3" fill="#6b1d2c" />
              </svg>
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style="position: absolute; top: 3.5%; right: 3.5%; transform: rotate(90deg);">
                <path d="M0 0H60V2H2V60H0V0Z" fill="#c5a059" />
                <path d="M6 6H54V8H8V54H6V6Z" fill="#6b1d2c" />
                <path d="M12 12H24V14H14V24H12V12Z" fill="#c5a059" />
                <circle cx="18" cy="18" r="3" fill="#6b1d2c" />
              </svg>
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style="position: absolute; bottom: 3.5%; right: 3.5%; transform: rotate(180deg);">
                <path d="M0 0H60V2H2V60H0V0Z" fill="#c5a059" />
                <path d="M6 6H54V8H8V54H6V6Z" fill="#6b1d2c" />
                <path d="M12 12H24V14H14V24H12V12Z" fill="#c5a059" />
                <circle cx="18" cy="18" r="3" fill="#6b1d2c" />
              </svg>
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" style="position: absolute; bottom: 3.5%; left: 3.5%; transform: rotate(-90deg);">
                <path d="M0 0H60V2H2V60H0V0Z" fill="#c5a059" />
                <path d="M6 6H54V8H8V54H6V6Z" fill="#6b1d2c" />
                <path d="M12 12H24V14H14V24H12V12Z" fill="#c5a059" />
                <circle cx="18" cy="18" r="3" fill="#6b1d2c" />
              </svg>

              <!-- HEADER -->
              <div style="text-align: center; z-index: 10; width: 100%; margin-top: 0;">
                <h1 class="font-cinzel" style="font-size: clamp(22px,4.5vw,52px); color: #6b1d2c; font-weight: 700; letter-spacing: 0.1em; margin-bottom: 8px; line-height: 1.1;">
                  CERTIFICATE OF MERIT
                </h1>
                <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
                  <div style="height: 1px; width: clamp(40px,6vw,80px); background: #c5a059;"></div>
                  <p class="font-montserrat" style="font-size: clamp(6px,0.9vw,10px); letter-spacing: 0.22em; color: #444; text-transform: uppercase; white-space: nowrap;">
                    Nestara Institute of Care and Hospitality Excellence
                  </p>
                  <div style="height: 1px; width: clamp(40px,6vw,80px); background: #c5a059;"></div>
                </div>
              </div>

              <!-- RECIPIENT -->
              <div style="text-align: center; z-index: 10; width: 100%; max-width: 780px; margin: 0 auto;">
                <p class="font-playfair" style="font-style: italic; font-size: clamp(12px,1.6vw,18px); color: #555; margin-bottom: 1%;">
                  This honor is proudly bestowed upon
                </p>
                <h2 class="font-playfair" style="font-weight: 700; font-size: clamp(26px,4vw,52px); color: #0d1520; margin-bottom: 1%; letter-spacing: 0.02em; line-height: 1.05;">
                  ${recipientName}
                </h2>
                <p class="font-montserrat" style="font-size: clamp(9px,1.1vw,13px); color: #333; line-height: 1.75; max-width: 620px; margin: 0 auto 1%;">
                  In recognition of her exceptional dedication and outstanding achievement within the 
                  <span class="font-cinzel" style="color: #c5a059; font-weight: 700; letter-spacing: 0.08em; font-size: clamp(9px,1.05vw,13px); border-bottom: 1px solid #c5a059; padding-bottom: 1px;">${course}</span>
                  . ${recipientName.split(' ')[0]} has met the most stringent requirements of the curriculum, exhibiting a level
                  of competency that transcends standard expectations and earns her the rank of
                </p>
                <div style="display: inline-block; margin-top: 0.5%;">
                  <span class="font-cinzel" style="font-weight: 600; font-size: clamp(11px,1.4vw,15px); color: #3a2a1a; letter-spacing: 0.28em; display: inline-block;">
                    ${tier}
                  </span>
                </div>
              </div>

              <!-- SCORES + SIGNATURES -->
              <div style="width: 100%; max-width: 760px; z-index: 10; display: flex; flex-direction: column; gap: clamp(8px,1.5%,18px);">
                <!-- Scores box -->
                <div style="background: transparent; border: none; padding: 4px 12px 4px;">
                  <h3 class="font-cinzel" style="text-align: center; font-size: clamp(9px,1vw,12px); font-weight: 700; color: #6b1d2c; letter-spacing: 0.15em; margin-bottom: 4px;">
                    Professional Competency Assessment
                  </h3>
                  <div style="display: grid; grid-template-columns: repeat(4,1fr); gap: 0 4px; align-items: stretch;">
                    ${pillars.map((pillar, index) => `
                      <div style="position: relative; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-start; width: 100%; padding: 8px 8px 10px; overflow: hidden; height: clamp(55px,7vw,75px); box-sizing: border-box;">
                        <span class="font-playfair" style="position: absolute; bottom: 0; left: 4px; right: 0; font-size: clamp(36px,4.2vw,56px); font-weight: 800; color: rgba(107,29,44,0.11); line-height: 1; pointer-events: none; user-select: none; letter-spacing: -1px; z-index: 0; white-space: nowrap; overflow: hidden;">
                          ${weightedScores[index]?.toFixed(1)}<span style="font-size: 0.5em;">/${pillar.maxWeighted}</span>
                        </span>
                        <span class="font-montserrat" style="position: relative; z-index: 1; font-size: clamp(7px,0.8vw,10.5px); font-weight: 600; color: #2a1a10; white-space: nowrap; line-height: 1.2;">
                          ${pillar.name}
                        </span>
                      </div>
                    `).join('')}
                  </div>
                </div>

                <!-- Signatures -->
                <div style="display: flex; justify-content: space-between; align-items: flex-end; padding: 0 2%;">
                  <div style="display: flex; align-items: flex-end; gap: 8px; width: 45%;">
                    <span class="font-montserrat" style="font-size: clamp(8px,0.9vw,11px); color: #2e2515; white-space: nowrap; line-height: 1;">
                      Director, Nestara Limited
                    </span>
                    <div style="flex: 1; min-width: 30px; border-bottom: 1px solid #999; height: 0; position: relative; margin-bottom: 1px;">
                      <div style="position: absolute; bottom: -2px; right: 0; width: 8px; height: 3px; background: #c5a059;"></div>
                    </div>
                  </div>
                  <div style="display: flex; align-items: flex-end; gap: 8px; width: 45%;">
                    <span class="font-montserrat" style="font-size: clamp(8px,0.9vw,11px); color: #2e2515; white-space: nowrap; line-height: 1;">
                      Lead Trainer, NICHE
                    </span>
                    <div style="flex: 1; min-width: 30px; border-bottom: 1px solid #999; height: 0; position: relative; margin-bottom: 1px;">
                      <div style="position: absolute; bottom: -2px; right: 0; width: 8px; height: 3px; background: #c5a059;"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
            margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
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
                justifyContent:"flex-start", gap:"1.2%",
                padding:"7% 7% 5%",
                boxSizing:"border-box",
                border:"1px solid #ccc",
                boxShadow:"0 25px 60px rgba(0,0,0,0.5)",
                overflow:"hidden"
              }} id="certificate-content">

                {/* Outer gold border */}
                <div style={{ position:"absolute", inset:"3.5%", border:"3px solid #c5a059", pointerEvents:"none" }} />
                {/* Inner burgundy border */}
                <div style={{ position:"absolute", inset:"5%", border:"1px solid #6b1d2c", pointerEvents:"none" }} />

                {/* Corner ornaments */}
                <CornerOrnament style={{ position:"absolute", top:"3.5%", left:"3.5%" }} />
                <CornerOrnament style={{ position:"absolute", top:"3.5%", right:"3.5%", transform:"rotate(90deg)" }} />
                <CornerOrnament style={{ position:"absolute", bottom:"3.5%", right:"3.5%", transform:"rotate(180deg)" }} />
                <CornerOrnament style={{ position:"absolute", bottom:"3.5%", left:"3.5%", transform:"rotate(-90deg)" }} />

                {/* ── HEADER ── */}
                <div style={{ textAlign:"center", zIndex:10, width:"100%", marginTop:0 }}>
                  <h1 className="font-cinzel" style={{ fontSize:"clamp(22px,4.5vw,52px)", color:"#6b1d2c", fontWeight:700, letterSpacing:"0.1em", marginBottom:8, lineHeight:1.1 }}>
                    CERTIFICATE OF MERIT
                  </h1>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12 }}>
                    <div style={{ height:1, width:"clamp(40px,6vw,80px)", background:"#c5a059" }} />
                    <p className="font-montserrat" style={{ fontSize:"clamp(6px,0.9vw,10px)", letterSpacing:"0.22em", color:"#444", textTransform:"uppercase", whiteSpace:"nowrap" }}>
                      Nestara Institute of Care and Hospitality Excellence
                    </p>
                    <div style={{ height:1, width:"clamp(40px,6vw,80px)", background:"#c5a059" }} />
                  </div>
                </div>

                {/* ── RECIPIENT ── */}
                <div style={{ textAlign:"center", zIndex:10, width:"100%", maxWidth:780, margin:"0 auto" }}>
                  <p className="font-playfair" style={{ fontStyle:"italic", fontSize:"clamp(12px,1.6vw,18px)", color:"#555", marginBottom:"1%" }}>
                    This honor is proudly bestowed upon
                  </p>
                  <h2 className="font-playfair" style={{ fontWeight:700, fontSize:"clamp(26px,4vw,52px)", color:"#0d1520", marginBottom:"1%", letterSpacing:"0.02em", lineHeight:1.05 }}>
                    {recipientName}
                  </h2>
                  <p className="font-montserrat" style={{ fontSize:"clamp(9px,1.1vw,13px)", color:"#333", lineHeight:1.75, maxWidth:620, margin:"0 auto 1%" }}>
                    In recognition of her exceptional dedication and outstanding achievement within the{" "}
                    <span className="font-cinzel" style={{ color:"#c5a059", fontWeight:700, letterSpacing:"0.08em", fontSize:"clamp(9px,1.05vw,13px)", borderBottom:"1px solid #c5a059", paddingBottom:"1px" }}>{course}</span>
                    . {recipientName.split(' ')[0]} has met the most stringent requirements of the curriculum, exhibiting a level
                    of competency that transcends standard expectations and earns her the rank of
                  </p>
                  <div style={{ display:"inline-block", marginTop:"0.5%" }}>
                    <span className="font-cinzel" style={{ fontWeight:600, fontSize:"clamp(11px,1.4vw,15px)", color:"#3a2a1a", letterSpacing:"0.28em", display:"inline-block" }}>
                      {tier}
                    </span>
                  </div>
                </div>

                {/* ── SCORES + SIGNATURES grouped so they never overlap ── */}
                <div style={{ width:"100%", maxWidth:760, zIndex:10, display:"flex", flexDirection:"column", gap:"clamp(8px,1.5%,18px)" }}>

                  {/* Scores box */}
                  <div style={{ background:"transparent", border:"none", padding:"4px 12px 4px" }}>
                    <h3 className="font-cinzel" style={{ textAlign:"center", fontSize:"clamp(9px,1vw,12px)", fontWeight:700, color:"#6b1d2c", letterSpacing:"0.15em", marginBottom:4 }}>
                      Professional Competency Assessment
                    </h3>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0 4px", alignItems:"stretch" }}>
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

                  {/* Signatures — label and line bottom-aligned */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", padding:"0 2%" }}>

                    {[{ label:"Director, Nestara Limited" }, { label:"Lead Trainer, NICHE" }].map(({ label }) => (
                      <div key={label} style={{ display:"flex", alignItems:"flex-end", gap:8, width:"45%" }}>
                        <span className="font-montserrat" style={{ fontSize:"clamp(8px,0.9vw,11px)", color:"#2e2515", whiteSpace:"nowrap", lineHeight:1 }}>
                          {label}
                        </span>
                        <div style={{ flex:1, minWidth:30, borderBottom:"1px solid #999", height:0, position:"relative", marginBottom:1 }}>
                          <div style={{ position:"absolute", bottom:-2, right:0, width:8, height:3, background:"#c5a059" }} />
                        </div>
                      </div>
                    ))}

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