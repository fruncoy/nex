import React, { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { smsService } from '../services/smsService'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import {
  Search, Plus, Trash2, Pencil, Send, Loader2, Upload, FileSpreadsheet, X, CheckCircle, XCircle
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BadDebtRecord {
  id: string
  full_name: string
  phone: string | null
  total_fee: number | null
  amount_paid: number | null
  notes: string | null
  created_at: string
}

// ─── SMS Templates ────────────────────────────────────────────────────────────
// Each template uses {name}, {owed}, {org} as placeholders
// Kept within ~160 chars (1 SMS unit) where possible; 2nd/3rd go to 2 units max.

const SMS_TEMPLATES = [
  {
    id: 'reminder_1',
    label: '1st Reminder — Friendly',
    message:
      'Dear {name}, this is a gentle reminder that you have an outstanding balance of KES {owed} with NICHE. Kindly visit our office or contact us to arrange payment. Thank you.',
  },
  {
    id: 'reminder_2',
    label: '2nd Reminder — Firm',
    message:
      'Dear {name}, your outstanding balance of KES {owed} with NICHE remains unpaid. Failure to settle or contact us within 7 days may result in formal recovery action. Please reach us urgently.',
  },
  {
    id: 'reminder_3',
    label: '3rd Reminder — Serious',
    message:
      'NICHE NOTICE: {name}, your balance of KES {owed} is overdue. We hold your full personal records & next-of-kin details. Kindly appear at our offices within 7 days to discuss a payment plan or face escalated recovery. This is your 3rd & final courtesy notice.',
  },
  {
    id: 'reminder_4',
    label: '4th Notice — Final (DCI)',
    message:
      'FINAL NOTICE: {name}, KES {owed} owed to NICHE. Your file is being prepared for submission to relevant authorities. Appear at NICHE within 14 days to resolve this. Ignoring this will have serious legal & reputational consequences.',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toLocalFormat = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('2540') && digits.length === 13) return '0' + digits.slice(4)
  if (digits.startsWith('254') && digits.length === 12) return '0' + digits.slice(3)
  if (digits.startsWith('0') && digits.length === 10) return digits
  if (digits.length === 9) return '0' + digits
  return digits
}

const formatPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('2540') && digits.length === 13) return `+254${digits.slice(4)}`
  if (digits.startsWith('254') && digits.length === 12) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 10) return `+254${digits.slice(1)}`
  if (digits.length === 9) return `+254${digits}`
  return `+${digits}`
}

