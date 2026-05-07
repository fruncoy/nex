import { useEffect, useRef, useState } from 'react'

// The report HTML is pasted below — extracted from REPORT_TEMPLATE.md
// To update: replace the content of REPORT_HTML with the new HTML from REPORT_TEMPLATE.md
const REPORT_HTML = `/REPORT_TEMPLATE.md`

export function KPIReport() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [html, setHtml] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Fetch the markdown file and extract the HTML block
    fetch('/REPORT_TEMPLATE.md')
      .then(r => r.text())
      .then(text => {
        // Extract content between the first ```  and last ``` code fence
        const match = text.match(/```[\s\S]*?\n([\s\S]*?)```/)
        if (match && match[1]) {
          setHtml(match[1])
        } else {
          setError(true)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (html && iframeRef.current) {
      const doc = iframeRef.current.contentDocument
      if (doc) {
        doc.open()
        doc.write(html)
        doc.close()
      }
    }
  }, [html])

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ae491e]"></div>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-screen text-gray-500 gap-3">
      <p className="text-lg font-medium">No report found</p>
      <p className="text-sm">Paste your HTML report into <code className="bg-gray-100 px-1 rounded">REPORT_TEMPLATE.md</code> inside the code block, then refresh.</p>
    </div>
  )

  return (
    <iframe
      ref={iframeRef}
      className="w-full border-0"
      style={{ height: 'calc(100vh - 73px)' }}
      title="KPI Report"
    />
  )
}
