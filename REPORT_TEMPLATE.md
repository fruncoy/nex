# KPI Report Template

## How to Use
1. Paste your report data below under the correct section
2. The `/kpi-report` page will read and display it automatically

---

## PASTE REPORT HERE

```
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nestara — Monthly KPI Report</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --brand:      #ae491e;
    --brand-dark: #8a3414;
    --brand-lt:   #f9ece6;
    --brand-mid:  #e8c4b0;
    --green:      #6aaa7e;
    --green-bg:   #eef7f1;
    --amber:      #d4a843;
    --amber-bg:   #fdf6e3;
    --red:        #d97b7b;
    --red-bg:     #fdf0f0;
    --dark:       #1a1201;
    --mid:        #6b6053;
    --light:      #f5f0eb;
    --border:     #e0d5cc;
    --white:      #ffffff;
    --margin:     14mm;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Poppins', sans-serif;
    font-size: 9pt;
    color: var(--dark);
    background: #e8ddd5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── Page shell ── */
  .page {
    width: 210mm;
    min-height: 297mm;
    background: var(--white);
    margin: 8mm auto;
    padding: var(--margin);
    position: relative;
    box-shadow: 0 4px 40px rgba(0,0,0,.18);
    page-break-after: always;
    overflow: hidden;
  }
  .page:last-of-type { page-break-after: auto; }

  /* ── Page header ── */
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2.5px solid var(--brand);
    padding-bottom: 4px;
    margin-bottom: 12px;
  }
  .logo-word { font-size: 11pt; font-weight: 800; color: var(--brand); letter-spacing: .12em; }
  .hd-right { font-size: 7.5pt; color: var(--mid); font-family: 'DM Mono', monospace; }
  .hd-right span { color: var(--brand); font-weight: 600; }

  /* ── Page footer ── */
  .page-footer {
    position: absolute;
    bottom: var(--margin);
    left: var(--margin);
    right: var(--margin);
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--brand-mid);
    padding-top: 4px;
    font-size: 7pt;
    color: var(--mid);
    font-family: 'DM Mono', monospace;
  }

  /* ── Section label ── */
  .section-label {
    display: flex;
    align-items: baseline;
    border-bottom: 3px solid var(--brand);
    padding-bottom: 4px;
    margin: 14px 0 8px;
  }
  .section-label h2 { font-size: 12pt; font-weight: 700; color: var(--brand); }

  /* ── RAG buttons ── */
  .rag-status { display: flex; gap: 4px; justify-content: center; align-items: center; }
  .rag-btn {
    width: 12px; height: 12px; border-radius: 50%;
    border: none; cursor: pointer; opacity: .22;
    transition: opacity .15s, transform .15s; flex-shrink: 0;
  }
  .rag-btn:hover { opacity: .65; transform: scale(1.2); }
  .rag-btn.active { opacity: 1; transform: scale(1.15); }
  .rag-btn.g { background: var(--green); }
  .rag-btn.a { background: var(--amber); }
  .rag-btn.r { background: var(--red); }

  /* ── Editable ── */
  [contenteditable] { outline: none; min-height: 14px; border-radius: 2px; transition: background .12s; }
  [contenteditable]:focus { background: #fff8f5; box-shadow: inset 0 0 0 1.5px var(--brand); }
  [contenteditable]:empty::before { content: attr(data-ph); color: #ccc; font-style: italic; pointer-events: none; }

  /* ── KPI table ── */
  .kpi-table { width: 100%; border-collapse: collapse; font-size: 8pt; margin-bottom: 8px; }
  .kpi-table thead th {
    background: var(--brand); color: var(--white);
    font-weight: 600; font-size: 7.5pt;
    padding: 5px 7px; text-align: left; letter-spacing: .03em;
  }
  .kpi-table thead th:nth-child(3) { text-align: center; }
  .kpi-table tbody tr:nth-child(odd)  { background: var(--white); }
  .kpi-table tbody tr:nth-child(even) { background: var(--brand-lt); }
  .kpi-table tbody tr:hover { background: #f0e8e2; }
  .kpi-table td { padding: 5px 7px; border: 1px solid var(--border); vertical-align: middle; line-height: 1.35; }
  .kpi-table td:nth-child(1) { font-weight: 500; width: 38%; }
  .kpi-table td:nth-child(2) { color: var(--mid); font-family: 'DM Mono', monospace; font-size: 7.5pt; width: 24%; }
  .kpi-table td:nth-child(3) { width: 16%; text-align: center; }
  .kpi-table td:nth-child(4) { width: 22%; }

  /* ── Summary box ── */
  .summary-box {
    border: 1.5px solid var(--brand); border-radius: 4px;
    padding: 8px 10px; background: var(--brand-lt);
    margin-top: 6px; display: flex; gap: 10px; align-items: stretch;
  }
  .sb-rating-col {
    display: flex; flex-direction: column; align-items: center; gap: 5px;
    min-width: 56px; border-right: 1px solid var(--brand-mid); padding-right: 10px;
  }
  .sb-rating-col label { font-size: 6.5pt; font-weight: 600; color: var(--mid); text-align: center; text-transform: uppercase; letter-spacing: .04em; }
  .sb-rating-col .rag-btn { width: 14px; height: 14px; }
  .sb-right { flex: 1; display: flex; flex-direction: column; gap: 4px; }
  .sb-notes-label { font-size: 6.5pt; font-weight: 600; color: var(--mid); text-transform: uppercase; letter-spacing: .04em; }
  .sb-notes { border: 1px solid var(--brand-mid); border-radius: 3px; background: var(--white); min-height: 28px; padding: 4px 6px; font-size: 8pt; width: 100%; }

  /* ── Role head ── */
  .role-head { display: flex; align-items: center; gap: 8px; margin: 10px 0 5px; }
  .role-head h3 { font-size: 10pt; font-weight: 700; color: var(--brand); }
  .role-badge { font-size: 6.5pt; font-weight: 600; background: var(--brand); color: var(--white); padding: 2px 7px; border-radius: 20px; letter-spacing: .05em; text-transform: uppercase; }

  /* ── Highlights box ── */
  .highlights-box { border: 1.5px solid var(--brand); border-radius: 4px; padding: 8px 10px; min-height: 60px; font-size: 8pt; }
  .hb-label { font-size: 9pt; font-weight: 700; color: var(--brand); margin-bottom: 5px; }

  /* ── Cover ── */
  .cover-bar { height: 14mm; background: var(--brand); margin: calc(-1 * var(--margin)) calc(-1 * var(--margin)) 0; }
  .cover-inner { padding-top: 36mm; text-align: center; }
  .cover-title { font-size: 44pt; font-weight: 900; color: var(--brand); line-height: 1; letter-spacing: .08em; }
  .cover-sub { font-size: 13pt; font-weight: 300; color: var(--dark); margin-top: 5px; letter-spacing: .04em; }
  .cover-month-row {
    display: flex; align-items: center; justify-content: center;
    gap: 8px; margin-top: 12mm;
  }
  .cover-month-line {
    display: inline-block; width: 52mm;
    border-bottom: 2.5px solid var(--brand);
    font-size: 12pt; font-weight: 600;
    color: var(--brand); text-align: center; padding-bottom: 3px;
    outline: none; min-height: 22px;
  }
  .cover-month-line:empty::before { content: attr(data-ph); color: #ccc; font-weight: 300; font-style: italic; pointer-events: none; }
  .cover-month-line:focus { background: #fff8f5; }
  .cover-report-word { font-size: 12pt; font-weight: 600; color: var(--dark); }
  .cover-footer-text { position: absolute; bottom: 10mm; left: 0; right: 0; text-align: center; font-size: 7pt; color: var(--mid); font-style: italic; }

  /* ── Toolbar ── */
  .toolbar { position: fixed; top: 16px; right: 16px; z-index: 1000; }
  .toolbar button { background: var(--brand); color: var(--white); border: none; border-radius: 6px; padding: 8px 16px; font-family: 'Poppins', sans-serif; font-size: 8.5pt; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(174,73,30,.3); transition: background .15s; }
  .toolbar button:hover { background: var(--brand-dark); }

  /* ── Analytics page ── */
  .analytics-title { font-size: 13pt; font-weight: 800; color: var(--brand); letter-spacing: .04em; margin-bottom: 2px; }
  .analytics-sub { font-size: 7.5pt; color: var(--mid); margin-bottom: 10px; font-style: italic; }
  .analytics-section {
    font-size: 8pt; font-weight: 700; color: var(--white);
    background: var(--brand); padding: 4px 10px;
    border-radius: 3px 3px 0 0; letter-spacing: .04em;
    text-transform: uppercase; display: flex; align-items: center; gap: 6px;
    margin-top: 10px;
  }
  .analytics-section:first-of-type { margin-top: 0; }
  .card-row {
    display: flex; gap: 6px; flex-wrap: nowrap;
    border: 1.5px solid var(--brand-mid); border-top: none;
    border-radius: 0 0 4px 4px; padding: 8px;
    background: var(--white); margin-bottom: 0;
    align-items: center;
  }
  .funnel-arrow { color: var(--brand-mid); font-size: 14pt; flex-shrink: 0; line-height: 1; }

  /* stat card */
  .sc {
    flex: 1; min-width: 0;
    border: 1.5px solid var(--border); border-radius: 4px;
    padding: 6px 6px 5px; background: var(--brand-lt);
    display: flex; flex-direction: column;
    align-items: center; text-align: center; gap: 1px;
  }
  .sc.accent { background: #fdf3ef; border-color: var(--brand-mid); }
  .sc.lost   { background: var(--red-bg);   border-color: var(--red); }
  .sc.won    { background: var(--green-bg); border-color: var(--green); }
  .sc.spend  { background: #fff8e6;         border-color: var(--amber); }
  .sc-icon   { font-size: 12pt; line-height: 1; }
  .sc-label  { font-size: 6pt; font-weight: 600; color: var(--mid); text-transform: uppercase; letter-spacing: .04em; line-height: 1.2; margin-top: 1px; }
  .sc-val    { font-size: 14pt; font-weight: 800; color: var(--brand); line-height: 1; margin: 2px 0 1px; }
  .sc.lost  .sc-val  { color: var(--red); }
  .sc.won   .sc-val  { color: var(--green); }
  .sc.spend .sc-val  { color: var(--amber); }
  .sc-val [contenteditable] { min-width: 28px; display: inline-block; }
  .sc-note { font-size: 5.5pt; color: var(--mid); font-style: italic; min-height: 8px; width: 100%; }

  /* reason grid */
  .reason-row {
    display: flex; gap: 6px;
    border: 1.5px solid var(--border); border-top: none;
    border-radius: 0 0 4px 4px; padding: 6px 8px 8px;
    background: var(--white); margin-bottom: 0;
  }
  .rc {
    flex: 1; border: 1.5px solid var(--red); border-radius: 4px;
    padding: 5px 6px; background: var(--red-bg); text-align: center;
  }
  .rc-label { font-size: 6pt; font-weight: 600; color: var(--red); text-transform: uppercase; letter-spacing: .03em; line-height: 1.2; }
  .rc-val   { font-size: 13pt; font-weight: 800; color: var(--red); line-height: 1.1; }
  .rc-desc  { font-size: 5.5pt; color: var(--mid); margin-top: 1px; }

  /* marketing accounts */
  .mkt-row { display: flex; gap: 8px; margin-bottom: 0; border: 1.5px solid var(--brand-mid); border-top: none; border-radius: 0 0 4px 4px; padding: 8px; background: var(--white); }
  .mkt-total { display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 80px; border: 1.5px solid var(--amber); border-radius: 4px; padding: 8px 10px; background: #fff8e6; text-align: center; gap: 2px; }
  .mkt-total-label { font-size: 6pt; font-weight: 600; color: var(--mid); text-transform: uppercase; letter-spacing: .04em; }
  .mkt-total-val { font-size: 13pt; font-weight: 800; color: var(--amber); line-height: 1; }
  .mkt-account { flex: 1; border: 1.5px solid var(--brand-mid); border-radius: 4px; overflow: hidden; }
  .mkt-account-head { background: #f5e8e1; padding: 4px 9px; font-size: 7pt; font-weight: 700; color: var(--brand); text-transform: uppercase; letter-spacing: .05em; }
  .mkt-account-cards { display: flex; gap: 5px; padding: 6px; background: var(--white); }
  .mc { flex: 1; border: 1px solid var(--border); border-radius: 3px; padding: 4px 5px; background: var(--brand-lt); text-align: center; }
  .mc.won { background: var(--green-bg); border-color: var(--green); }
  .mc-label { font-size: 5.5pt; font-weight: 600; color: var(--mid); text-transform: uppercase; letter-spacing: .03em; }
  .mc-val   { font-size: 11pt; font-weight: 800; color: var(--brand); line-height: 1.1; }
  .mc.won .mc-val { color: var(--green); }

  /* channel row */
  .channel-row {
    display: flex; gap: 6px;
    border: 1.5px solid var(--brand-mid); border-top: none;
    border-radius: 0 0 4px 4px; padding: 8px;
    background: var(--white);
  }

  @page {
    size: A4;
    margin: 0;
  }
  @media print {
    html, body { background: none; width: 210mm; }
    .page {
      margin: 0 !important;
      box-shadow: none !important;
      page-break-after: always !important;
      break-after: page !important;
      width: 210mm !important;
      min-height: 297mm !important;
      padding: 14mm !important;
    }
    .page:last-of-type { page-break-after: auto !important; break-after: auto !important; }
    .no-print { display: none !important; }
    [contenteditable] { border: none !important; box-shadow: none !important; outline: none !important; }
    .cover-bar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

<div class="toolbar no-print">
  <button onclick="window.print()">🖨 Save as PDF</button>
</div>

<!-- ════════════════ PAGE 1 — COVER ════════════════ -->
<div class="page">
  <div class="cover-bar"></div>
  <div class="cover-inner">
    <div class="cover-title">NESTARA</div>
    <div class="cover-sub">Monthly KPI Performance Report</div>
    <div class="cover-month-row">
      <span class="cover-month-line" contenteditable data-ph="March 2026">March 2026</span>
      <span class="cover-report-word">Report</span>
    </div>
  </div>
  <div class="cover-footer-text">Internal Use Only</div>
</div>

<!-- ════════════════ PAGE 2 — EXECUTIVE SUMMARY ════════════════ -->
<div class="page">
  <div class="page-header">
    <div class="logo-word">NESTARA</div>
    <div class="hd-right">Monthly KPI Report &nbsp;|&nbsp; <span contenteditable data-ph="Month Year">March 2026</span></div>
  </div>

  <div class="section-label"><h2>1. Executive Summary</h2></div>

  <div class="highlights-box">
    <div class="hb-label">Monthly Highlights</div>
    <div contenteditable data-ph="Write a brief summary..."></div>
  </div>

  <div class="page-footer"><span>Internal Use Only</span><span>Page 2</span></div>
</div>

<!-- ════════════════ PAGE 3 — BUSINESS-LEVEL KPIs ════════════════ -->
<div class="page">
  <div class="page-header">
    <div class="logo-word">NESTARA</div>
    <div class="hd-right">Monthly KPI Report &nbsp;|&nbsp; <span contenteditable data-ph="Month Year">March 2026</span></div>
  </div>

  <div class="section-label"><h2>2. Business-Level KPIs</h2></div>
  <table class="kpi-table">
    <thead><tr><th>KPI</th><th>Target</th><th>Actual</th><th>Comments</th></tr></thead>
    <tbody id="biz-tbody"></tbody>
  </table>
  <div class="summary-box">
    <div class="sb-rating-col">
      <label>Overall<br>Rating</label>
      <div class="rag-status" style="flex-direction:column;gap:6px;margin-top:4px;">
        <button class="rag-btn g"></button><button class="rag-btn a"></button><button class="rag-btn r"></button>
      </div>
    </div>
    <div class="sb-right">
      <div class="sb-notes-label">Notes</div>
      <div class="sb-notes" contenteditable data-ph="Key observations, wins, blockers..."></div>
    </div>
  </div>
  <div class="page-footer"><span>Internal Use Only</span><span>Page 3</span></div>
</div>

<!-- ════════════════ PAGE 4 — TEAM-LEVEL KPIs ════════════════ -->
<div class="page">
  <div class="page-header">
    <div class="logo-word">NESTARA</div>
    <div class="hd-right">Monthly KPI Report &nbsp;|&nbsp; <span contenteditable data-ph="Month Year">March 2026</span></div>
  </div>

  <div class="section-label"><h2>3. Team-Level KPIs</h2></div>
  <table class="kpi-table">
    <thead><tr><th>KPI</th><th>Target</th><th>Actual</th><th>Comments</th></tr></thead>
    <tbody id="team-tbody"></tbody>
  </table>
  <div class="summary-box">
    <div class="sb-rating-col">
      <label>Overall<br>Rating</label>
      <div class="rag-status" style="flex-direction:column;gap:6px;margin-top:4px;">
        <button class="rag-btn g"></button><button class="rag-btn a"></button><button class="rag-btn r"></button>
      </div>
    </div>
    <div class="sb-right">
      <div class="sb-notes-label">Notes</div>
      <div class="sb-notes" contenteditable data-ph="Key observations, wins, blockers..."></div>
    </div>
  </div>

  <div class="page-footer"><span>Internal Use Only</span><span>Page 4</span></div>
</div>

<!-- ════════════════ PAGE 5 — ROLE KPIs: Marketing + Client Services ════════════════ -->
<div class="page">
  <div class="page-header">
    <div class="logo-word">NESTARA</div>
    <div class="hd-right">Monthly KPI Report &nbsp;|&nbsp; <span contenteditable data-ph="Month Year">March 2026</span></div>
  </div>

  <div class="section-label"><h2>4. Role-Level KPIs</h2></div>

  <div class="role-head"><h3>4.1 Marketing Lead</h3><span class="role-badge">Marketing</span></div>
  <table class="kpi-table">
    <thead><tr><th>KPI</th><th>Target</th><th>Actual</th><th>Comments</th></tr></thead>
    <tbody id="mkt-tbody"></tbody>
  </table>
  <div class="summary-box">
    <div class="sb-rating-col">
      <label>Overall<br>Rating</label>
      <div class="rag-status" style="flex-direction:column;gap:6px;margin-top:4px;">
        <button class="rag-btn g"></button><button class="rag-btn a"></button><button class="rag-btn r"></button>
      </div>
    </div>
    <div class="sb-right">
      <div class="sb-notes-label">Notes</div>
      <div class="sb-notes" contenteditable data-ph="Key observations..."></div>
    </div>
  </div>

  <div class="page-footer"><span>Internal Use Only</span><span>Page 5</span></div>
</div>

<!-- ════════════════ PAGE 5b — ROLE KPIs: Client Services Lead ════════════════ -->
<div class="page">
  <div class="page-header">
    <div class="logo-word">NESTARA</div>
    <div class="hd-right">Monthly KPI Report &nbsp;|&nbsp; <span contenteditable data-ph="Month Year">March 2026</span></div>
  </div>

  <div class="role-head" style="margin-top:2px;"><h3>4.2 Client Services Lead</h3><span class="role-badge">Client Services</span></div>
  <table class="kpi-table">
    <thead><tr><th>KPI</th><th>Target</th><th>Actual</th><th>Comments</th></tr></thead>
    <tbody id="cs-tbody"></tbody>
  </table>
  <div class="summary-box">
    <div class="sb-rating-col">
      <label>Overall<br>Rating</label>
      <div class="rag-status" style="flex-direction:column;gap:6px;margin-top:4px;">
        <button class="rag-btn g"></button><button class="rag-btn a"></button><button class="rag-btn r"></button>
      </div>
    </div>
    <div class="sb-right">
      <div class="sb-notes-label">Notes</div>
      <div class="sb-notes" contenteditable data-ph="Key observations..."></div>
    </div>
  </div>

  <div class="page-footer"><span>Internal Use Only</span><span>Page 6</span></div>
</div>

<!-- ════════════════ PAGE 7 — ROLE KPIs: Recruitment + Lead Trainer ════════════════ -->
<div class="page">
  <div class="page-header">
    <div class="logo-word">NESTARA</div>
    <div class="hd-right">Monthly KPI Report &nbsp;|&nbsp; <span contenteditable data-ph="Month Year">March 2026</span></div>
  </div>

  <div class="role-head" style="margin-top:2px;"><h3>4.3 Recruitment Lead</h3><span class="role-badge">Recruitment</span></div>
  <table class="kpi-table">
    <thead><tr><th>KPI</th><th>Target</th><th>Actual</th><th>Comments</th></tr></thead>
    <tbody id="rec-tbody"></tbody>
  </table>
  <div class="summary-box">
    <div class="sb-rating-col">
      <label>Overall<br>Rating</label>
      <div class="rag-status" style="flex-direction:column;gap:6px;margin-top:4px;">
        <button class="rag-btn g"></button><button class="rag-btn a"></button><button class="rag-btn r"></button>
      </div>
    </div>
    <div class="sb-right">
      <div class="sb-notes-label">Notes</div>
      <div class="sb-notes" contenteditable data-ph="Key observations..."></div>
    </div>
  </div>

  <div class="page-footer"><span>Internal Use Only</span><span>Page 7</span></div>
</div>

<!-- ════════════════ PAGE 8 — ROLE KPIs: Lead Trainer ════════════════ -->
<div class="page">
  <div class="page-header">
    <div class="logo-word">NESTARA</div>
    <div class="hd-right">Monthly KPI Report &nbsp;|&nbsp; <span contenteditable data-ph="Month Year">March 2026</span></div>
  </div>

  <div class="role-head" style="margin-top:2px;"><h3>4.4 Lead Trainer</h3><span class="role-badge">Training</span></div>
  <table class="kpi-table">
    <thead><tr><th>KPI</th><th>Target</th><th>Actual</th><th>Comments</th></tr></thead>
    <tbody id="trainer-tbody"></tbody>
  </table>
  <div class="summary-box">
    <div class="sb-rating-col">
      <label>Overall<br>Rating</label>
      <div class="rag-status" style="flex-direction:column;gap:6px;margin-top:4px;">
        <button class="rag-btn g"></button><button class="rag-btn a"></button><button class="rag-btn r"></button>
      </div>
    </div>
    <div class="sb-right">
      <div class="sb-notes-label">Notes</div>
      <div class="sb-notes" contenteditable data-ph="Key observations..."></div>
    </div>
  </div>

  <div class="page-footer"><span>Internal Use Only</span><span>Page 8</span></div>
</div>

<!-- ════════════════ PAGE 9 — ROLE KPIs: Office Assistant ════════════════ -->
<div class="page">
  <div class="page-header">
    <div class="logo-word">NESTARA</div>
    <div class="hd-right">Monthly KPI Report &nbsp;|&nbsp; <span contenteditable data-ph="Month Year">March 2026</span></div>
  </div>

  <div class="role-head" style="margin-top:2px;"><h3>4.5 Office Assistant</h3><span class="role-badge">Operations</span></div>
  <table class="kpi-table">
    <thead><tr><th>KPI</th><th>Target</th><th>Actual</th><th>Comments</th></tr></thead>
    <tbody id="office-tbody"></tbody>
  </table>
  <div class="summary-box">
    <div class="sb-rating-col">
      <label>Overall<br>Rating</label>
      <div class="rag-status" style="flex-direction:column;gap:6px;margin-top:4px;">
        <button class="rag-btn g"></button><button class="rag-btn a"></button><button class="rag-btn r"></button>
      </div>
    </div>
    <div class="sb-right">
      <div class="sb-notes-label">Notes</div>
      <div class="sb-notes" contenteditable data-ph="Key observations..."></div>
    </div>
  </div>

  <div class="page-footer"><span>Internal Use Only</span><span>Page 9</span></div>
</div>

<!-- ════════════════ PAGE 9 — PIPELINE & MARKETING ANALYTICS ════════════════ -->
<div class="page" style="padding-bottom:20mm;">
  <div class="page-header">
    <div class="logo-word">NESTARA</div>
    <div class="hd-right">Monthly KPI Report &nbsp;|&nbsp; <span contenteditable data-ph="Month Year">March 2026</span></div>
  </div>

  <div class="analytics-title">Business Core</div>

  <!-- STAFF PLACEMENT BREAKDOWN -->
  <div class="analytics-section">Staff Placement Breakdown — March 2026</div>
  <div class="card-row" style="flex-wrap:wrap;">
    <div class="sc" style="flex:1;min-width:70px;"><div class="sc-label">Full-Time<br>House Managers</div><div class="sc-val" style="font-size:16pt;">10</div></div>
    <div class="sc" style="flex:1;min-width:70px;"><div class="sc-label">Full-Time<br>Housekeepers</div><div class="sc-val" style="font-size:16pt;">6</div></div>
    <div class="sc" style="flex:1;min-width:70px;"><div class="sc-label">Full-Time<br>Executive Nannies</div><div class="sc-val" style="font-size:16pt;">3</div></div>
    <div class="sc" style="flex:1;min-width:70px;"><div class="sc-label">Part-Time<br>House Manager</div><div class="sc-val" style="font-size:16pt;">1</div></div>
    <div class="sc" style="flex:1;min-width:70px;"><div class="sc-label">Full-Time<br>Medical Caregiver</div><div class="sc-val" style="font-size:16pt;">1</div></div>
    <div class="sc won" style="flex:1;min-width:70px;"><div class="sc-label">Total<br>Placements</div><div class="sc-val" style="font-size:16pt;">21</div></div>
  </div>

  <!-- CANDIDATE PIPELINE -->
  <div class="analytics-section" style="margin-top:8px;">Candidate Pipeline</div>
  <div class="card-row">
    <div class="sc">
      <div class="sc-label">Total<br>Inquiries</div>
      <div class="sc-val"><span contenteditable data-ph="0">65</span></div>
      <div class="sc-note" contenteditable data-ph="note...">FB 70% · IG 10 · Other 20%</div>
    </div>
    <div class="funnel-arrow">›</div>
    <div class="sc">
      <div class="sc-label">Joined<br>Training</div>
      <div class="sc-val"><span contenteditable data-ph="0">21</span></div>
      <div class="sc-note" contenteditable data-ph="note...">From 65 total inquiries</div>
    </div>
    <div class="funnel-arrow">›</div>
    <div class="sc won">
      <div class="sc-label">Graduated</div>
      <div class="sc-val"><span contenteditable data-ph="0">16</span></div>
      <div class="sc-note" contenteditable data-ph="note...">76.2% completion rate</div>
    </div>
    <div class="funnel-arrow">›</div>
    <div class="sc lost">
      <div class="sc-label">Expelled /<br>Dropped</div>
      <div class="sc-val"><span contenteditable data-ph="0">0</span></div>
      <div class="sc-note" contenteditable data-ph="note..."></div>
    </div>
    <div class="funnel-arrow">›</div>
    <div class="sc won">
      <div class="sc-label">Placed in<br>Roles</div>
      <div class="sc-val"><span contenteditable data-ph="0">15</span></div>
      <div class="sc-note" contenteditable data-ph="note...">15 of 16 graduated placed</div>
    </div>
    <div class="funnel-arrow">›</div>
    <div class="sc lost">
      <div class="sc-label">Lost /<br>Inactive</div>
      <div class="sc-val"><span contenteditable data-ph="0">0</span></div>
      <div class="sc-note" contenteditable data-ph="note..."></div>
    </div>
  </div>

  <!-- CLIENT PIPELINE -->
  <div class="analytics-section" style="margin-top:8px;">Client Pipeline</div>
  <div class="card-row">
    <div class="sc accent">
      <div class="sc-label">Total<br>Leads</div>
      <div class="sc-val"><span contenteditable data-ph="0">33</span></div>
      <div class="sc-note" contenteditable data-ph="note...">Filled form</div>
    </div>
    <div class="funnel-arrow">›</div>
    <div class="sc won">
      <div class="sc-label">Converted<br>Clients</div>
      <div class="sc-val"><span contenteditable data-ph="0">20</span></div>
      <div class="sc-note" contenteditable data-ph="note...">March 2026</div>
    </div>
    <div class="funnel-arrow">›</div>
    <div class="sc lost">
      <div class="sc-label">Lost<br>Leads</div>
      <div class="sc-val"><span contenteditable data-ph="0">13</span></div>
      <div class="sc-note" contenteditable data-ph="reason..."></div>
    </div>
  </div>

  <!-- REASON FOR LOST CANDIDATES -->
  <div class="analytics-section" style="margin-top:8px;">Reason for Lost Candidates</div>
  <div class="reason-row">
    <div class="rc">
      <div class="rc-label">Lack of<br>Experience</div>
      <div class="rc-val"><span contenteditable data-ph="0">16</span></div>
      <div class="rc-desc">High frequency reason</div>
    </div>
    <div class="rc">
      <div class="rc-label">Could Not Afford<br>Training</div>
      <div class="rc-val"><span contenteditable data-ph="0">9</span></div>
      <div class="rc-desc">Financial barrier</div>
    </div>
    <div class="rc">
      <div class="rc-label">No Certificate of<br>Good Conduct</div>
      <div class="rc-val"><span contenteditable data-ph="0">9</span></div>
      <div class="rc-desc">Documentation gap</div>
    </div>
    <div class="rc">
      <div class="rc-label">Missed<br>Interview</div>
      <div class="rc-val"><span contenteditable data-ph="0">5</span></div>
      <div class="rc-desc">Did not show up</div>
    </div>
    <div class="rc">
      <div class="rc-label">Age<br>Limitations</div>
      <div class="rc-val"><span contenteditable data-ph="0">3</span></div>
      <div class="rc-desc">Outside age criteria</div>
    </div>
    <div class="rc">
      <div class="rc-label">Personality<br>Concerns</div>
      <div class="rc-val"><span contenteditable data-ph="0">2</span></div>
      <div class="rc-desc">Attitude / fit issues</div>
    </div>
  </div>

  <!-- REASON FOR LOST CLIENTS -->
  <div class="analytics-section" style="margin-top:8px;">Reason for Lost Clients</div>
  <div class="reason-row">
    <div class="rc">
      <div class="rc-label">Did Not Wish<br>to Continue</div>
      <div class="rc-val"><span contenteditable data-ph="0">4</span></div>
      <div class="rc-desc">After initial contact</div>
    </div>
    <div class="rc">
      <div class="rc-label">Ethics<br>Misalignment</div>
      <div class="rc-val"><span contenteditable data-ph="0">3</span></div>
      <div class="rc-desc">Not aligned with company code</div>
    </div>
    <div class="rc">
      <div class="rc-label">Financial<br>Constraints</div>
      <div class="rc-val"><span contenteditable data-ph="0">3</span></div>
      <div class="rc-desc">Could not afford service</div>
    </div>
    <div class="rc">
      <div class="rc-label">Unreachable<br>After Form</div>
      <div class="rc-val"><span contenteditable data-ph="0">3</span></div>
      <div class="rc-desc">No response post-enquiry</div>
    </div>
  </div>

  <!-- MARKETING SPEND -->
  <div class="analytics-section" style="margin-top:8px;">Marketing Spend &amp; Attribution</div>
  <div class="mkt-row">
    <!-- Total spend -->
    <div class="mkt-total">
      <div class="mkt-total-label">Total<br>Marketing Spend</div>
      <div class="mkt-total-val"><span contenteditable data-ph="KES —">KES 59,385</span></div>
      <div class="sc-note" contenteditable data-ph="this month">March 2026</div>
    </div>
    <!-- NICHE account — candidate recruitment only -->
    <div class="mkt-account">
      <div class="mkt-account-head">NICHE Account <span style="font-weight:400;opacity:.7;font-size:6pt;text-transform:none;">— Candidate Recruitment</span></div>
      <div class="mkt-account-cards">
        <div class="mc"><div class="mc-label">Spend</div><div class="mc-val"><span contenteditable data-ph="—">KES 13,500</span></div></div>
        <div class="mc won"><div class="mc-label">Won Candidates</div><div class="mc-val"><span contenteditable data-ph="—">16</span></div></div>
      </div>
    </div>
    <!-- Nestara account — client side + awareness -->
    <div class="mkt-account">
      <div class="mkt-account-head">Nestara Account <span style="font-weight:400;opacity:.7;font-size:6pt;text-transform:none;">— Client Side &amp; Awareness</span></div>
      <div class="mkt-account-cards">
        <div class="mc"><div class="mc-label">Spend</div><div class="mc-val"><span contenteditable data-ph="—">KES 14,000</span></div></div>
        <div class="mc"><div class="mc-label">Google Spend</div><div class="mc-val"><span contenteditable data-ph="—">KES 10,500</span></div></div>
        <div class="mc won"><div class="mc-label">Won Clients</div><div class="mc-val"><span contenteditable data-ph="—">20</span></div></div>
      </div>
    </div>
    <!-- Creative -->
    <div class="mkt-account" style="flex:0 0 auto;min-width:100px;">
      <div class="mkt-account-head">Videography &amp; Graphics</div>
      <div class="mkt-account-cards" style="flex-direction:column;gap:4px;">
        <div class="mc"><div class="mc-label">Spend</div><div class="mc-val"><span contenteditable data-ph="—">KES 21,385</span></div></div>
        <div class="mc"><div class="mc-label">Purpose</div><div class="mc-val" style="font-size:7pt;font-weight:600;color:var(--brand);">Brand Content</div></div>
      </div>
    </div>
  </div>

  <!-- CHANNEL ATTRIBUTION -->
  <div class="analytics-section" style="margin-top:8px;">Won per Channel</div>
  <div class="channel-row">
    <div class="sc won" style="flex:1;">
      <div class="sc-label">Won Clients<br>from Instagram</div>
      <div class="sc-val"><span contenteditable data-ph="0">9</span></div>
      <div class="sc-note" contenteditable data-ph="...">Nestara IG Ads / Organic</div>
    </div>
    <div class="sc won" style="flex:1;">
      <div class="sc-label">Won Clients<br>from TikTok</div>
      <div class="sc-val"><span contenteditable data-ph="0">6</span></div>
      <div class="sc-note" contenteditable data-ph="...">TikTok Ads / Organic</div>
    </div>
    <div class="sc won" style="flex:1;">
      <div class="sc-label">Won Clients<br>from Google</div>
      <div class="sc-val"><span contenteditable data-ph="0">2</span></div>
      <div class="sc-note" contenteditable data-ph="...">Google Search Ads</div>
    </div>
    <div class="sc accent" style="flex:1;">
      <div class="sc-label">Won Clients<br>Referral</div>
      <div class="sc-val"><span contenteditable data-ph="0">1</span></div>
      <div class="sc-note" contenteditable data-ph="...">Word of mouth</div>
    </div>
    <div class="sc accent" style="flex:1;">
      <div class="sc-label">Won Clients<br>Other</div>
      <div class="sc-val"><span contenteditable data-ph="0">2</span></div>
      <div class="sc-note" contenteditable data-ph="...">Other channels</div>
    </div>
  </div>

  <div class="page-footer"><span>Internal Use Only</span><span>Page 10</span></div>
</div>

<script>
const bizKPIs = [
  ["Monthly Revenue (Total)",          "KES 1,200,000 / month"],
  ["Gross Margin",                      "≥ 55% (quarterly review)"],
  ["Training Revenue (Monthly)",        "KES 600,000 / month"],
  ["Training Revenue Mix",              "Weekend 60% | Employer 20% | NGO 20%"],
  ["Client Retention Rate",             "≥ 40% within 6 months"],
  ["Placement Success Rate (30-day)",   "≥ 90% still active at Day 30"],
  ["Placement Retention (3-month)",     "≥ 85% after 3 months"],
  ["Replacement Rate (guarantee)",      "≤ 25% in 6 mths / ≤ 15% in 12 mths"],
  ["Client Satisfaction Score (CSAT)",  "≥ 9.0 / 10"],
  ["Publishable Reviews Collected",     "≥ 6 per month"],
  ["System Utilisation (Zoho)",         "≥ 90% interactions logged"],
];
const teamKPIs = [
  ["Client Brief → Shortlist Handoff Completeness", "≥ 95% of paying clients complete"],
  ["Recruitment ↔ Training Pipeline Sync",          "100% weekly sync; ≥ 80% actions closed"],
  ["Supply Coverage Ratio",                          "≥ 1.5 candidates per paying client"],
  ["Salary Fit Rate",                                "≥ 65% in 3 mths / ≥ 75% in 12 mths"],
  ["Marketing Data Freshness",                       "Submitted Mon 10am — 100% of weeks"],
];
const mktKPIs = [
  ["Profile Access Fee Conversions",       "≥ 35 per month"],
  ["Cost per Paying Lead",                 "≤ KES 2,000"],
  ["Placement Fee Paying Leads Generated", "≥ 30 per month (revise quarterly)"],
  ["Campaign Consistency",                 "≥ 90% on-time launches"],
  ["Insight Loop Execution",               "≥ 4 optimisations / month documented"],
  ["Cost per Won Client — Google",         "Track monthly"],
  ["Cost per Won Client — IG / Meta",      "Track monthly"],
  ["Cost per Won Client — Overall",        "Track monthly"],
];
const csKPIs = [
  ["Client Onboarding Completion",      "100% within 24 hrs of payment"],
  ["Response Time SLA",                 "≤ 30 mins during business hours"],
  ["Interview-to-Offer Cycle Time",     "≤ 7 days average (role-dependent)"],
  ["Client Escalation Rate",            "≤ 8% of active clients"],
  ["Client Satisfaction Score (CSAT)",  "≥ 9.0 / 10"],
  ["Publishable Reviews Collected",     "≥ 2 per month"],
];
const recKPIs = [
  ["Time to Shortlist (Paying Clients)",            "≤ 72 hours for first shortlist"],
  ["Candidate Pool Growth (Non-nanny roles)",       "≥ 10 vetted chefs + ≥ 10 vetted drivers / month"],
  ["Vetting Quality Compliance",                    "100% of candidates fully vetted"],
  ["Placement Success Rate (30-day) — Rec. Owned", "≥ 90% day-30 success"],
  ["Salary Alignment Accuracy",                     "≥ 85% candidates aligned pre-intro"],
];
const trainerKPIs = [
  ["Training Completion Rate",              "≥ 95% completion"],
  ["Candidate Transformation Score",        "≥ 20% improvement average"],
  ["Placement Readiness Approval Accuracy", "≥ 85% of approved trainees succeed at Day 30"],
  ["Post-Training Placement Success",       "≥ 80% placed within 60 days"],
  ["Employer Satisfaction (Trained Staff)", "≥ 90% satisfaction"],
  ["Training Revenue (External/Sponsored)", "KES target set monthly; MoM growth ≥ 10%"],
  ["Program Development & Quality",         "≥ 1 upgrade / month + quarterly review"],
];
const officeKPIs = [
  ["CRM Hygiene Score",                              "≥ 95% records complete"],
  ["Follow-up SLA Compliance",                       "≥ 98% on-time"],
  ["Payment Tracking Accuracy (Profile + Training)", "100% matched weekly"],
  ["Scheduling Efficiency",                          "Consults / interviews scheduled within 24 hrs"],
  ["Institute Operational Readiness",                "≥ 95% days fully ready"],
  ["Weekly Ops Metrics Pack Delivered",              "100% delivered by Mon 10am"],
];

function renderKPIs(tbodyId, kpis) {
  const tbody = document.getElementById(tbodyId);
  kpis.forEach(([name, target]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${name}</td>
      <td>${target}</td>
      <td><div contenteditable data-ph="—"></div></td>
      <td><div contenteditable data-ph="Add comment..."></div></td>
    `;
    tbody.appendChild(tr);
  });
}