const applyTemplate = (template: string, record: BadDebtRecord) => {
  const owed = ((record.total_fee ?? 0) - (record.amount_paid ?? 0)).toLocaleString()
  return template
    .replace(/{name}/g, record.full_name.split(' ')[0])
    .replace(/{owed}/g, owed)
    .replace(/{org}/g, 'NICHE')
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BadDebt() {
  const { staff } = useAuth()
  const { showToast } = useToast()

  // Data
  const [records, setRecords] = useState<BadDebtRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Add single
  const [showForm, setShowForm] = useState(false)
  const [formSaving, setFormSaving] = useState(false)
  const [form, setForm] = useState({ full_name: '', phone: '', total_fee: '', amount_paid: '', notes: '' })

  // Bulk upload
  const [showBulk, setShowBulk] = useState(false)
  const [bulkPreview, setBulkPreview] = useState<Omit<BadDebtRecord, 'id' | 'created_at'>[]>([])
  const [bulkSaving, setBulkSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit
  const [editRecord, setEditRecord] = useState<BadDebtRecord | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  // Delete
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)

  // SMS
  const [smsTarget, setSmsTarget] = useState<BadDebtRecord | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState(SMS_TEMPLATES[0].id)
  const [customMessage, setCustomMessage] = useState('')
  const [smsSending, setSmsSending] = useState(false)
  const [sendLog, setSendLog] = useState<{ name: string; phone: string; status: 'sent' | 'failed'; error?: string }[]>([])

  // Bulk SMS
  const [showBulkSms, setShowBulkSms] = useState(false)
  const [bulkSmsTemplate, setBulkSmsTemplate] = useState(SMS_TEMPLATES[0].id)
  const [selectedForSms, setSelectedForSms] = useState<Set<string>>(new Set())
  const [bulkSmsSending, setBulkSmsSending] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('bad_debt_contacts').select('*').order('full_name')
    setRecords(data || [])
    setLoading(false)
  }

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filtered = records.filter(r =>
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.phone || '').includes(search)
  )

  // ── Totals ────────────────────────────────────────────────────────────────

  const totalOwed = records.reduce((sum, r) => sum + ((r.total_fee ?? 0) - (r.amount_paid ?? 0)), 0)

  // ── Add Single ────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.full_name.trim()) return
    setFormSaving(true)
    const row = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim() ? toLocalFormat(form.phone.trim()) : null,
      total_fee: form.total_fee ? parseFloat(form.total_fee) : null,
      amount_paid: form.amount_paid ? parseFloat(form.amount_paid) : null,
      notes: form.notes.trim() || null,
      created_by: staff?.name || 'System',
    }
    const { error } = await supabase.from('bad_debt_contacts').insert(row)
    if (error) showToast('Failed to save record', 'error')
    else {
      showToast('Record saved', 'success')
      setForm({ full_name: '', phone: '', total_fee: '', amount_paid: '', notes: '' })
      setShowForm(false)
      load()
    }
    setFormSaving(false)
  }

  // ── Bulk Upload ───────────────────────────────────────────────────────────

  const parseRows = (rows: any[][]): Omit<BadDebtRecord, 'id' | 'created_at'>[] =>
    rows
      .filter(r => r[0]?.toString().trim())
      .map(r => ({
        full_name: r[0]?.toString().trim() || '',
        phone: r[1]?.toString().trim() ? toLocalFormat(r[1].toString().trim()) : null,
        total_fee: r[2] != null && r[2] !== '' ? parseFloat(r[2].toString().replace(/[^0-9.]/g, '')) || null : null,
        amount_paid: r[3] != null && r[3] !== '' ? parseFloat(r[3].toString().replace(/[^0-9.]/g, '')) || null : null,
        notes: r[4]?.toString().trim() || null,
      }))

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      // Skip header row if first cell looks like a label
      const firstCell = rows[0]?.[0]?.toString().toLowerCase() || ''
      const dataRows = firstCell.includes('name') ? rows.slice(1) : rows
      setBulkPreview(parseRows(dataRows))
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const handleBulkSave = async () => {
    if (!bulkPreview.length) return
    setBulkSaving(true)
    const rows = bulkPreview.map(r => ({ ...r, created_by: staff?.name || 'System' }))
    const { error } = await supabase.from('bad_debt_contacts').insert(rows)
    if (error) showToast('Failed to save bulk records', 'error')
    else {
      showToast(`${rows.length} records saved`, 'success')
      setBulkPreview([])
      setShowBulk(false)
      load()
    }
    setBulkSaving(false)
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  const handleUpdate = async () => {
    if (!editRecord || !editRecord.full_name.trim()) return
    setEditSaving(true)
    const updates = {
      full_name: editRecord.full_name.trim(),
      phone: editRecord.phone?.trim() ? toLocalFormat(editRecord.phone.trim()) : null,
      total_fee: editRecord.total_fee,
      amount_paid: editRecord.amount_paid,
      notes: editRecord.notes?.trim() || null,
    }
    const { error } = await supabase.from('bad_debt_contacts').update(updates).eq('id', editRecord.id)
    if (error) showToast('Failed to update record', 'error')
    else {
      setRecords(prev => prev.map(r => r.id === editRecord.id ? { ...r, ...updates } : r))
      showToast('Record updated', 'success')
      setEditRecord(null)
    }
    setEditSaving(false)
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!confirmDelete) return
    await supabase.from('bad_debt_contacts').delete().eq('id', confirmDelete.id)
    setRecords(prev => prev.filter(r => r.id !== confirmDelete.id))
    showToast('Record deleted', 'success')
    setConfirmDelete(null)
  }

  // ── Single SMS ────────────────────────────────────────────────────────────

  const getTemplateMessage = (templateId: string, record: BadDebtRecord) => {
    const tpl = SMS_TEMPLATES.find(t => t.id === templateId)
    return tpl ? applyTemplate(tpl.message, record) : ''
  }

  const openSms = (record: BadDebtRecord) => {
    setSmsTarget(record)
    setSelectedTemplate(SMS_TEMPLATES[0].id)
    setCustomMessage(applyTemplate(SMS_TEMPLATES[0].message, record))
    setSendLog([])
  }

  const handleTemplateChange = (id: string) => {
    setSelectedTemplate(id)
    if (smsTarget) setCustomMessage(getTemplateMessage(id, smsTarget))
  }

  const handleSendSms = async () => {
    if (!smsTarget || !customMessage.trim() || !smsTarget.phone) return
    setSmsSending(true)
    const phone = formatPhone(smsTarget.phone)
    const result = await smsService.sendSMS({
      recipientType: 'client',
      recipientId: smsTarget.id,
      recipientName: smsTarget.full_name,
      phoneNumber: phone,
      messageType: 'broadcast',
      messageContent: customMessage,
      sentBy: staff?.id || '',
    })
    setSendLog([{ name: smsTarget.full_name, phone, status: result.success ? 'sent' : 'failed', error: result.error }])
    showToast(result.success ? 'SMS sent' : `Failed: ${result.error}`, result.success ? 'success' : 'error')
    setSmsSending(false)
  }

  // ── Bulk SMS ──────────────────────────────────────────────────────────────

  const bulkSmsRecords = filtered.filter(r => selectedForSms.has(r.id) && r.phone)

  const handleBulkSendSms = async () => {
    if (!bulkSmsRecords.length) return
    setBulkSmsSending(true)
    const log: typeof sendLog = []
    for (const r of bulkSmsRecords) {
      const msg = applyTemplate(SMS_TEMPLATES.find(t => t.id === bulkSmsTemplate)!.message, r)
      const phone = formatPhone(r.phone!)
      const result = await smsService.sendSMS({
        recipientType: 'client',
        recipientId: r.id,
        recipientName: r.full_name,
        phoneNumber: phone,
        messageType: 'broadcast',
        messageContent: msg,
        sentBy: staff?.id || '',
      })
      log.push({ name: r.full_name, phone, status: result.success ? 'sent' : 'failed', error: result.error })
    }
    setSendLog(log)
    const sent = log.filter(l => l.status === 'sent').length
    showToast(`Sent ${sent} / ${log.length} messages`, sent > 0 ? 'success' : 'error')
    setBulkSmsSending(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Bad Debt Recovery</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track outstanding balances and send recovery notices</p>
        </div>
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2 shrink-0">
          <span className="text-xs text-red-600 font-medium">Total Owed</span>
          <span className="text-lg font-bold text-red-600">KES {totalOwed.toLocaleString()}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or phone..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary focus:border-transparent" />
        </div>
        <button onClick={() => { setShowBulk(false); setShowForm(f => !f) }}
          className="flex items-center gap-1.5 px-3 py-2 border border-nestalk-primary text-nestalk-primary text-sm rounded-lg hover:bg-nestalk-primary/10">
          <Plus className="w-4 h-4" /> Add Single
        </button>
        <button onClick={() => { setShowForm(false); setShowBulk(b => !b) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-nestalk-primary text-white text-sm rounded-lg hover:bg-nestalk-primary/90">
          <FileSpreadsheet className="w-4 h-4" /> Bulk Upload
        </button>
        {selectedForSms.size > 0 && (
          <button onClick={() => setShowBulkSms(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700">
            <Send className="w-4 h-4" /> Send SMS ({selectedForSms.size})
          </button>
        )}
      </div>

      {/* Add Single Form */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-700">New Bad Debt Record</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Full Name *</label>
              <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary"
                placeholder="Jane Doe" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Phone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary"
                placeholder="0712345678" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Total Fee (KES)</label>
              <input type="number" value={form.total_fee} onChange={e => setForm(f => ({ ...f, total_fee: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary"
                placeholder="5000" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Amount Paid (KES)</label>
              <input type="number" value={form.amount_paid} onChange={e => setForm(f => ({ ...f, amount_paid: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary"
                placeholder="0" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary"
                placeholder="Optional notes" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={formSaving || !form.full_name.trim()}
              className="px-4 py-2 bg-nestalk-primary text-white text-sm rounded-lg hover:bg-nestalk-primary/90 disabled:opacity-50">
              {formSaving ? 'Saving...' : 'Save Record'}
            </button>
            <button onClick={() => { setShowForm(false); setForm({ full_name: '', phone: '', total_fee: '', amount_paid: '', notes: '' }) }}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white">Cancel</button>
          </div>
        </div>
      )}

      {/* Bulk Upload */}
      {showBulk && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-0.5">Upload Excel or CSV</p>
              <p className="text-xs text-gray-400">Columns: <span className="font-mono">Name | Phone | Total Fee | Amount Paid | Notes</span></p>
              <p className="text-xs text-gray-400 mt-0.5">Header row is auto-detected and skipped.</p>
            </div>
            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-sm px-3 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90">
              <Upload className="w-4 h-4" /> Choose File
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
          </div>
          {bulkPreview.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-600">{bulkPreview.length} rows parsed — preview:</p>
              <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-lg bg-white divide-y divide-gray-100">
                <div className="grid grid-cols-5 gap-2 px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-500">
                  <span>Name</span><span>Phone</span><span>Total Fee</span><span>Paid</span><span>Owed</span>
                </div>
                {bulkPreview.slice(0, 20).map((r, i) => (
                  <div key={i} className="grid grid-cols-5 gap-2 px-3 py-2 text-xs">
                    <span className="font-medium text-gray-800 truncate">{r.full_name}</span>
                    <span className="font-mono text-gray-500 truncate">{r.phone || '—'}</span>
                    <span className="text-gray-600">{r.total_fee != null ? r.total_fee.toLocaleString() : '—'}</span>
                    <span className="text-gray-600">{r.amount_paid != null ? r.amount_paid.toLocaleString() : '—'}</span>
                    <span className="text-red-600 font-semibold">{r.total_fee != null ? ((r.total_fee) - (r.amount_paid || 0)).toLocaleString() : '—'}</span>
                  </div>
                ))}
                {bulkPreview.length > 20 && <div className="text-center py-2 text-xs text-gray-400">+{bulkPreview.length - 20} more</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={handleBulkSave} disabled={bulkSaving}
                  className="px-4 py-2 bg-nestalk-primary text-white text-sm rounded-lg hover:bg-nestalk-primary/90 disabled:opacity-50">
                  {bulkSaving ? 'Saving...' : `Save ${bulkPreview.length} Records`}
                </button>
                <button onClick={() => { setShowBulk(false); setBulkPreview([]) }}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white">Cancel</button>
              </div>
            </>
          )}
          {bulkPreview.length === 0 && (
            <button onClick={() => { setShowBulk(false) }}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white">Cancel</button>
          )}
        </div>
      )}

      {/* Stats row */}
      <div className="text-xs text-gray-400">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 w-8">
                  <input type="checkbox"
                    checked={filtered.length > 0 && filtered.filter(r => r.phone).every(r => selectedForSms.has(r.id))}
                    onChange={e => {
                      const withPhone = filtered.filter(r => r.phone)
                      setSelectedForSms(e.target.checked ? new Set(withPhone.map(r => r.id)) : new Set())
                    }}
                    className="rounded border-gray-300" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Phone Number</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Total Fee</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Amount Paid</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-red-600">Amount Owed</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Notes</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400 text-sm">No records found</td></tr>
              ) : filtered.map((r, i) => {
                const owed = (r.total_fee ?? 0) - (r.amount_paid ?? 0)
                return (
                  <tr key={r.id} className={`hover:bg-gray-50 ${selectedForSms.has(r.id) ? 'bg-orange-50' : ''}`}>
                    <td className="px-3 py-3">
                      {r.phone ? (
                        <input type="checkbox" checked={selectedForSms.has(r.id)}
                          onChange={e => {
                            const next = new Set(selectedForSms)
                            e.target.checked ? next.add(r.id) : next.delete(r.id)
                            setSelectedForSms(next)
                          }}
                          className="rounded border-gray-300" />
                      ) : <span className="text-gray-200">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.full_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.phone || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-600">
                      {r.total_fee != null ? r.total_fee.toLocaleString() : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-600">
                      {r.amount_paid != null ? r.amount_paid.toLocaleString() : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-red-600">
                      {r.total_fee != null ? owed.toLocaleString() : <span className="text-gray-300 font-normal">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate">{r.notes || ''}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openSms(r)} title="Send SMS"
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange-600 transition-colors px-2 py-1 rounded hover:bg-orange-50">
                          <Send className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditRecord({ ...r })}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors px-2 py-1 rounded hover:bg-blue-50">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirmDelete({ id: r.id, name: r.full_name })}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Edit Modal ──────────────────────────────────────────────────────── */}
      {editRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Edit Record</p>
              <button onClick={() => setEditRecord(null)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Full Name</label>
                <input value={editRecord.full_name}
                  onChange={e => setEditRecord(r => r ? { ...r, full_name: e.target.value } : r)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Phone</label>
                <input value={editRecord.phone || ''}
                  onChange={e => setEditRecord(r => r ? { ...r, phone: e.target.value } : r)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-nestalk-primary" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Total Fee (KES)</label>
                <input type="number" value={editRecord.total_fee ?? ''}
                  onChange={e => setEditRecord(r => r ? { ...r, total_fee: parseFloat(e.target.value) || null } : r)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Amount Paid (KES)</label>
                <input type="number" value={editRecord.amount_paid ?? ''}
                  onChange={e => setEditRecord(r => r ? { ...r, amount_paid: parseFloat(e.target.value) || null } : r)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
                <input value={editRecord.notes || ''}
                  onChange={e => setEditRecord(r => r ? { ...r, notes: e.target.value } : r)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditRecord(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleUpdate} disabled={editSaving || !editRecord.full_name.trim()}
                className="px-4 py-2 text-sm bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 disabled:opacity-50">
                {editSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ─────────────────────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4">
            <p className="text-sm font-semibold text-gray-900">Delete record?</p>
            <p className="text-sm text-gray-500">This will permanently remove <span className="font-medium text-gray-800">{confirmDelete.name}</span>.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Single SMS Modal ─────────────────────────────────────────────────── */}
      {smsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Send Recovery SMS</p>
                <p className="text-xs text-gray-400">To: {smsTarget.full_name} · {smsTarget.phone}</p>
              </div>
              <button onClick={() => setSmsTarget(null)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>

            {/* Template picker */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600">Choose Template</p>
              <div className="grid grid-cols-2 gap-2">
                {SMS_TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => handleTemplateChange(t.id)}
                    className={`px-3 py-2 text-xs rounded-lg border text-left transition-colors ${selectedTemplate === t.id ? 'border-nestalk-primary bg-nestalk-primary/5 text-nestalk-primary font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Editable message */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-gray-600">Message</p>
                <span className={`text-xs ${customMessage.length > 320 ? 'text-red-500' : customMessage.length > 160 ? 'text-orange-500' : 'text-gray-400'}`}>
                  {customMessage.length} chars · {Math.ceil(customMessage.length / 160)} SMS
                </span>
              </div>
              <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)} rows={6}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary" />
            </div>

            {/* Send log */}
            {sendLog.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                {sendLog[0].status === 'sent'
                  ? <><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-green-600">Sent successfully</span></>
                  : <><XCircle className="w-4 h-4 text-red-500" /><span className="text-red-600">{sendLog[0].error || 'Failed'}</span></>}
              </div>
            )}

            {!smsTarget.phone && (
              <p className="text-xs text-red-500">This contact has no phone number.</p>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={() => setSmsTarget(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
              <button onClick={handleSendSms} disabled={smsSending || !smsTarget.phone || !customMessage.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50">
                {smsSending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send SMS</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk SMS Modal ───────────────────────────────────────────────────── */}
      {showBulkSms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Bulk Recovery SMS</p>
                <p className="text-xs text-gray-400">{bulkSmsRecords.length} recipient{bulkSmsRecords.length !== 1 ? 's' : ''} with phone numbers</p>
              </div>
              <button onClick={() => { setShowBulkSms(false); setSendLog([]) }}><X className="w-4 h-4 text-gray-400" /></button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600">Choose Template</p>
              <div className="grid grid-cols-2 gap-2">
                {SMS_TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => setBulkSmsTemplate(t.id)}
                    className={`px-3 py-2 text-xs rounded-lg border text-left transition-colors ${bulkSmsTemplate === t.id ? 'border-nestalk-primary bg-nestalk-primary/5 text-nestalk-primary font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview of what will be sent to first recipient */}
            {bulkSmsRecords.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 border border-gray-200">
                <span className="font-semibold text-gray-700">Preview (for {bulkSmsRecords[0].full_name.split(' ')[0]}): </span>
                {applyTemplate(SMS_TEMPLATES.find(t => t.id === bulkSmsTemplate)!.message, bulkSmsRecords[0])}
              </div>
            )}

            {/* Send log */}
            {sendLog.length > 0 && (
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {sendLog.map((l, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="font-medium text-gray-700">{l.name}</span>
                    <span className={`flex items-center gap-1 ${l.status === 'sent' ? 'text-green-600' : 'text-red-500'}`}>
                      {l.status === 'sent' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {l.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowBulkSms(false); setSendLog([]) }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
              <button onClick={handleBulkSendSms} disabled={bulkSmsSending || bulkSmsRecords.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50">
                {bulkSmsSending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                  : <><Send className="w-4 h-4" /> Send to {bulkSmsRecords.length}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
