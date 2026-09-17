import React, { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { smsService } from '../services/smsService'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import {
  Search, Plus, Trash2, Pencil, Send, Loader2, Upload,
  FileSpreadsheet, X, CheckCircle, XCircle, MessageSquare, Users
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

interface SmsTemplate {
  id: string
  label: string
  message: string
}

// ─── Default Templates ────────────────────────────────────────────────────────

const DEFAULT_TEMPLATES: SmsTemplate[] = [
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
      'Dear {name}, your balance of KES {owed} with NICHE remains unpaid. Failure to settle or contact us within 7 days may lead to formal recovery action. Please reach us urgently.',
  },
  {
    id: 'reminder_3',
    label: '3rd Reminder — Serious',
    message:
      'NICHE NOTICE: {name}, your balance of KES {owed} is overdue. We hold your full personal records & next-of-kin details. Appear at our offices within 7 days to discuss a payment plan or face escalated recovery. 3rd & final courtesy notice.',
  },
  {
    id: 'reminder_4',
    label: '4th Notice — Final',
    message:
      'FINAL NOTICE: {name}, KES {owed} owed to NICHE. Your file is being prepared for submission to relevant authorities. Appear at NICHE within 14 days to resolve this. Ignoring this will have serious legal & reputational consequences.',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toLocalFormat = (phone: string) => {
  const d = phone.replace(/\D/g, '')
  if (d.startsWith('2540') && d.length === 13) return '0' + d.slice(4)
  if (d.startsWith('254') && d.length === 12) return '0' + d.slice(3)
  if (d.startsWith('0') && d.length === 10) return d
  if (d.length === 9) return '0' + d
  return d
}

const formatPhone = (phone: string) => {
  const d = phone.replace(/\D/g, '')
  if (d.startsWith('2540') && d.length === 13) return `+254${d.slice(4)}`
  if (d.startsWith('254') && d.length === 12) return `+${d}`
  if (d.startsWith('0') && d.length === 10) return `+254${d.slice(1)}`
  if (d.length === 9) return `+254${d}`
  return `+${d}`
}

const applyVars = (msg: string, record: BadDebtRecord) => {
  const owed = ((record.total_fee ?? 0) - (record.amount_paid ?? 0)).toLocaleString()
  return msg
    .replace(/{name}/g, record.full_name.split(' ')[0])
    .replace(/{fullname}/g, record.full_name)
    .replace(/{owed}/g, owed)
    .replace(/{total}/g, (record.total_fee ?? 0).toLocaleString())
    .replace(/{paid}/g, (record.amount_paid ?? 0).toLocaleString())
}

// ─── Profiles Tab ─────────────────────────────────────────────────────────────

function ProfilesTab({ records, loading, onRefresh }: {
  records: BadDebtRecord[]
  loading: boolean
  onRefresh: () => void
}) {
  const { staff } = useAuth()
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [formSaving, setFormSaving] = useState(false)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [form, setForm] = useState({ full_name: '', phone: '', total_fee: '', amount_paid: '', notes: '' })
  const [bulkPreview, setBulkPreview] = useState<Omit<BadDebtRecord, 'id' | 'created_at'>[]>([])
  const [editRecord, setEditRecord] = useState<BadDebtRecord | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtered = records.filter(r =>
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.phone || '').includes(search)
  )

  const totalOwed = records.reduce((s, r) => s + ((r.total_fee ?? 0) - (r.amount_paid ?? 0)), 0)

  const handleSave = async () => {
    if (!form.full_name.trim()) return
    setFormSaving(true)
    const { error } = await supabase.from('bad_debt_contacts').insert({
      full_name: form.full_name.trim(),
      phone: form.phone.trim() ? toLocalFormat(form.phone.trim()) : null,
      total_fee: form.total_fee ? parseFloat(form.total_fee) : null,
      amount_paid: form.amount_paid ? parseFloat(form.amount_paid) : null,
      notes: form.notes.trim() || null,
      created_by: staff?.name || 'System',
    })
    if (error) showToast('Failed to save', 'error')
    else {
      showToast('Record saved', 'success')
      setForm({ full_name: '', phone: '', total_fee: '', amount_paid: '', notes: '' })
      setShowForm(false)
      onRefresh()
    }
    setFormSaving(false)
  }

  const handleUpdate = async () => {
    if (!editRecord) return
    setEditSaving(true)
    const { error } = await supabase.from('bad_debt_contacts').update({
      full_name: editRecord.full_name.trim(),
      phone: editRecord.phone?.trim() ? toLocalFormat(editRecord.phone.trim()) : null,
      total_fee: editRecord.total_fee,
      amount_paid: editRecord.amount_paid,
      notes: editRecord.notes?.trim() || null,
    }).eq('id', editRecord.id)
    if (error) showToast('Failed to update', 'error')
    else { showToast('Updated', 'success'); setEditRecord(null); onRefresh() }
    setEditSaving(false)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    await supabase.from('bad_debt_contacts').delete().eq('id', confirmDelete.id)
    showToast('Deleted', 'success')
    setConfirmDelete(null)
    onRefresh()
  }

  const parseRows = (rows: any[][]): Omit<BadDebtRecord, 'id' | 'created_at'>[] =>
    rows.filter(r => r[0]?.toString().trim()).map(r => ({
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
      const wb = XLSX.read(new Uint8Array(ev.target?.result as ArrayBuffer), { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      const first = rows[0]?.[0]?.toString().toLowerCase() || ''
      setBulkPreview(parseRows(first.includes('name') ? rows.slice(1) : rows))
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const handleBulkSave = async () => {
    setBulkSaving(true)
    const { error } = await supabase.from('bad_debt_contacts').insert(
      bulkPreview.map(r => ({ ...r, created_by: staff?.name || 'System' }))
    )
    if (error) showToast('Failed', 'error')
    else { showToast(`${bulkPreview.length} records saved`, 'success'); setBulkPreview([]); setShowBulk(false); onRefresh() }
    setBulkSaving(false)
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
          <span className="text-xs text-red-600 font-medium">Total Owed</span>
          <span className="text-sm font-bold text-red-600">KES {totalOwed.toLocaleString()}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or phone..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary" />
        </div>
        <button onClick={() => { setShowBulk(false); setShowForm(f => !f) }}
          className="flex items-center gap-1.5 px-3 py-2 border border-nestalk-primary text-nestalk-primary text-sm rounded-lg hover:bg-nestalk-primary/10">
          <Plus className="w-4 h-4" /> Add Single
        </button>
        <button onClick={() => { setShowForm(false); setShowBulk(b => !b) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-nestalk-primary text-white text-sm rounded-lg hover:bg-nestalk-primary/90">
          <FileSpreadsheet className="w-4 h-4" /> Bulk Upload
        </button>
      </div>

      {/* Add Single */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-700">New Record</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500 mb-1 block">Full Name *</label>
              <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary" placeholder="Jane Doe" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Phone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary" placeholder="0712345678" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Total Fee (KES)</label>
              <input type="number" value={form.total_fee} onChange={e => setForm(f => ({ ...f, total_fee: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary" placeholder="5000" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Amount Paid (KES)</label>
              <input type="number" value={form.amount_paid} onChange={e => setForm(f => ({ ...f, amount_paid: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary" placeholder="0" /></div>
            <div className="col-span-2"><label className="text-xs text-gray-500 mb-1 block">Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary" placeholder="Optional" /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={formSaving || !form.full_name.trim()}
              className="px-4 py-2 bg-nestalk-primary text-white text-sm rounded-lg hover:bg-nestalk-primary/90 disabled:opacity-50">
              {formSaving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => { setShowForm(false); setForm({ full_name: '', phone: '', total_fee: '', amount_paid: '', notes: '' }) }}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white">Cancel</button>
          </div>
        </div>
      )}

      {/* Bulk Upload */}
      {showBulk && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-0.5">Upload Excel or CSV</p>
              <p className="text-xs text-gray-400">Columns: <span className="font-mono">Name | Phone | Total Fee | Amount Paid | Notes</span></p>
              <p className="text-xs text-gray-400">Header row auto-detected and skipped.</p>
            </div>
            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-sm px-3 py-2 bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 shrink-0">
              <Upload className="w-4 h-4" /> Choose File
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
          </div>
          {bulkPreview.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-600">{bulkPreview.length} rows — preview:</p>
              <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-lg bg-white divide-y divide-gray-100">
                <div className="grid grid-cols-5 gap-2 px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-500">
                  <span>Name</span><span>Phone</span><span>Total Fee</span><span>Paid</span><span>Owed</span>
                </div>
                {bulkPreview.slice(0, 20).map((r, i) => (
                  <div key={i} className="grid grid-cols-5 gap-2 px-3 py-2 text-xs">
                    <span className="font-medium text-gray-800 truncate">{r.full_name}</span>
                    <span className="font-mono text-gray-500 truncate">{r.phone || '—'}</span>
                    <span className="text-gray-600">{r.total_fee?.toLocaleString() ?? '—'}</span>
                    <span className="text-gray-600">{r.amount_paid?.toLocaleString() ?? '—'}</span>
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
            <button onClick={() => setShowBulk(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white">Cancel</button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Phone</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Total Fee</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Amount Paid</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-red-600">Amount Owed</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Notes</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">No records found</td></tr>
              ) : filtered.map((r, i) => {
                const owed = (r.total_fee ?? 0) - (r.amount_paid ?? 0)
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.full_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.phone || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-600">{r.total_fee?.toLocaleString() ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-600">{r.amount_paid?.toLocaleString() ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-red-600">{r.total_fee != null ? owed.toLocaleString() : <span className="text-gray-300 font-normal">—</span>}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate">{r.notes || ''}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditRecord({ ...r })} title="Edit"
                          className="text-xs text-gray-400 hover:text-blue-600 transition-colors px-2 py-1 rounded hover:bg-blue-50">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirmDelete({ id: r.id, name: r.full_name })} title="Delete"
                          className="text-xs text-gray-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50">
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

      {/* Edit Modal */}
      {editRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Edit Record</p>
              <button onClick={() => setEditRecord(null)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs font-medium text-gray-600 mb-1 block">Full Name</label>
                <input value={editRecord.full_name} onChange={e => setEditRecord(r => r ? { ...r, full_name: e.target.value } : r)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary" /></div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Phone</label>
                <input value={editRecord.phone || ''} onChange={e => setEditRecord(r => r ? { ...r, phone: e.target.value } : r)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-nestalk-primary" /></div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Total Fee</label>
                <input type="number" value={editRecord.total_fee ?? ''} onChange={e => setEditRecord(r => r ? { ...r, total_fee: parseFloat(e.target.value) || null } : r)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary" /></div>
              <div><label className="text-xs font-medium text-gray-600 mb-1 block">Amount Paid</label>
                <input type="number" value={editRecord.amount_paid ?? ''} onChange={e => setEditRecord(r => r ? { ...r, amount_paid: parseFloat(e.target.value) || null } : r)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary" /></div>
              <div className="col-span-2"><label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
                <input value={editRecord.notes || ''} onChange={e => setEditRecord(r => r ? { ...r, notes: e.target.value } : r)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary" /></div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditRecord(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleUpdate} disabled={editSaving || !editRecord.full_name.trim()}
                className="px-4 py-2 text-sm bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90 disabled:opacity-50">
                {editSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4">
            <p className="text-sm font-semibold text-gray-900">Delete record?</p>
            <p className="text-sm text-gray-500">This will permanently remove <span className="font-medium">{confirmDelete.name}</span>.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SMS Tab ──────────────────────────────────────────────────────────────────

function SmsTab({ records }: { records: BadDebtRecord[] }) {
  const { staff } = useAuth()
  const { showToast } = useToast()

  // Templates management
  const [templates, setTemplates] = useState<SmsTemplate[]>(DEFAULT_TEMPLATES)
  const [editTpl, setEditTpl] = useState<SmsTemplate | null>(null)
  const [previewTpl, setPreviewTpl] = useState<SmsTemplate | null>(null)
  const [previewRecord, setPreviewRecord] = useState<BadDebtRecord | null>(null)

  // Send state
  const [selectedTpl, setSelectedTpl] = useState<string>(DEFAULT_TEMPLATES[0].id)
  const [customMsg, setCustomMsg] = useState(DEFAULT_TEMPLATES[0].message)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [sendLog, setSendLog] = useState<{ name: string; phone: string; status: 'sent' | 'failed'; error?: string }[]>([])
  const [singleTarget, setSingleTarget] = useState<BadDebtRecord | null>(null)
  const [singleMsg, setSingleMsg] = useState('')
  const [singleTpl, setSingleTpl] = useState(DEFAULT_TEMPLATES[0].id)
  const [singleSending, setSingleSending] = useState(false)

  const withPhone = records.filter(r => r.phone)
  const filteredRecords = withPhone.filter(r =>
    !search || r.full_name.toLowerCase().includes(search.toLowerCase()) || (r.phone || '').includes(search)
  )

  const selectedRecords = filteredRecords.filter(r => selectedIds.has(r.id))

  const getTpl = (id: string) => templates.find(t => t.id === id)

  const handleTplChange = (id: string) => {
    setSelectedTpl(id)
    const tpl = getTpl(id)
    if (tpl) setCustomMsg(tpl.message)
  }

  // Edit template
  const saveTemplate = () => {
    if (!editTpl) return
    setTemplates(prev => prev.map(t => t.id === editTpl.id ? editTpl : t))
    setEditTpl(null)
    showToast('Template updated', 'success')
  }

  // Bulk send
  const handleBulkSend = async () => {
    if (!selectedRecords.length) return
    setSending(true)
    const log: typeof sendLog = []
    for (const r of selectedRecords) {
      const msg = applyVars(customMsg, r)
      const phone = formatPhone(r.phone!)
      const result = await smsService.sendSMS({
        recipientType: 'client', recipientId: r.id, recipientName: r.full_name,
        phoneNumber: phone, messageType: 'broadcast', messageContent: msg, sentBy: staff?.id || '',
      })
      log.push({ name: r.full_name, phone, status: result.success ? 'sent' : 'failed', error: result.error })
    }
    setSendLog(log)
    const sent = log.filter(l => l.status === 'sent').length
    showToast(`Sent ${sent}/${log.length}`, sent > 0 ? 'success' : 'error')
    setSending(false)
  }

  // Single send
  const openSingle = (r: BadDebtRecord) => {
    setSingleTarget(r)
    setSingleTpl(DEFAULT_TEMPLATES[0].id)
    setSingleMsg(applyVars(getTpl(DEFAULT_TEMPLATES[0].id)?.message || '', r))
  }

  const handleSingleTplChange = (id: string) => {
    setSingleTpl(id)
    if (singleTarget) setSingleMsg(applyVars(getTpl(id)?.message || '', singleTarget))
  }

  const handleSingleSend = async () => {
    if (!singleTarget || !singleMsg.trim() || !singleTarget.phone) return
    setSingleSending(true)
    const phone = formatPhone(singleTarget.phone)
    const result = await smsService.sendSMS({
      recipientType: 'client', recipientId: singleTarget.id, recipientName: singleTarget.full_name,
      phoneNumber: phone, messageType: 'broadcast', messageContent: singleMsg, sentBy: staff?.id || '',
    })
    showToast(result.success ? 'SMS sent' : `Failed: ${result.error}`, result.success ? 'success' : 'error')
    setSingleSending(false)
  }

  return (
    <div className="space-y-6">
      {/* ── Templates Section ─────────────────────────────────────────── */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">SMS Templates</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {templates.map(t => (
            <div key={t.id} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">{t.label}</span>
                <div className="flex gap-1">
                  <button onClick={() => { setPreviewTpl(t); setPreviewRecord(withPhone[0] || null) }}
                    className="text-xs text-gray-400 hover:text-nestalk-primary px-2 py-0.5 rounded hover:bg-blue-50">Preview</button>
                  <button onClick={() => setEditTpl({ ...t })}
                    className="text-xs text-gray-400 hover:text-blue-600 px-2 py-0.5 rounded hover:bg-blue-50">
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 line-clamp-3">{t.message}</p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{t.message.length} chars · {Math.ceil(t.message.length / 160)} SMS unit{Math.ceil(t.message.length / 160) !== 1 ? 's' : ''}</span>
                <span className="font-mono bg-gray-100 rounded px-1">{'{name}'} {'{owed}'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Compose & Send ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: compose */}
        <div className="space-y-4">
          <p className="text-sm font-semibold text-gray-700">Compose Message</p>

          {/* Template picker */}
          <div className="grid grid-cols-2 gap-2">
            {templates.map(t => (
              <button key={t.id} onClick={() => handleTplChange(t.id)}
                className={`px-3 py-2 text-xs rounded-lg border text-left transition-colors ${selectedTpl === t.id ? 'border-nestalk-primary bg-nestalk-primary/5 text-nestalk-primary font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Message editor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-600">Message</span>
              <span className={`text-xs ${customMsg.length > 320 ? 'text-red-500' : customMsg.length > 160 ? 'text-orange-500' : 'text-gray-400'}`}>
                {customMsg.length} chars · {Math.ceil(customMsg.length / 160)} SMS
              </span>
            </div>
            <textarea value={customMsg} onChange={e => setCustomMsg(e.target.value)} rows={6}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary" />
            <p className="text-xs text-gray-400 mt-1">Variables: <span className="font-mono">{'{name}'} {'{fullname}'} {'{owed}'} {'{total}'} {'{paid}'}</span></p>
          </div>

          {/* Bulk send log */}
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
        </div>

        {/* Right: recipient selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Recipients <span className="text-gray-400 font-normal text-xs">({selectedIds.size} selected)</span></p>
            <button onClick={() => setSelectedIds(
              selectedIds.size === filteredRecords.length ? new Set() : new Set(filteredRecords.map(r => r.id))
            )} className="text-xs text-nestalk-primary underline">
              {selectedIds.size === filteredRecords.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary" />
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
            {filteredRecords.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-6">No contacts with phone numbers</div>
            ) : filteredRecords.map(r => {
              const owed = ((r.total_fee ?? 0) - (r.amount_paid ?? 0))
              return (
                <div key={r.id} className={`flex items-center justify-between px-3 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 ${selectedIds.has(r.id) ? 'bg-nestalk-primary/5' : ''}`}>
                  <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => {
                    const next = new Set(selectedIds); next.has(r.id) ? next.delete(r.id) : next.add(r.id); setSelectedIds(next)
                  }}>
                    <div className={`w-3.5 h-3.5 rounded border-2 flex-shrink-0 ${selectedIds.has(r.id) ? 'border-nestalk-primary bg-nestalk-primary' : 'border-gray-300'}`} />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{r.full_name}</div>
                      <div className="text-xs font-mono text-gray-400">{r.phone}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-red-600">KES {owed.toLocaleString()}</span>
                    <button onClick={() => openSingle(r)} title="Send single SMS"
                      className="text-gray-400 hover:text-orange-600 transition-colors p-1 rounded hover:bg-orange-50">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <button onClick={handleBulkSend} disabled={sending || selectedIds.size === 0 || !customMsg.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm font-medium">
            {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send to {selectedIds.size} Recipient{selectedIds.size !== 1 ? 's' : ''}</>}
          </button>
        </div>
      </div>

      {/* Edit Template Modal */}
      {editTpl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Edit Template</p>
              <button onClick={() => setEditTpl(null)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Label</label>
              <input value={editTpl.label} onChange={e => setEditTpl(t => t ? { ...t, label: e.target.value } : t)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-600">Message</label>
                <span className={`text-xs ${editTpl.message.length > 320 ? 'text-red-500' : editTpl.message.length > 160 ? 'text-orange-500' : 'text-gray-400'}`}>
                  {editTpl.message.length} chars · {Math.ceil(editTpl.message.length / 160)} SMS
                </span>
              </div>
              <textarea value={editTpl.message} onChange={e => setEditTpl(t => t ? { ...t, message: e.target.value } : t)}
                rows={6} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary" />
              <p className="text-xs text-gray-400 mt-1">Variables: <span className="font-mono">{'{name}'} {'{fullname}'} {'{owed}'} {'{total}'} {'{paid}'}</span></p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditTpl(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={saveTemplate} className="px-4 py-2 text-sm bg-nestalk-primary text-white rounded-lg hover:bg-nestalk-primary/90">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Template Modal */}
      {previewTpl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Preview — {previewTpl.label}</p>
              <button onClick={() => setPreviewTpl(null)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            {previewRecord ? (
              <div className="space-y-3">
                <div className="text-xs text-gray-500 mb-1">Previewing for: <span className="font-semibold text-gray-700">{previewRecord.full_name}</span></div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-800">
                  {applyVars(previewTpl.message, previewRecord)}
                </div>
                <div className="text-xs text-gray-400">{applyVars(previewTpl.message, previewRecord).length} chars · {Math.ceil(applyVars(previewTpl.message, previewRecord).length / 160)} SMS</div>
                {/* record picker */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Preview for different person</label>
                  <select value={previewRecord.id} onChange={e => setPreviewRecord(records.find(r => r.id === e.target.value) || null)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary">
                    {withPhone.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
                  </select>
                </div>
              </div>
            ) : <p className="text-sm text-gray-400">No contacts with phone numbers to preview.</p>}
            <div className="flex justify-end">
              <button onClick={() => setPreviewTpl(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Single SMS Modal */}
      {singleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Send SMS</p>
                <p className="text-xs text-gray-400">To: {singleTarget.full_name} · {singleTarget.phone}</p>
              </div>
              <button onClick={() => setSingleTarget(null)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {templates.map(t => (
                <button key={t.id} onClick={() => handleSingleTplChange(t.id)}
                  className={`px-3 py-2 text-xs rounded-lg border text-left transition-colors ${singleTpl === t.id ? 'border-nestalk-primary bg-nestalk-primary/5 text-nestalk-primary font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-600">Message</span>
                <span className={`text-xs ${singleMsg.length > 320 ? 'text-red-500' : singleMsg.length > 160 ? 'text-orange-500' : 'text-gray-400'}`}>
                  {singleMsg.length} chars · {Math.ceil(singleMsg.length / 160)} SMS
                </span>
              </div>
              <textarea value={singleMsg} onChange={e => setSingleMsg(e.target.value)} rows={6}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setSingleTarget(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
              <button onClick={handleSingleSend} disabled={singleSending || !singleMsg.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50">
                {singleSending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function BadDebt() {
  const [tab, setTab] = useState<'profiles' | 'sms'>('profiles')
  const [records, setRecords] = useState<BadDebtRecord[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('bad_debt_contacts').select('*').order('full_name')
    setRecords(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Bad Debt</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track outstanding balances and send recovery notices</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { id: 'profiles', label: 'Profiles', icon: <Users className="w-4 h-4" /> },
          { id: 'sms', label: 'SMS', icon: <MessageSquare className="w-4 h-4" /> },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t.id ? 'border-nestalk-primary text-nestalk-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'profiles' && <ProfilesTab records={records} loading={loading} onRefresh={load} />}
      {tab === 'sms' && <SmsTab records={records} />}
    </div>
  )
}