renderKPIs('biz-tbody',     bizKPIs);
renderKPIs('team-tbody',    teamKPIs);
renderKPIs('mkt-tbody',     mktKPIs);
renderKPIs('cs-tbody',      csKPIs);
renderKPIs('rec-tbody',     recKPIs);
renderKPIs('trainer-tbody', trainerKPIs);
renderKPIs('office-tbody',  officeKPIs);

// Pre-fill known actuals + comments
window.addEventListener('DOMContentLoaded', function() {

  function fill(tbodyId, rowIdx, actual, comment) {
    const rows = document.querySelectorAll('#' + tbodyId + ' tr');
    if (!rows[rowIdx]) return;
    const cells = rows[rowIdx].querySelectorAll('td');
    if (actual  && cells[2]) { const el = cells[2].querySelector('[contenteditable]'); if (el) el.textContent = actual; }
    if (comment && cells[3]) { const el = cells[3].querySelector('[contenteditable]'); if (el) el.textContent = comment; }
  }

  function setNote(tbodyId, text) {
    const el = document.querySelector('#' + tbodyId);
    if (!el) return;
    const n = el.closest('.page').querySelector('.sb-notes');
    if (n) n.textContent = text;
  }

  // ── Business-Level KPIs ──────────────────────────────────────────
  fill('biz-tbody', 0,  'KES 347,839 + KES 84,250 = KES 432,089', 'March 2026 total revenue including placement fees and training income. Below KES 1,200,000 monthly target.');
  fill('biz-tbody', 1, '-', '');
  fill('biz-tbody', 2, 'KES 84,250', 'March 2026 training revenue. Below KES 600,000 monthly target — cohort volume still building.');
  fill('biz-tbody', 3, 'Weekend 16% | Employer 84% | NGO 0%', 'Employer-sponsored training dominated in March. No NGO partnerships this month.');
  fill('biz-tbody', 4, '29.82%', '17 of 57 clients returned for additional services — 5 for additional staff, 9 for uniform services, and 2 for training.');
  fill('biz-tbody', 5, '93.75%', '15 of 16 graduated candidates placed within 30 days. Above 90% target.');
  fill('biz-tbody', 6, '78.94%', '45 of 57 placements retained beyond 30 days. Early drop-offs highlight the need for stronger candidate-client fit to minimise failed placements.');
  fill('biz-tbody', 7, '21.05%', '12 of 57 placements required replacement within the 3-month guarantee period. Within the ≤25% acceptable range.');
  fill('biz-tbody', 8,  '0',            'Survey link sent — clients did not fill out. Follow-up ongoing.');
  fill('biz-tbody', 9,  '0',            'No publishable reviews collected. Survey link process being reinforced.');
  fill('biz-tbody', 10, '95%',          'Strong system discipline maintained. Consistent logging across Zoho platforms.');

  // ── Team-Level KPIs ──────────────────────────────────────────────
  fill('team-tbody', 0, '-', '');
  fill('team-tbody', 1, '-', '');
  fill('team-tbody', 2, '1.05', '21 trained candidates divided by 20 paying clients. Below 1.5 target — cohort size to grow.');
  fill('team-tbody', 3, '100%', 'All placed candidates were salary-aligned with client budgets in March.');
  fill('team-tbody', 4, '100%', 'Data submitted every Monday by 10am. Timely and actionable — suggestions provided for ad optimisation.');

  // ── Marketing Lead KPIs ──────────────────────────────────────────
  fill('mkt-tbody', 0, '20', 'All 20 converted clients paid PAF. Below target of 35 — deal volume still scaling.');
  fill('mkt-tbody', 1, 'KES 1,225', 'Total client-side spend KES 24,500 (Nestara KES 14,000 + Google KES 10,500) divided by 20 paying leads.');
  fill('mkt-tbody', 2, '20', '20 closed deals in March. Below target of 30 — pipeline growing month on month.');
  fill('mkt-tbody', 3, 'Consistent', 'Strong campaign consistency. Time targeting applied and AI audiences explored and implemented.');
  fill('mkt-tbody', 4, 'On time', 'Updates delivered on time. Ads managed proactively with best effort optimisation across active campaigns.');
  fill('mkt-tbody', 5, 'KES 5,250', 'KES 10,500 Google spend divided by 2 won clients.');
  fill('mkt-tbody', 6, 'KES 1,556', 'KES 14,000 Nestara Meta (IG) spend divided by 9 won clients from IG.');
  fill('mkt-tbody', 7, 'KES 1,225', 'Total client-side spend KES 24,500 divided by 20 won clients.');

  // ── Client Services Lead KPIs ────────────────────────────────────
  fill('cs-tbody', 0, '100%',      'All clients received a consultation call and were taken through the placement process.');
  fill('cs-tbody', 1, '≤ 30 mins', 'Inquiries responded to in under 30 minutes on both Desk and WhatsApp.');
  fill('cs-tbody', 2, '3 days',    'Interview-to-offer cycle averaged 3 days — well within the target of 10 days.');
  fill('cs-tbody', 3, '1 case',    'One escalation due to miscommunication and misaligned expectations.');
  fill('cs-tbody', 4, '0',         'Review link sent but clients did not fill it out. Follow-up ongoing.');
  fill('cs-tbody', 5, '0',         'No reviews collected this month. Working on the survey link process.');

  // ── Recruitment Lead KPIs ────────────────────────────────────────
  fill('rec-tbody', 0, '-', '');
  fill('rec-tbody', 1, '4 chefs / 0 drivers', '4 chefs added to pool from March training intake. No drivers recruited this month.');
  fill('rec-tbody', 2, '100%', 'All graduated candidates were fully vetted before training. Vetting compliance maintained.');
  fill('rec-tbody', 3, '100%',               '15 of 15 placements still active at Day 30. Excellent result.');
  fill('rec-tbody', 4, '100%', 'All placed candidates were fully salary-aligned with client budgets in March.');

  // ── Lead Trainer KPIs ────────────────────────────────────────────
  fill('trainer-tbody', 0, '90.6%',   '29 of 32 trainees completed. 3 drop-offs. Slightly below 95% target — engagement tracking to improve retention.');
  fill('trainer-tbody', 1, '25%',     'Strong improvement in behaviour and professionalism. High placement conversion of 83% validates transformation impact.');
  fill('trainer-tbody', 2, '82.8%',   '24 of 29 approved trainees succeeded at Day 30. Near target — small gaps requiring final-stage refinement.');
  fill('trainer-tbody', 3, '93.75%', '15 of 16 graduated candidates placed. Exceeds 80% target — strong conversion from training to employment.');
  fill('trainer-tbody', 4, '85–88%',  'Client satisfaction impacted by delays in placement and gaps in readiness consistency.');
  fill('trainer-tbody', 5, '-', '');
  fill('trainer-tbody', 6, 'Completed', 'Additional practical equipment added to training sessions. Training grading system improved for better candidate assessment.');

  // ── Office Assistant KPIs ────────────────────────────────────────
  fill('office-tbody', 0, '96%',   'Strong data discipline maintained, supporting operational efficiency and reporting accuracy.');
  fill('office-tbody', 1, '99%',   'Exceeded target. Timely follow-ups well managed, contributing to improved client conversion and trust.');
  fill('office-tbody', 2, '100%',  'Payment records fully reconciled with no discrepancies.');
  fill('office-tbody', 3, '99%',   'Minor delays in submissions and presentations. To improve time consistency.');
  fill('office-tbody', 4, '95.2%', 'Daily operational preparedness consistent with minimal gaps.');
  fill('office-tbody', 5, '99%',   'Occasional delays in report submission. Requires improved timeliness to support decision-making.');

  // ── Summary box notes ────────────────────────────────────────────
  setNote('biz-tbody',     'Revenue grew to KES 347,839 in March, continuing to build from February. Zoho discipline remains strong at 95%. CSAT and review collection are active pain points — survey follow-through to be reinforced in April.');
  setNote('team-tbody',    'Most team-level KPIs are being formalised. Tracking infrastructure is being built out and formal data capture is expected from April. Pipeline sync meetings are happening but not yet formally recorded.');
  setNote('mkt-tbody', 'Strong marketing performance in March. Cost per paying lead came in at KES 1,225. 20 PAF conversions and 20 placement fee leads recorded. Campaigns ran consistently with time targeting and AI audiences applied across all active channels. Marketing data was submitted on time every week with actionable suggestions provided for ad optimisation.');
  setNote('cs-tbody',      'Strong month for client services. Onboarding hit 100%, response times are within target, and cycle time came in at just 3 days. One escalation was managed. CSAT and reviews remain at zero — survey process being reinforced.');
  setNote('rec-tbody', 'Placement success was a standout result at 100% for March — all 15 introduced candidates remained active at Day 30. All graduated candidates were fully vetted. Salary alignment at 33% remains a persistent challenge and requires a structured resolution going into April.');
  setNote('trainer-tbody', 'Training delivery was largely strong. Completion at 90.6% is close to target with 3 drop-offs. Transformation and placement outcomes are solid. Employer satisfaction slightly below target, linked to placement timing and readiness consistency.');
  setNote('office-tbody',  'Performance was strong across all office operations. CRM hygiene, payment tracking, and follow-up compliance are all at or above target.');

  // ── Monthly Highlights ───────────────────────────────────────────
  const hlBox = document.querySelector('.highlights-box [contenteditable]');
  if (hlBox) hlBox.textContent = 'March 2026 was a strong month for Nestara. Total revenue reached KES 432,089 (KES 347,839 in placement fees and KES 84,250 in training revenue), up from KES 238,113 in February. 20 clients were converted from 33 leads, with 21 total placements made. Training enrolled 21 candidates, graduated 16, and placed 15 within the month — a 93.75% post-training placement rate. Client services hit 100% onboarding completion with a 3-day interview-to-offer cycle. Office operations maintained high standards across CRM hygiene, payment tracking, and follow-up compliance. Key focus areas for April: salary alignment (33% fit rate), CSAT survey completion, and growing deal volume toward monthly targets.';

});

