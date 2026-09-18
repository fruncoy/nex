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

interface BatchLog {
  id: string
  sent_at: string
  message: string
  sent_count: number
  failed_count: number
  recipients_count: number
  created_by: string
  records: { name: string; phone: string; status: 'sent' | 'failed' }[]
}

function SmsTab({ records }: { records: BadDebtRecord[] }) {
  const { staff } = useAuth()
  const { showToast } = useToast()

  // Compose
  const [customMsg, setCustomMsg] = useState('')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)

  // Single SMS
  const [singleTarget, setSingleTarget] = useState<BadDebtRecord | null>(null)
  const [singleMsg, setSingleMsg] = useState('')
  const [singleSending, setSingleSending] = useState(false)

  // History
  const [batches, setBatches] = useState<BatchLog[]>([])
  const [loadingBatches, setLoadingBatches] = useState(true)
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null)

  const withPhone = records.filter(r => r.phone)
  const filteredRecords = withPhone.filter(r =>
    !search || r.full_name.toLowerCase().includes(search.toLowerCase()) || (r.phone || '').includes(search)
  )
  const selectedRecords = filteredRecords.filter(r => selectedIds.has(r.id))

  useEffect(() => { loadBatches() }, [])

  const loadBatches = async () => {
    setLoadingBatches(true)
    const { data } = await supabase
      .from('sms_campaigns')
      .select('*')
      .eq('campaign_type', 'bad_debt')
      .order('created_at', { ascending: false })
      .limit(20)
    if (!data) { setBatches([]); setLoadingBatches(false); return }
    // Enrich with records
    const enriched = await Promise.all(data.map(async (c: any) => {
      const { data: recs } = await supabase
        .from('sms_records')
        .select('recipient_name, recipient_phone, status')
        .eq('campaign_id', c.id)
      return {
        id: c.id,
        sent_at: c.created_at,
        message: c.message,
        sent_count: c.sent_count || 0,
        failed_count: c.failed_count || 0,
        recipients_count: c.recipients_count || 0,
        created_by: c.created_by,
        records: (recs || []).map((r: any) => ({ name: r.recipient_name, phone: r.recipient_phone, status: r.status })),
      }
    }))
    setBatches(enriched)
    setLoadingBatches(false)
  }

  // Bulk send
  const handleBulkSend = async () => {
    if (!selectedRecords.length || !customMsg.trim()) return
    setSending(true)

    // Create campaign
    const { data: campaign } = await supabase.from('sms_campaigns').insert({
      name: `Bad Debt — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
      campaign_type: 'bad_debt',
      message: customMsg,
      recipients_count: selectedRecords.length,
      status: 'sending',
      created_by: staff?.name || 'System',
    }).select().single()

    let success = 0, failed = 0
    for (const r of selectedRecords) {
      const msg = applyVars(customMsg, r)
      const phone = formatPhone(r.phone!)
      const result = await smsService.sendSMS({
        recipientType: 'client', recipientId: r.id, recipientName: r.full_name,
        phoneNumber: phone, messageType: 'broadcast', messageContent: msg, sentBy: staff?.id || '',
      })
      if (campaign) {
        await supabase.from('sms_records').insert({
          campaign_id: campaign.id,
          recipient_name: r.full_name,
          recipient_phone: phone,
          message: msg,
          status: result.success ? 'sent' : 'failed',
          error_message: result.error || null,
        })
      }
      result.success ? success++ : failed++
    }

    if (campaign) {
      await supabase.from('sms_campaigns').update({
        status: 'completed', sent_count: success, failed_count: failed, sent_at: new Date().toISOString(),
      }).eq('id', campaign.id)
    }

    showToast(`Sent ${success}/${selectedRecords.length}`, success > 0 ? 'success' : 'error')
    setSending(false)
    loadBatches()
  }

  // Single send
  const openSingle = (r: BadDebtRecord) => {
    setSingleTarget(r)
    setSingleMsg(applyVars(customMsg, r))
  }

  const handleSingleSend = async () => {
    if (!singleTarget || !singleMsg.trim() || !singleTarget.phone) return
    setSingleSending(true)
    const phone = formatPhone(singleTarget.phone)

    const { data: campaign } = await supabase.from('sms_campaigns').insert({
      name: `Bad Debt (Single) — ${singleTarget.full_name}`,
      campaign_type: 'bad_debt',
      message: singleMsg,
      recipients_count: 1,
      status: 'sending',
      created_by: staff?.name || 'System',
    }).select().single()

    const result = await smsService.sendSMS({
      recipientType: 'client', recipientId: singleTarget.id, recipientName: singleTarget.full_name,
      phoneNumber: phone, messageType: 'broadcast', messageContent: singleMsg, sentBy: staff?.id || '',
    })

    if (campaign) {
      await supabase.from('sms_records').insert({
        campaign_id: campaign.id, recipient_name: singleTarget.full_name, recipient_phone: phone,
        message: singleMsg, status: result.success ? 'sent' : 'failed', error_message: result.error || null,
      })
      await supabase.from('sms_campaigns').update({
        status: 'completed', sent_count: result.success ? 1 : 0, failed_count: result.success ? 0 : 1, sent_at: new Date().toISOString(),
      }).eq('id', campaign.id)
    }

    showToast(result.success ? 'SMS sent' : `Failed: ${result.error}`, result.success ? 'success' : 'error')
    setSingleSending(false)
    setSingleTarget(null)
    loadBatches()
  }

  return (
    <div className="space-y-6">
      {/* ── Compose & Send ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: compose */}
        <div className="space-y-4">
          <p className="text-sm font-semibold text-gray-700">Compose Message</p>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-600">Message</span>
              <span className={`text-xs ${customMsg.length > 320 ? 'text-red-500' : customMsg.length > 160 ? 'text-orange-500' : 'text-gray-400'}`}>
                {customMsg.length} chars · {Math.ceil((customMsg.length || 1) / 160)} SMS
              </span>
            </div>
            <textarea value={customMsg} onChange={e => setCustomMsg(e.target.value)} rows={7}
              placeholder="Type your message... Use {name}, {fullname}, {owed}, {total}, {paid}"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-nestalk-primary" />
            <p className="text-xs text-gray-400 mt-1">Variables: <span className="font-mono">{'{name}'} {'{fullname}'} {'{owed}'} {'{total}'} {'{paid}'}</span></p>
          </div>
        </div>

        {/* Right: recipients */}
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-nestalk-primary" />
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
            {filteredRecords.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-6">No contacts with phone numbers</div>
            ) : filteredRecords.map(r => {
              const owed = (r.total_fee ?? 0) - (r.amount_paid ?? 0)
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

      {/* ── Send History ──────────────────────────────────────────────── */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">Send History</p>
        {loadingBatches ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : batches.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-8 border border-dashed border-gray-200 rounded-lg">No sends yet</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Batch</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Message</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Sent</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Failed</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">By</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batches.map(b => (
                  <React.Fragment key={b.id}>
                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedBatch(expandedBatch === b.id ? null : b.id)}>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">{b.recipients_count === 1 ? 'Single' : 'Bulk'} · {b.recipients_count}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[220px] truncate" title={b.message}>{b.message}</td>
                      <td className="text-center px-4 py-3 text-emerald-700 font-semibold">{b.sent_count}/{b.recipients_count}</td>
                      <td className="text-center px-4 py-3 text-red-600">{b.failed_count}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{b.created_by}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(b.sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    </tr>
                    {expandedBatch === b.id && b.records.length > 0 && (
                      <tr>
                        <td colSpan={6} className="bg-gray-50 px-6 py-4">
                          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Recipients ({b.records.length})</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
                            {b.records.map((r, i) => (
                              <div key={i} className="flex items-center justify-between bg-white border border-gray-100 rounded px-3 py-1.5 text-xs">
                                <div>
                                  <div className="font-medium text-gray-800">{r.name}</div>
                                  <div className="font-mono text-gray-400">{r.phone}</div>
                                </div>
                                <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${r.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                  {r.status === 'sent' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                  {r.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Single SMS Modal ─────────────────────────────────────────── */}
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
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-600">Message</span>
                <span className={`text-xs ${singleMsg.length > 320 ? 'text-red-500' : singleMsg.length > 160 ? 'text-orange-500' : 'text-gray-400'}`}>
                  {singleMsg.length} chars · {Math.ceil((singleMsg.length || 1) / 160)} SMS
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
