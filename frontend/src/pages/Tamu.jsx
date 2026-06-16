import React, { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Pencil, Download, Image, X, Phone, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import { api } from '../api'

const HARI_OPTIONS = ['AHAD', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU']

const WARNA_HARI = {
  AHAD:   { bg: '#7C1D1D', text: '#FFFFFF' },
  SENIN:  { bg: '#14532D', text: '#FFFFFF' },
  SELASA: { bg: '#1E3A5F', text: '#FFFFFF' },
  RABU:   { bg: '#713F12', text: '#FFFFFF' },
  KAMIS:  { bg: '#3B0764', text: '#FFFFFF' },
  JUMAT:  { bg: '#164E63', text: '#FFFFFF' },
  SABTU:  { bg: '#1E3A5F', text: '#FFFFFF' },
}
const WARNA_MAMPIR = { bg: '#854D0E', text: '#FFFFFF' }

function today() { return new Date().toISOString().split('T')[0] }
function bulanIni() { return new Date().toISOString().substring(0, 7) }

function hariFromTanggal(tanggal) {
  const d = new Date(tanggal + 'T00:00:00')
  return HARI_OPTIONS[d.getDay()]
}

function fmtTgl(t) {
  if (!t) return ''
  return new Date(t + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtTglShort(t) {
  if (!t) return ''
  const d = new Date(t + 'T00:00:00')
  return `${d.getDate()}-${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()]}`
}

// ── Generate Canvas Tabel ─────────────────────────────────────────────────────

function generateTabelCanvas(rows, dari, sampai) {
  const canvas = document.createElement('canvas')
  const scale = 2
  const W = 1500
  const ROW_H = 56
  const HEADER_H = 68
  const TITLE_H = 68
  const FOOTER_H = 52
  const totalH = TITLE_H + HEADER_H + rows.length * ROW_H + FOOTER_H + 16

  canvas.width = W * scale
  canvas.height = totalH * scale
  canvas.style.width = W + 'px'
  canvas.style.height = totalH + 'px'

  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)

  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, W, totalH)

  // Title
  const grad = ctx.createLinearGradient(0, 0, W, 0)
  grad.addColorStop(0, '#0F172A')
  grad.addColorStop(0.5, '#1E3A5F')
  grad.addColorStop(1, '#0F172A')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, TITLE_H)

  ctx.fillStyle = '#F8FAFC'
  ctx.font = 'bold 28px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('JADWAL TAMU MANAJEMEN MASJID JOGOKARIYAN', W / 2, 32)
  ctx.fillStyle = '#64748B'
  ctx.font = '16px Arial'
  const periode = dari && sampai ? `Periode: ${fmtTgl(dari)}  —  ${fmtTgl(sampai)}` : ''
  ctx.fillText(periode, W / 2, 56)

  // Kolom — tanpa Ruangan dan CP/WA
  const cols = [
    { label: 'HARI',       w: 120 },
    { label: 'TGL',        w: 100 },
    { label: 'JAM',        w: 80  },
    { label: 'ROMBONGAN',  w: 720 },
    { label: 'JML',        w: 80  },
    { label: 'KETERANGAN', w: 220 },
    { label: 'PEMATERI',   w: 180 },
  ]
  let xAcc = 0
  cols.forEach(c => { c.x = xAcc; xAcc += c.w })

  // Header
  const hy = TITLE_H
  ctx.fillStyle = '#1E293B'
  ctx.fillRect(0, hy, W, HEADER_H)

  ctx.fillStyle = '#E2E8F0'
  ctx.font = 'bold 16px Arial'
  ctx.textAlign = 'center'
  cols.forEach(c => {
    ctx.fillText(c.label, c.x + c.w / 2, hy + HEADER_H / 2 + 6)
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 0.8
    ctx.beginPath(); ctx.moveTo(c.x, hy); ctx.lineTo(c.x, hy + HEADER_H); ctx.stroke()
  })

  // Rows
  let totalJml = 0
  rows.forEach((row, i) => {
    const y = TITLE_H + HEADER_H + i * ROW_H
    const isMampir = row.keterangan.toUpperCase() !== 'STUDI BANDING'
    const warna = isMampir ? WARNA_MAMPIR : (WARNA_HARI[row.hari] || WARNA_HARI.SENIN)

    ctx.fillStyle = warna.bg
    ctx.fillRect(0, y, W, ROW_H)
    // subtle lighter stripe top half
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fillRect(0, y, W, ROW_H / 2)

    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, y + ROW_H); ctx.lineTo(W, y + ROW_H); ctx.stroke()

    const vals = [
      row.hari,
      fmtTglShort(row.tanggal),
      row.jam,
      row.rombongan,
      row.jumlah > 0 ? String(row.jumlah) : '',
      row.keterangan,
      row.pemateri || '',
    ]

    ctx.fillStyle = warna.text
    ctx.textAlign = 'center'

    vals.forEach((val, ci) => {
      const c = cols[ci]
      const leftAlign = [3, 6].includes(ci)
      if (leftAlign) {
        ctx.textAlign = 'left'
        ctx.font = ci === 3 ? 'bold 16px Arial' : '15px Arial'
        let txt = val
        const maxW = c.w - 14
        while (ctx.measureText(txt).width > maxW && txt.length > 1) txt = txt.slice(0, -1)
        if (txt !== val) txt += '…'
        ctx.fillText(txt, c.x + 8, y + ROW_H / 2 + 5)
        ctx.textAlign = 'center'
        ctx.font = 'bold 12px Arial'
      } else {
        ctx.font = 'bold 16px Arial'
        ctx.fillText(val, c.x + c.w / 2, y + ROW_H / 2 + 6)
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'
      ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(c.x, y); ctx.lineTo(c.x, y + ROW_H); ctx.stroke()
    })
    totalJml += (row.jumlah || 0)
  })

  // Footer
  const fy = TITLE_H + HEADER_H + rows.length * ROW_H
  const fGrad = ctx.createLinearGradient(0, fy, W, fy)
  fGrad.addColorStop(0, '#0F172A'); fGrad.addColorStop(1, '#1E3A5F')
  ctx.fillStyle = fGrad
  ctx.fillRect(0, fy, W, FOOTER_H)

  ctx.fillStyle = '#94A3B8'; ctx.font = '14px Arial'; ctx.textAlign = 'left'
  ctx.fillText(`Total rombongan: ${rows.length}`, 16, fy + FOOTER_H / 2 + 5)
  ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center'
  ctx.fillText(`TOTAL JAMAAH: ${totalJml.toLocaleString('id-ID')}`, W / 2, fy + FOOTER_H / 2 + 5)
  ctx.fillStyle = '#475569'; ctx.font = '13px Arial'; ctx.textAlign = 'right'
  ctx.fillText('Manajemen Masjid Jogokariyan', W - 16, fy + FOOTER_H / 2 + 5)

  return canvas
}

// ── Export Excel ──────────────────────────────────────────────────────────────

function exportExcel(rows, dari, sampai) {
  const periodeLabel = dari && sampai
    ? `${fmtTgl(dari)} s/d ${fmtTgl(sampai)}`
    : 'Semua Data'

  const header = ['No', 'Hari', 'Tanggal', 'Jam', 'Rombongan / Instansi', 'Ruangan', 'Jumlah', 'Keterangan', 'Pemateri', 'Nama CP', 'No WA CP', 'Catatan']
  const data = rows.map((r, i) => [
    i + 1,
    r.hari,
    fmtTgl(r.tanggal),
    r.jam,
    r.rombongan,
    r.ruangan_name ? `${r.ruangan_name}${r.ruangan_lantai ? ' (Lt ' + r.ruangan_lantai + ')' : ''}` : '',
    r.jumlah || 0,
    r.keterangan,
    r.pemateri || '',
    r.cp_nama || '',
    r.cp_wa || '',
    r.catatan || '',
  ])

  const totalRow = ['', '', '', '', 'TOTAL', '', rows.reduce((s, r) => s + (r.jumlah || 0), 0), '', '', '', '', '']

  const wb = XLSX.utils.book_new()
  const wsData = [
    [`JADWAL TAMU MANAJEMEN MASJID JOGOKARIYAN`],
    [`Periode: ${periodeLabel}`],
    [],
    header,
    ...data,
    [],
    totalRow,
  ]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Lebar kolom
  ws['!cols'] = [
    { wch: 4 }, { wch: 9 }, { wch: 18 }, { wch: 7 },
    { wch: 50 }, { wch: 25 }, { wch: 8 }, { wch: 16 },
    { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 25 },
  ]

  // Merge title
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Jadwal Tamu')
  const filename = `jadwal-tamu-${dari || 'semua'}-${sampai || ''}.xlsx`
  XLSX.writeFile(wb, filename)
}

// ── Komponen utama ────────────────────────────────────────────────────────────

const FORM_INIT = {
  hari: 'AHAD', tanggal: today(), jam: '09:00',
  rombongan: '', jumlah: '', keterangan: 'STUDI BANDING',
  pemateri: '', ruangan_id: '', cp_nama: '', cp_wa: '', catatan: ''
}

export default function Tamu() {
  const [rows, setRows] = useState([])
  const [ruangan, setRuangan] = useState([])
  const [bulan, setBulan] = useState(bulanIni())
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(FORM_INIT)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  // Generate / Export modal
  const [genModal, setGenModal] = useState(false)
  const [genDari, setGenDari] = useState('')
  const [genSampai, setGenSampai] = useState('')
  const [genSemua, setGenSemua] = useState(false)
  const [genRows, setGenRows] = useState([])
  const [genLoading, setGenLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [activeTab, setActiveTab] = useState('gambar') // 'gambar' | 'excel'

  function load() { api.getTamu({ bulan }).then(setRows).catch(console.error) }

  useEffect(() => { load() }, [bulan])
  useEffect(() => {
    api.getRuangan().then(setRuangan).catch(console.error)
  }, [])

  function openAdd() {
    setEditId(null); setForm({ ...FORM_INIT, tanggal: today() }); setErr(''); setModal(true)
  }

  function openEdit(row) {
    setEditId(row.id)
    setForm({
      hari: row.hari, tanggal: row.tanggal, jam: row.jam,
      rombongan: row.rombongan, jumlah: String(row.jumlah || ''),
      keterangan: row.keterangan, pemateri: row.pemateri || '',
      ruangan_id: row.ruangan_id || '',
      cp_nama: row.cp_nama || '', cp_wa: row.cp_wa || '', catatan: row.catatan || ''
    })
    setErr(''); setModal(true)
  }

  function setF(k, v) {
    setForm(f => {
      const next = { ...f, [k]: v }
      if (k === 'tanggal' && v) next.hari = hariFromTanggal(v)
      return next
    })
  }

  async function save() {
    if (!form.rombongan.trim()) { setErr('Nama rombongan wajib diisi'); return }
    setSaving(true); setErr('')
    try {
      const payload = { ...form, jumlah: parseInt(form.jumlah) || 0 }
      if (editId) await api.updateTamu(editId, payload)
      else await api.createTamu(payload)
      setModal(false); load()
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  async function hapus(id) {
    if (!confirm('Hapus data tamu ini?')) return
    await api.deleteTamu(id); load()
  }

  function bukaGenerate() {
    const firstDay = bulan + '-01'
    const lastDay = bulan + '-' + new Date(parseInt(bulan.split('-')[0]), parseInt(bulan.split('-')[1]), 0).getDate()
    setGenDari(firstDay); setGenSampai(lastDay)
    setGenSemua(false); setGenRows([]); setPreviewUrl(null)
    setActiveTab('gambar'); setGenModal(true)
  }

  async function fetchGenRows() {
    setGenLoading(true); setPreviewUrl(null); setGenRows([])
    try {
      const params = genSemua ? {} : { dari: genDari, sampai: genSampai }
      const data = await api.getTamu(params)
      setGenRows(data)
      if (activeTab === 'gambar' && data.length > 0) {
        setTimeout(() => {
          const canvas = generateTabelCanvas(data, genSemua ? null : genDari, genSemua ? null : genSampai)
          setPreviewUrl(canvas.toDataURL('image/png'))
          setGenLoading(false)
        }, 80)
      } else {
        setGenLoading(false)
      }
    } catch { setGenLoading(false) }
  }

  function downloadGambar() {
    if (!previewUrl) return
    const a = document.createElement('a')
    a.href = previewUrl
    a.download = `jadwal-tamu-${genSemua ? 'semua' : genDari + '-sd-' + genSampai}.png`
    a.click()
  }

  function downloadExcel() {
    if (!genRows.length) return
    exportExcel(genRows, genSemua ? null : genDari, genSemua ? null : genSampai)
  }

  // Grouped per tanggal
  const grouped = rows.reduce((acc, r) => {
    if (!acc[r.tanggal]) acc[r.tanggal] = []
    acc[r.tanggal].push(r); return acc
  }, {})

  // Ruangan grouped per lantai untuk select
  const ruanganByLantai = [1, 2, 3].map(lt => ({
    lantai: lt,
    rooms: ruangan.filter(r => r.lantai === lt)
  }))

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Tamu Masjid</h1>
          <p className="text-xs text-gray-400 mt-0.5">Data kunjungan & jadwal studi banding</p>
        </div>
        <div className="flex gap-2 items-center">
          <input type="month" className="input text-sm" value={bulan}
            onChange={e => setBulan(e.target.value)} style={{ width: 'auto' }} />
          <button className="btn" onClick={bukaGenerate}>
            <Image size={14} /> Export / Generate
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={14} /> Tambah Tamu
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(WARNA_HARI).map(([hari, w]) => (
          <span key={hari} className="text-xs px-2.5 py-1 rounded-full font-medium text-white"
            style={{ background: w.bg }}>{hari}</span>
        ))}
        <span className="text-xs px-2.5 py-1 rounded-full font-medium text-white"
          style={{ background: WARNA_MAMPIR.bg }}>MAMPIR / LAINNYA</span>
      </div>

      {/* List */}
      {Object.keys(grouped).length === 0 && (
        <p className="text-sm text-gray-400 py-10 text-center">Belum ada data tamu bulan ini.</p>
      )}

      {Object.keys(grouped).sort().map(tgl => {
        const dayRows = grouped[tgl]
        const hari = dayRows[0].hari
        const wHari = WARNA_HARI[hari] || WARNA_HARI.SENIN
        return (
          <div key={tgl} className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-xs font-bold text-white px-3 py-1 rounded-full"
                style={{ background: wHari.bg }}>
                {hari}, {fmtTgl(tgl)}
              </div>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <div className="space-y-2">
              {dayRows.map(row => {
                const isMampir = row.keterangan.toUpperCase() !== 'STUDI BANDING'
                const w = isMampir ? WARNA_MAMPIR : wHari
                return (
                  <div key={row.id} className="rounded-xl overflow-hidden border border-gray-100 flex">
                    <div className="w-1.5 flex-shrink-0" style={{ background: w.bg }} />
                    <div className="flex-1 bg-white p-3 flex items-start gap-3">
                      <div className="w-14 flex-shrink-0 text-center pt-0.5">
                        <p className="text-sm font-bold text-gray-800">{row.jam}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 leading-snug">{row.rombongan}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {row.jumlah > 0 && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {row.jumlah} orang
                            </span>
                          )}
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                            style={{ background: w.bg }}>
                            {row.keterangan}
                          </span>
                          {row.ruangan_name && (
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                              📍 {row.ruangan_name} {row.ruangan_lantai ? `(Lt ${row.ruangan_lantai})` : ''}
                            </span>
                          )}
                          {row.pemateri && (
                            <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                              🎤 {row.pemateri}
                            </span>
                          )}
                        </div>
                        {(row.cp_nama || row.cp_wa) && (
                          <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                            <Phone size={10} />
                            {[row.cp_nama, row.cp_wa].filter(Boolean).join(' — ')}
                          </p>
                        )}
                        {row.catatan && (
                          <p className="text-xs text-gray-400 mt-0.5 italic">{row.catatan}</p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button className="btn hover:bg-blue-50 hover:text-blue-600" onClick={() => openEdit(row)}>
                          <Pencil size={12} />
                        </button>
                        <button className="btn hover:bg-red-50 hover:text-red-500" onClick={() => hapus(row.id)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* ── Modal Tambah/Edit ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800">{editId ? 'Edit' : 'Tambah'} Data Tamu</h3>
              <button className="btn" onClick={() => setModal(false)}><X size={14} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Tanggal</label>
                  <input type="date" className="input" value={form.tanggal}
                    onChange={e => setF('tanggal', e.target.value)} />
                </div>
                <div>
                  <label className="label">Hari (otomatis)</label>
                  <select className="input" value={form.hari} onChange={e => setF('hari', e.target.value)}>
                    {HARI_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Nama Rombongan / Instansi *</label>
                <input className="input" placeholder="Masjid Al-Ikhlas Kota X..." value={form.rombongan}
                  onChange={e => setF('rombongan', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Jam</label>
                  <input type="time" className="input" value={form.jam}
                    onChange={e => setF('jam', e.target.value)} />
                </div>
                <div>
                  <label className="label">Jumlah Tamu</label>
                  <input type="number" className="input" placeholder="0" value={form.jumlah}
                    onChange={e => setF('jumlah', e.target.value)} min="0" />
                </div>
              </div>
              <div>
                <label className="label">Keterangan</label>
                <input className="input" placeholder="STUDI BANDING / SUBUHAN / dll"
                  value={form.keterangan} onChange={e => setF('keterangan', e.target.value)} />
                <p className="text-[10px] text-gray-400 mt-1">
                  Selain "STUDI BANDING" → baris berwarna kuning/coklat di tabel
                </p>
              </div>
              <div>
                <label className="label">Ruangan yang Digunakan</label>
                <select className="input" value={form.ruangan_id} onChange={e => setF('ruangan_id', e.target.value)}>
                  <option value="">— Belum ditentukan —</option>
                  {ruanganByLantai.map(lt => (
                    <optgroup key={lt.lantai} label={`Lantai ${lt.lantai}`}>
                      {lt.rooms.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Pemateri / Pengurus yang Menemui</label>
                <input className="input" placeholder="Nama pengurus..." value={form.pemateri}
                  onChange={e => setF('pemateri', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nama CP</label>
                  <input className="input" placeholder="Nama kontak..." value={form.cp_nama}
                    onChange={e => setF('cp_nama', e.target.value)} />
                </div>
                <div>
                  <label className="label">No. WA CP</label>
                  <input className="input" placeholder="08xxx..." value={form.cp_wa}
                    onChange={e => setF('cp_wa', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Catatan tambahan</label>
                <textarea className="input" rows={2} value={form.catatan}
                  onChange={e => setF('catatan', e.target.value)} />
              </div>
              {err && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button className="btn" onClick={() => setModal(false)}>Batal</button>
                <button className="btn btn-primary" onClick={save} disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Generate / Export ── */}
      {genModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-4xl max-h-[92vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800">Export Data Tamu</h3>
              <button className="btn" onClick={() => { setGenModal(false); setPreviewUrl(null) }}>
                <X size={14} />
              </button>
            </div>

            {/* Tab */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => { setActiveTab('gambar'); setPreviewUrl(null); setGenRows([]) }}
                className={`btn ${activeTab === 'gambar' ? 'btn-primary' : ''}`}>
                <Image size={13} /> Gambar (PNG)
              </button>
              <button onClick={() => { setActiveTab('excel'); setPreviewUrl(null); setGenRows([]) }}
                className={`btn ${activeTab === 'excel' ? 'btn-primary' : ''}`}>
                <FileSpreadsheet size={13} /> Excel (XLSX)
              </button>
            </div>

            {/* Filter rentang */}
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={genSemua} onChange={e => setGenSemua(e.target.checked)} className="w-4 h-4 accent-masjid-400" />
                  Semua data
                </label>
                {!genSemua && (
                  <>
                    <div className="flex items-center gap-2">
                      <label className="label mb-0 whitespace-nowrap">Dari</label>
                      <input type="date" className="input text-sm" value={genDari}
                        onChange={e => setGenDari(e.target.value)} style={{ width: 'auto' }} />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="label mb-0 whitespace-nowrap">Sampai</label>
                      <input type="date" className="input text-sm" value={genSampai}
                        onChange={e => setGenSampai(e.target.value)} style={{ width: 'auto' }} />
                    </div>
                  </>
                )}
                <button className="btn btn-primary ml-auto" onClick={fetchGenRows} disabled={genLoading}>
                  {genLoading ? 'Memuat...' : 'Tampilkan'}
                </button>
              </div>
            </div>

            {/* Preview area */}
            <div className="flex-1 overflow-auto bg-gray-50 rounded-xl p-4 min-h-[180px] flex items-center justify-center">
              {genLoading && <p className="text-sm text-gray-400">Sedang memproses data...</p>}
              {!genLoading && genRows.length === 0 && !previewUrl && (
                <p className="text-sm text-gray-400">Pilih rentang tanggal lalu klik "Tampilkan"</p>
              )}
              {!genLoading && genRows.length === 0 && previewUrl === null && genRows !== [] && (
                <p className="text-sm text-gray-400">Tidak ada data pada periode ini.</p>
              )}
              {activeTab === 'gambar' && !genLoading && previewUrl && (
                <img src={previewUrl} alt="Preview tabel jadwal tamu" className="max-w-full rounded-lg shadow" />
              )}
              {activeTab === 'excel' && !genLoading && genRows.length > 0 && (
                <div className="text-center">
                  <FileSpreadsheet size={48} className="mx-auto text-green-500 mb-3" />
                  <p className="text-sm font-semibold text-gray-700">{genRows.length} rombongan siap diexport</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Total jamaah: {genRows.reduce((s, r) => s + (r.jumlah || 0), 0).toLocaleString('id-ID')}
                  </p>
                </div>
              )}
            </div>

            {/* Footer action */}
            {!genLoading && genRows.length > 0 && (
              <div className="mt-3 flex justify-between items-center">
                <p className="text-xs text-gray-400">
                  {genRows.length} rombongan · {genRows.reduce((s, r) => s + (r.jumlah || 0), 0).toLocaleString('id-ID')} jamaah
                </p>
                {activeTab === 'gambar' && previewUrl && (
                  <button className="btn btn-primary" onClick={downloadGambar}>
                    <Download size={14} /> Download PNG
                  </button>
                )}
                {activeTab === 'excel' && (
                  <button className="btn btn-primary" onClick={downloadExcel}
                    style={{ background: '#16A34A', borderColor: '#16A34A' }}>
                    <Download size={14} /> Download Excel
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