document.addEventListener('click', e => {
  const btn = e.target.closest('.rag-btn');
  if (!btn) return;
  const group = btn.closest('.rag-status');
  group.querySelectorAll('.rag-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
});
</script>

<!-- ════════════════ PAGE 11 — ANALYTICS DASHBOARD ════════════════ -->
<div class="page" style="padding-bottom:14mm;">
  <div class="page-header">
    <div class="logo-word">NESTARA</div>
    <div class="hd-right">Monthly KPI Report &nbsp;|&nbsp; <span contenteditable data-ph="Month Year">March 2026</span></div>
  </div>

  <div class="analytics-title">Analytics Dashboard</div>

  <!-- Revenue Trend: grouped bars Feb vs March -->
  <div style="background:var(--white);border:1.5px solid var(--brand-mid);border-radius:6px;padding:10px 12px;margin-bottom:10px;">
    <div style="font-size:7pt;font-weight:700;color:var(--brand);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Revenue Trend — February vs March 2026</div>
    <canvas id="revChart" style="max-height:150px;"></canvas>
  </div>

  <!-- Candidate Funnel: full-width horizontal bar -->
  <div style="background:var(--white);border:1.5px solid var(--brand-mid);border-radius:6px;padding:10px 12px;margin-bottom:0;">
    <div style="font-size:7pt;font-weight:700;color:var(--brand);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Candidate Success Funnel — March 2026</div>
    <canvas id="candChart" style="max-height:130px;"></canvas>
    <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
      <div style="flex:1;background:var(--brand-lt);border:1px solid var(--brand-mid);border-radius:3px;padding:5px 8px;text-align:center;">
        <div style="font-size:5.5pt;color:var(--mid);font-weight:600;text-transform:uppercase;">Inquiry → Training</div>
        <div style="font-size:8pt;font-weight:700;color:var(--mid);">Feb: 30%</div>
        <div style="font-size:8pt;font-weight:700;color:var(--brand);">Mar: 32.3%</div>
      </div>
      <div style="flex:1;background:var(--brand-lt);border:1px solid var(--brand-mid);border-radius:3px;padding:5px 8px;text-align:center;">
        <div style="font-size:5.5pt;color:var(--mid);font-weight:600;text-transform:uppercase;">Enrolled → Graduated</div>
        <div style="font-size:8pt;font-weight:700;color:var(--mid);">Feb: 88.9%</div>
        <div style="font-size:8pt;font-weight:700;color:var(--brand);">Mar: 76.2%</div>
      </div>
      <div style="flex:1;background:var(--brand-lt);border:1px solid var(--brand-mid);border-radius:3px;padding:5px 8px;text-align:center;">
        <div style="font-size:5.5pt;color:var(--mid);font-weight:600;text-transform:uppercase;">Graduated → Placed</div>
        <div style="font-size:8pt;font-weight:700;color:var(--mid);">Feb: 62.5%</div>
        <div style="font-size:8pt;font-weight:700;color:var(--brand);">Mar: 93.75%</div>
      </div>
    </div>
  </div>


  <!-- OVERALL SUCCESS RATE -->
  <div style="font-size:7pt;font-weight:700;color:var(--brand);text-transform:uppercase;letter-spacing:.05em;margin:8px 0 5px 0;">Inquiry to Placement Success Rate</div>
  <div style="display:flex;gap:8px;margin-bottom:8px;">
    <div style="flex:1;background:var(--brand-lt);border:1.5px solid var(--brand-mid);border-radius:4px;padding:8px 10px;text-align:center;">
      <div style="font-size:6pt;font-weight:700;color:var(--mid);text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px;">February 2026</div>
      <div style="font-size:22pt;font-weight:800;color:var(--brand);line-height:1.1;">16.7%</div>
      <div style="font-size:6pt;color:var(--mid);margin-top:2px;">10 placed from 60+ inquiries</div>
    </div>
    <div style="flex:1;background:var(--brand-lt);border:1.5px solid var(--brand);border-radius:4px;padding:8px 10px;text-align:center;">
      <div style="font-size:6pt;font-weight:700;color:var(--brand);text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px;">March 2026</div>
      <div style="font-size:22pt;font-weight:800;color:var(--brand);line-height:1.1;">23.1%</div>
      <div style="font-size:6pt;color:var(--mid);margin-top:2px;">15 placed from 65 inquiries</div>
    </div>
    <div style="flex:1;background:var(--brand);border:1.5px solid var(--brand);border-radius:4px;padding:8px 10px;text-align:center;">
      <div style="font-size:6pt;font-weight:700;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px;">Overall (Feb + Mar)</div>
      <div style="font-size:22pt;font-weight:800;color:#fff;line-height:1.1;">20%</div>
      <div style="font-size:6pt;color:rgba(255,255,255,0.75);margin-top:2px;">25 placed from 125 total inquiries</div>
    </div>
  </div>

  <!-- KEY FACTS -->
  <div style="font-size:7pt;font-weight:700;color:var(--brand);text-transform:uppercase;letter-spacing:.05em;margin:8px 0 5px 0;">Key Highlights — Feb vs March</div>
  <div style="display:flex;gap:6px;flex-wrap:wrap;">
    <div style="flex:1;min-width:120px;background:var(--brand-lt);border:1.5px solid var(--brand-mid);border-radius:4px;padding:6px 8px;">
      <div style="font-size:5.5pt;font-weight:700;color:var(--brand);text-transform:uppercase;margin-bottom:2px;">Placements</div>
      <div style="font-size:7pt;color:var(--dark);">February saw <strong>10 placements</strong> across 5 role types. March grew to <strong>21 placements</strong> across 5 role types including a Medical Caregiver — a 110% increase.</div>
    </div>
    <div style="flex:1;min-width:120px;background:var(--brand-lt);border:1.5px solid var(--brand-mid);border-radius:4px;padding:6px 8px;">
      <div style="font-size:5.5pt;font-weight:700;color:var(--brand);text-transform:uppercase;margin-bottom:2px;">Training</div>
      <div style="font-size:7pt;color:var(--dark);">Graduation-to-placement rate jumped from <strong>62.5%</strong> in February to <strong>93.75%</strong> in March — a significant improvement in post-training outcomes.</div>
    </div>
    <div style="flex:1;min-width:120px;background:var(--brand-lt);border:1.5px solid var(--brand-mid);border-radius:4px;padding:6px 8px;">
      <div style="font-size:5.5pt;font-weight:700;color:var(--brand);text-transform:uppercase;margin-bottom:2px;">Revenue</div>
      <div style="font-size:7pt;color:var(--dark);">Total revenue grew from <strong>KES 238,113</strong> in February to <strong>KES 432,089</strong> in March — an 81.5% month-on-month increase.</div>
    </div>
    <div style="flex:1;min-width:120px;background:var(--brand-lt);border:1.5px solid var(--brand-mid);border-radius:4px;padding:6px 8px;">
      <div style="font-size:5.5pt;font-weight:700;color:var(--brand);text-transform:uppercase;margin-bottom:2px;">Client Conversion</div>
      <div style="font-size:7pt;color:var(--dark);">February converted <strong>13 of 41 leads</strong> (31.7%). March improved to <strong>20 of 33 leads</strong> (60.6%) — nearly double the conversion efficiency.</div>
    </div>
    <div style="flex:1;min-width:120px;background:var(--brand-lt);border:1.5px solid var(--brand-mid);border-radius:4px;padding:6px 8px;">
      <div style="font-size:5.5pt;font-weight:700;color:var(--brand);text-transform:uppercase;margin-bottom:2px;">Training Revenue</div>
      <div style="font-size:7pt;color:var(--dark);">Training revenue grew from <strong>KES 58,500</strong> in February to <strong>KES 84,250</strong> in March — a 44% increase.</div>
    </div>
  </div>
  <div class="page-footer"><span>Internal Use Only</span><span>Page 11</span></div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<script>
window.addEventListener('DOMContentLoaded', function() {
  const brand   = '#ae491e';
  const brandLt = '#f9ece6';
  const mid     = '#c4855a';
  const midLt   = 'rgba(196,133,90,0.25)';
  const brandLt2= 'rgba(174,73,30,0.15)';

  const fontCfg = { family: 'Poppins', size: 9 };
  const gridCfg = { color: 'rgba(0,0,0,0.06)' };

  // ── 1. Revenue Trend: grouped bars ───────────────────────────
  new Chart(document.getElementById('revChart'), {
    type: 'bar',
    data: {
      labels: ['February 2026', 'March 2026'],
      datasets: [
        {
          label: 'Placement Revenue',
          data: [238113, 347839],
          backgroundColor: brand,
          borderColor: brand,
          borderWidth: 1.5,
          borderRadius: 3,
        },
        {
          label: 'Training Revenue',
          data: [58500, 84250],
          backgroundColor: 'rgba(196,133,90,0.55)',
          borderColor: mid,
          borderWidth: 1.5,
          borderRadius: 3,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top', labels: { font: fontCfg, boxWidth: 10, padding: 8 } },
        tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': KES ' + ctx.raw.toLocaleString() } }
      },
      scales: {
        x: { ticks: { font: fontCfg }, grid: gridCfg },
        y: { ticks: { font: fontCfg, callback: v => 'KES ' + (v/1000).toFixed(0) + 'K' }, grid: gridCfg, beginAtZero: true, max: 600000 }
      }
    }
  });

  // ── 3. Candidate Funnel: horizontal bar ───────────────────────
  new Chart(document.getElementById('candChart'), {
    type: 'bar',
    data: {
      labels: ['Inquiries', 'Joined\nTraining', 'Graduated', 'Placed'],
      datasets: [
        {
          label: 'February 2026',
          data: [60, 18, 16, 10],
          backgroundColor: 'rgba(196,133,90,0.45)',
          borderColor: mid,
          borderWidth: 1.5,
          borderRadius: 3,
        },
        {
          label: 'March 2026',
          data: [65, 21, 16, 15],
          backgroundColor: brand,
          borderColor: brand,
          borderWidth: 1.5,
          borderRadius: 3,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top', labels: { font: fontCfg, boxWidth: 10, padding: 8 } },
        tooltip: {
          callbacks: {
            label: ctx => {
              const rates = { 'February 2026': ['—','—','89% of enrolled','63% of grad'], 'March 2026': ['65 inquiries','32.3% of inquiries','76.2% of enrolled','93.75% of grad'] };
              const r = rates[ctx.dataset.label][ctx.dataIndex];
              return ctx.dataset.label + ': ' + ctx.raw + (r ? ' (' + r + ')' : '');
            }
          }
        },
        datalabels: false,
      },
      scales: {
        x: { ticks: { font: fontCfg }, grid: gridCfg, beginAtZero: true },
        y: { ticks: { font: fontCfg }, grid: { display: false } }
      }
    }
  });

});
</script>

<!-- ════════════════ PAGE 12 — SOCIAL INSIGHTS: FB + IG ════════════════ -->
<div class="page" style="padding:10mm 14mm 10mm 14mm;">
  <div class="page-header">
    <div class="logo-word">NESTARA</div>
    <div class="hd-right">Monthly KPI Report &nbsp;|&nbsp; <span contenteditable data-ph="Month Year">March 2026</span></div>
  </div>

  <div class="analytics-title" style="margin-bottom:6px;">Social Media Insights — March 2026</div>

  <!-- FACEBOOK -->
  <div style="border:1.5px solid var(--brand-mid);border-radius:5px;overflow:hidden;margin-bottom:10px;">
    <div style="background:var(--brand);color:#fff;padding:5px 10px;font-size:7.5pt;font-weight:700;letter-spacing:.05em;text-transform:uppercase;">Facebook</div>
    <div style="padding:8px 10px;">

      <div style="display:flex;gap:8px;margin-bottom:6px;">
        <div style="flex:1;">
          <div style="font-size:5.5pt;font-weight:700;color:var(--brand);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px;">Audience &amp; Growth</div>
          <div style="display:flex;gap:4px;">
            <div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Followers</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">1.22K</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">New Followers</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">+89</div><div style="font-size:4.5pt;color:var(--red);">↓3.26% vs prev period</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Followers Lost</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">9</div><div style="font-size:4.5pt;color:#6aaa7e;">↓25% fewer lost</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Avg/Day</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">~3/day</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Posts</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">68</div><div style="font-size:4.5pt;color:var(--red);">↓34.62%</div></div>
          </div>
        </div>
      </div>
      <div style="font-size:7pt;color:var(--dark);margin-bottom:6px;line-height:1.5;">
        The page gained <strong>89 new followers</strong> this month, averaging 3 per day. While follower growth slowed slightly (↓3.26%), the number of followers lost dropped by 25%, suggesting stronger audience retention. Post frequency declined significantly — a 34.62% drop in posts — which may be contributing to reduced reach and engagement.
      </div>

      <div style="display:flex;gap:8px;margin-bottom:6px;">
        <div style="flex:1;">
          <div style="font-size:5.5pt;font-weight:700;color:var(--brand);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px;">Reach &amp; Visibility</div>
          <div style="display:flex;gap:4px;">
            <div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Page Reach</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">85.1K</div><div style="font-size:4.5pt;color:var(--red);">↓12.55%</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Paid Reach</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">77.45%</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Organic Reach</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">22.55%</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Profile Views</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">2.33K</div><div style="font-size:4.5pt;color:var(--red);">↓20.12%</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Messenger New</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">13</div><div style="font-size:4.5pt;color:var(--red);">0 lost · ↓71.11%</div></div>
          </div>
        </div>
      </div>
      <div style="font-size:7pt;color:var(--dark);margin-bottom:6px;line-height:1.5;">
        Total page reach was <strong>85.1K</strong>, though this is heavily reliant on paid activity — <strong>77.45% paid vs only 22.55% organic</strong>. This suggests the page's organic content is not generating significant discovery. Profile views declined 20.12%, and new Messenger connections dropped sharply to 13 (↓71.11%), though no connections were lost.
      </div>

      <div style="display:flex;gap:8px;">
        <div style="flex:1;">
          <div style="font-size:5.5pt;font-weight:700;color:var(--brand);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px;">Content Engagement</div>
          <div style="display:flex;gap:4px;">
            <div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Total Engagement</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">604</div><div style="font-size:4.5pt;color:var(--red);">↓24.59%</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Top Post ER</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">13.95%</div><div style="font-size:4.5pt;color:var(--brand);">Mar 12 · Nannies post</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Video Share</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">53.5%</div><div style="font-size:4.5pt;color:var(--brand);">of engagement</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Image Share</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">46.5%</div><div style="font-size:4.5pt;color:var(--brand);">of engagement</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Text/Link</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">0%</div><div style="font-size:4.5pt;color:var(--brand);">no engagement</div></div>
          </div>
        </div>
      </div>
      <div style="font-size:7pt;color:var(--dark);margin-top:6px;line-height:1.5;">
        Total engagement came in at <strong>604</strong>, down 24.59%. The strongest performing post was a <strong>March 12 hiring post for Professional Nannies &amp; House Managers</strong>, achieving a 13.95% engagement rate. Video content drove 53.5% of all engagement, closely followed by images at 46.5%. Text and link posts generated zero engagement and should be deprioritised.
      </div>

    </div>
  </div>

  <!-- INSTAGRAM -->
  <div style="border:1.5px solid var(--brand-mid);border-radius:5px;overflow:hidden;">
    <div style="background:var(--brand);color:#fff;padding:5px 10px;font-size:7.5pt;font-weight:700;letter-spacing:.05em;text-transform:uppercase;">Instagram</div>
    <div style="padding:8px 10px;">

      <div style="display:flex;gap:8px;margin-bottom:6px;">
        <div style="flex:1;">
          <div style="font-size:5.5pt;font-weight:700;color:var(--brand);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px;">Audience &amp; Growth</div>
          <div style="display:flex;gap:4px;">
            <div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Followers</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">1.98K</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">New Followers</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">+167</div><div style="font-size:4.5pt;color:var(--red);">↓53.09%</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Reach</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">42K</div><div style="font-size:4.5pt;color:var(--red);">↓45.37%</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Posts</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">32</div><div style="font-size:4.5pt;color:var(--red);">↓11.11%</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Engagement</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">235</div><div style="font-size:4.5pt;color:var(--red);">↓38.8%</div></div>
          </div>
        </div>
      </div>
      <div style="font-size:7pt;color:var(--dark);margin-bottom:6px;line-height:1.5;">
        Instagram gained <strong>167 new followers</strong> this month bringing the total to <strong>1.98K</strong>. However, several key metrics declined compared to the previous period — reach dropped 45.37% and engagement fell 38.8%. This may reflect reduced posting frequency or content-format mismatch.
      </div>

      <div style="display:flex;gap:8px;margin-bottom:6px;">
        <div style="flex:1;">
          <div style="font-size:5.5pt;font-weight:700;color:var(--brand);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px;">Stories &amp; Content</div>
          <div style="display:flex;gap:4px;">
            <div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Stories</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">37</div><div style="font-size:4.5pt;color:var(--red);">↓39.34%</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Story Engagement</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">1.18K</div><div style="font-size:4.5pt;color:var(--red);">↓66.85%</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Video Eng.</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">74.5%</div><div style="font-size:4.5pt;color:var(--brand);">of total engagement</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Carousel Eng.</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">20.4%</div><div style="font-size:4.5pt;color:var(--brand);">of total engagement</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Top Format</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">Video</div><div style="font-size:4.5pt;color:var(--brand);">dominant driver</div></div>
          </div>
        </div>
      </div>
      <div style="font-size:7pt;color:var(--dark);margin-bottom:6px;line-height:1.5;">
        Stories saw a significant drop in engagement (↓66.85%) despite 37 stories posted. Video remains the <strong>strongest content format at 74.5%</strong> of total engagement, followed by carousels at 20.4%. Prioritising video and carousel formats is recommended.
      </div>

      <div style="display:flex;gap:8px;">
        <div style="flex:1;">
          <div style="font-size:5.5pt;font-weight:700;color:var(--brand);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px;">Audience Profile</div>
          <div style="display:flex;gap:4px;">
            <div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Female</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">70.4%</div><div style="font-size:4.5pt;color:var(--brand);">1.39K of total likes</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Top Age</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">25–34</div><div style="font-size:4.5pt;color:var(--brand);">then 35–44</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Top City</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">Nairobi</div><div style="font-size:4.5pt;color:var(--brand);">66.72% of likes</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Kiambu</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">5.35%</div><div style="font-size:4.5pt;color:var(--brand);">2nd city</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">International</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">&lt;1%</div><div style="font-size:4.5pt;color:var(--brand);">US · UK · UAE</div></div>
          </div>
        </div>
      </div>
      <div style="font-size:7pt;color:var(--dark);margin-top:6px;line-height:1.5;">
        The audience is predominantly <strong>female (70.4%)</strong>, aged <strong>25–34</strong>, based in <strong>Nairobi (66.72%)</strong>. This aligns well with Nestara's client profile. Small but notable engagement exists from the US, UK, and UAE — indicating potential for diaspora-focused content.
      </div>

    </div>
  </div>

  <div class="page-footer"><span>Internal Use Only</span><span>Page 12</span></div>
</div>

<!-- ════════════════ PAGE 13 — SOCIAL INSIGHTS: TIKTOK ════════════════ -->
<div class="page" style="padding:10mm 14mm 10mm 14mm;">
  <div class="page-header">
    <div class="logo-word">NESTARA</div>
    <div class="hd-right">Monthly KPI Report &nbsp;|&nbsp; <span contenteditable data-ph="Month Year">March 2026</span></div>
  </div>

  <div class="analytics-title" style="margin-bottom:6px;">Social Media Insights — TikTok — March 2026</div>

  <!-- TIKTOK -->
  <div style="border:1.5px solid var(--brand-mid);border-radius:5px;overflow:hidden;">
    <div style="background:var(--brand);color:#fff;padding:5px 10px;font-size:7.5pt;font-weight:700;letter-spacing:.05em;text-transform:uppercase;">TikTok</div>
    <div style="padding:8px 10px;">

      <div style="display:flex;gap:8px;margin-bottom:6px;">
        <div style="flex:1;">
          <div style="font-size:5.5pt;font-weight:700;color:var(--brand);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px;">Audience &amp; Growth</div>
          <div style="display:flex;gap:4px;">
            <div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Total Audience</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">4.24K</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Growth</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">+595</div><div style="font-size:4.5pt;color:var(--red);">↓25.44% vs prev</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Daily Avg</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">19/day</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Posts</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">34</div><div style="font-size:4.5pt;color:var(--brand);">~1/day</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Video Views</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">40.2K</div><div style="font-size:4.5pt;color:var(--red);">↓20.71%</div></div>
          </div>
        </div>
      </div>
      <div style="font-size:7pt;color:var(--dark);margin-bottom:8px;line-height:1.5;">
        TikTok remains Nestara's largest social platform with <strong>4.24K total audience</strong> and <strong>595 new followers</strong> gained this month — averaging 19 new followers per day. While growth slowed 25.44% compared to the previous period, the platform continues to outperform Facebook and Instagram in absolute audience size. Video views reached <strong>40.2K</strong>, maintaining strong content reach despite a 20.71% decline.
      </div>

      <div style="display:flex;gap:8px;margin-bottom:6px;">
        <div style="flex:1;">
          <div style="font-size:5.5pt;font-weight:700;color:var(--brand);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px;">Engagement Breakdown</div>
          <div style="display:flex;gap:4px;">
            <div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Total Engagement</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">1.22K</div><div style="font-size:4.5pt;color:var(--red);">↓27.88%</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Likes</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">1.04K</div><div style="font-size:4.5pt;color:var(--brand);">85.1% of engagement</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Shares</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">93</div><div style="font-size:4.5pt;color:var(--brand);">7.62%</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Comments</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">89</div><div style="font-size:4.5pt;color:var(--brand);">7.29%</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">Profile Views</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">1.17K</div><div style="font-size:4.5pt;color:#6aaa7e;">↑42.84%</div></div>
          </div>
        </div>
      </div>
      <div style="font-size:7pt;color:var(--dark);margin-bottom:8px;line-height:1.5;">
        Total engagement was <strong>1.22K</strong> — the highest of all three platforms. Likes dominate at 85.1%, while shares (7.62%) and comments (7.29%) indicate meaningful audience interaction. The most encouraging metric is <strong>Profile Views at 1.17K — up 42.84%</strong>, suggesting content is actively driving profile discovery and potential follow-through. This is a strong signal that content quality is improving.
      </div>

      <div style="display:flex;gap:8px;margin-bottom:6px;">
        <div style="flex:1;">
          <div style="font-size:5.5pt;font-weight:700;color:var(--brand);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px;">Platform Comparison — March 2026</div>
          <div style="display:flex;gap:4px;">
            <div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">TikTok Audience</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">4.24K</div><div style="font-size:4.5pt;color:var(--brand);">largest platform</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">IG Audience</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">1.98K</div><div style="font-size:4.5pt;color:var(--brand);">2nd</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">FB Audience</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">1.22K</div><div style="font-size:4.5pt;color:var(--brand);">3rd</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">TikTok Eng.</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">1.22K</div><div style="font-size:4.5pt;color:var(--brand);">highest</div></div><div style="flex:1;background:var(--brand-lt);border-radius:3px;padding:4px 5px;text-align:center;"><div style="font-size:5pt;color:var(--mid);font-weight:600;">FB Reach</div><div style="font-size:11pt;font-weight:800;color:var(--brand);">85.1K</div><div style="font-size:4.5pt;color:var(--brand);">broadest reach</div></div>
          </div>
        </div>
      </div>
      <div style="font-size:7pt;color:var(--dark);margin-bottom:8px;line-height:1.5;">
        Across all three platforms, <strong>TikTok leads in audience size and engagement volume</strong>. Facebook generates the broadest reach (85.1K) but is heavily paid-dependent. Instagram has the most defined and relevant audience profile (female, 25–34, Nairobi). Each platform is serving a distinct function — TikTok for awareness and growth, Instagram for qualified audience engagement, and Facebook for paid reach and lead generation.
      </div>

      <div style="background:var(--brand-lt);border:1.5px solid var(--brand-mid);border-radius:4px;padding:8px 10px;margin-top:4px;">
        <div style="font-size:6pt;font-weight:700;color:var(--brand);text-transform:uppercase;margin-bottom:4px;">Key Recommendations for April</div>
        <div style="font-size:7pt;color:var(--dark);line-height:1.6;">
          1. <strong>Increase post frequency</strong> on Facebook and Instagram — both saw declines linked to reduced output.<br>
          2. <strong>Prioritise video and carousel</strong> content across IG and FB — text and link posts generate zero engagement.<br>
          3. <strong>Leverage TikTok profile view growth</strong> — the ↑42.84% spike suggests content is driving discovery; follow up with stronger CTAs to convert viewers to followers.<br>
          4. <strong>Reduce paid reliance on Facebook</strong> — 77.45% paid reach is unsustainable long-term; build organic content strategy.<br>
          5. <strong>Test diaspora content</strong> on Instagram — small but present engagement from US, UK, and UAE could be a growth opportunity.
        </div>
      </div>

    </div>
  </div>


  <!-- DISCLAIMER -->
  <div style="margin-top:16px;border-top:1.5px solid var(--brand-mid);padding-top:10px;">
    <div style="font-size:6.5pt;color:var(--mid);line-height:1.7;">
      <strong style="color:var(--brand);">Note on Data Sources:</strong> Parts of this report have been produced using a combination of <strong>actual operational data</strong> from Nestara&#x2019;s systems and <strong>synthetic data generation supported by AI</strong>, used to fill gaps where live tracking was not yet in place. Figures drawn directly from Zoho CRM, Zoho Books, and team reports reflect real performance. Where data collection is still being formalised, estimates and AI-assisted projections have been used and are noted accordingly. All data used in this process is <strong>saved securely and not shared publicly</strong> — it is being retained as part of an ongoing initiative to train forecasting models for future performance planning.
    </div>
    <div style="font-size:6.5pt;color:var(--mid);margin-top:6px;">
      Regards,<br>
      <strong style="color:var(--brand);font-size:7pt;">Frank</strong>
    </div>
  </div>
  <div class="page-footer"><span>Internal Use Only</span><span>Page 13</span></div>
</div>
</body>
</html>

```
--

## Format Guide (so the page can parse it correctly)

