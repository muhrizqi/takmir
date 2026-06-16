import React, { useState, useEffect } from 'react'
import { Plus, Trash2, RefreshCw, CalendarOff, ChevronDown, ChevronUp, X, Edit2 } from 'lucide-react'
import { api } from '../api'

const HARI_NAMA = ['Ahad','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']

function today() { return new Date().toISOString().split('T')[0] }
function bulanIni() { return new Date().toISOString().substring(0,7) }

function fmtJam(j) { return j || '' }

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/30 flex items-end md:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl p-5 w-full md:max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button className="btn p-1" onClick={onClose}><X size={15}/></button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Form Kegiatan (manual) ─────────────────────────────────────────────────────

function FormKegiatan({ biro, ruangan, onSave, onClose, init }) {
  const [form, setForm] = useState(init || {
    name:'', biro_id:'', ruangan_id:'', tanggal: today(),
    jam_mulai:'08:00', jam_selesai:'10:00', catatan:''
  })
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  function setF(k,v) { setForm(f=>({...f,[k]:v})) }

  async function save() {
    if (!form.name.trim() || !form.tanggal || !form.jam_mulai || !form.jam_selesai) {
      setErr('Nama, tanggal, jam mulai dan selesai wajib diisi'); return
    }
    if (form.jam_selesai <= form.jam_mulai) {
      setErr('Jam selesai harus lebih dari jam mulai'); return
    }
    setSaving(true); setErr('')
    try { await onSave(form) }
    catch(e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const ruanganByLantai = [1,2,3].map(lt => ({
    lantai: lt, rooms: ruangan.filter(r=>r.lantai===lt)
  }))

  return (
    <div className="space-y-3">
      <div><label className="label">Nama kegiatan *</label>
        <input className="input" value={form.name} onChange={e=>setF('name',e.target.value)} placeholder="Kajian, Rapat..."/>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Tanggal *</label>
          <input type="date" className="input" value={form.tanggal} onChange={e=>setF('tanggal',e.target.value)}/>
        </div>
        <div><label className="label">Biro</label>
          <select className="input" value={form.biro_id} onChange={e=>setF('biro_id',e.target.value)}>
            <option value="">— Umum —</option>
            {biro.map(b=><option key={b.id} value={b.id}>{b.id}. {b.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Jam mulai *</label>
          <input type="time" className="input" value={form.jam_mulai} onChange={e=>setF('jam_mulai',e.target.value)}/>
        </div>
        <div><label className="label">Jam selesai *</label>
          <input type="time" className="input" value={form.jam_selesai} onChange={e=>setF('jam_selesai',e.target.value)}/>
        </div>
      </div>
      <div><label className="label">Ruangan</label>
        <select className="input" value={form.ruangan_id} onChange={e=>setF('ruangan_id',e.target.value)}>
          <option value="">— Belum ditentukan —</option>
          {ruanganByLantai.map(lt=>(
            <optgroup key={lt.lantai} label={`Lantai ${lt.lantai}`}>
              {lt.rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      <div><label className="label">Catatan</label>
        <textarea className="input" rows={2} value={form.catatan} onChange={e=>setF('catatan',e.target.value)}/>
      </div>
      {err && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button className="btn" onClick={onClose}>Batal</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </div>
  )
}

// ── Form Kegiatan Rutin ────────────────────────────────────────────────────────

function FormRutin({ biro, ruangan, onSave, onClose, init }) {
  const [form, setForm] = useState(init || {
    name:'', biro_id:'', ruangan_id:'', hari_minggu: 0,
    jam_mulai:'08:00', jam_selesai:'10:00', catatan:''
  })
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  function setF(k,v) { setForm(f=>({...f,[k]:v})) }

  async function save() {
    if (!form.name.trim()) { setErr('Nama wajib diisi'); return }
    if (form.jam_selesai <= form.jam_mulai) { setErr('Jam selesai harus lebih dari jam mulai'); return }
    setSaving(true); setErr('')
    try { await onSave(form) }
    catch(e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const ruanganByLantai = [1,2,3].map(lt => ({ lantai: lt, rooms: ruangan.filter(r=>r.lantai===lt) }))

  return (
    <div className="space-y-3">
      <div><label className="label">Nama kegiatan rutin *</label>
        <input className="input" value={form.name} onChange={e=>setF('name',e.target.value)} placeholder="Kajian Subuh, Rapat Mingguan..."/>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Hari *</label>
          <select className="input" value={form.hari_minggu} onChange={e=>setF('hari_minggu',parseInt(e.target.value))}>
            {HARI_NAMA.map((h,i)=><option key={i} value={i}>{h}</option>)}
          </select>
        </div>
        <div><label className="label">Biro</label>
          <select className="input" value={form.biro_id} onChange={e=>setF('biro_id',e.target.value)}>
            <option value="">— Umum —</option>
            {biro.map(b=><option key={b.id} value={b.id}>{b.id}. {b.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Jam mulai *</label>
          <input type="time" className="input" value={form.jam_mulai} onChange={e=>setF('jam_mulai',e.target.value)}/>
        </div>
        <div><label className="label">Jam selesai *</label>
          <input type="time" className="input" value={form.jam_selesai} onChange={e=>setF('jam_selesai',e.target.value)}/>
        </div>
      </div>
      <div><label className="label">Ruangan</label>
        <select className="input" value={form.ruangan_id} onChange={e=>setF('ruangan_id',e.target.value)}>
          <option value="">— Belum ditentukan —</option>
          {ruanganByLantai.map(lt=>(
            <optgroup key={lt.lantai} label={`Lantai ${lt.lantai}`}>
              {lt.rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      <div><label className="label">Catatan</label>
        <textarea className="input" rows={2} value={form.catatan} onChange={e=>setF('catatan',e.target.value)}/>
      </div>
      {err && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button className="btn" onClick={onClose}>Batal</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </div>
  )
}

// ── Komponen utama ─────────────────────────────────────────────────────────────

export default function Kegiatan() {
  const [tab, setTab] = useState('agenda') // 'agenda' | 'rutin'
  const [items, setItems] = useState([])
  const [rutins, setRutins] = useState([])
  const [biro, setBiro] = useState([])
  const [ruangan, setRuangan] = useState([])
  const [bulan, setBulan] = useState(bulanIni())

  // Modal states
  const [modalKegiatan, setModalKegiatan] = useState(false)
  const [modalRutin, setModalRutin] = useState(false)
  const [editRutin, setEditRutin] = useState(null)
  const [modalLibur, setModalLibur] = useState(null) // rutin object
  const [formLibur, setFormLibur] = useState({ tanggal: today(), alasan: '' })
  const [expandedRutin, setExpandedRutin] = useState({})

  function loadKegiatan() { api.getKegiatan({ bulan }).then(setItems) }
  function loadRutin() { api.getKegiatanRutin().then(setRutins) }

  useEffect(() => { loadKegiatan() }, [bulan])
  useEffect(() => {
    loadRutin()
    api.getBiro().then(bd => setBiro(bd.flatMap(b=>b.biros)))
    api.getRuangan().then(setRuangan)
  }, [])

  async function saveKegiatan(form) {
    await api.createKegiatan(form)
    setModalKegiatan(false); loadKegiatan()
  }

  async function hapusKegiatan(id, sumber, rutinId) {
    if (sumber === 'rutin') {
      // Kegiatan dari rutin yang sudah terjadi — tandai libur
      const tgl = items.find(k => String(k.id) === String(id))?.tanggal
      if (!tgl) return
      if (!confirm(`Hapus kegiatan rutin pada ${tgl}?\nKegiatan ini hanya dihapus untuk tanggal tersebut.`)) return
      await api.addLibur(rutinId, { tanggal: tgl, alasan: 'Dihapus manual' })
    } else {
      if (!confirm('Hapus kegiatan ini?')) return
      await api.deleteKegiatan(id)
    }
    loadKegiatan()
  }

  async function hapusRutinTanggal(rutin, tanggal) {
    if (!confirm(`Tambahkan libur untuk ${tanggal}?`)) return
    await api.addLibur(rutin.id, { tanggal, alasan: formLibur.alasan || 'Libur' })
    loadRutin(); loadKegiatan()
  }

  async function hapusLibur(rutinId, tanggal) {
    await api.deleteLibur(rutinId, tanggal)
    loadRutin(); loadKegiatan()
  }

  async function hentikanRutin(id) {
    if (!confirm('Hentikan kegiatan rutin ini? Seluruh jadwal berikutnya tidak akan muncul lagi.')) return
    await api.deleteKegiatanRutin(id)
    loadRutin(); loadKegiatan()
  }

  async function saveRutin(form) {
    if (editRutin) {
      await api.updateKegiatanRutin(editRutin.id, form)
      setEditRutin(null)
    } else {
      await api.createKegiatanRutin(form)
    }
    setModalRutin(false); loadRutin(); loadKegiatan()
  }

  // Grouped per tanggal untuk agenda
  const grouped = items.reduce((acc, k) => {
    if (!acc[k.tanggal]) acc[k.tanggal] = []
    acc[k.tanggal].push(k); return acc
  }, {})

  const colorMap = { kegiatan:'border-l-blue-400', rutin:'border-l-violet-400', tamu:'border-l-orange-400' }
  const bgMap = { kegiatan:'bg-blue-50', rutin:'bg-violet-50', tamu:'bg-orange-50' }
  const textMap = { kegiatan:'text-blue-500', rutin:'text-violet-500', tamu:'text-orange-500' }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-base md:text-lg font-semibold text-gray-800">Kegiatan</h1>
        <div className="flex gap-2 items-center">
          {tab === 'agenda' && (
            <>
              <input type="month" className="input text-sm" value={bulan}
                onChange={e=>setBulan(e.target.value)} style={{width:'auto'}}/>
              <button className="btn btn-primary" onClick={()=>setModalKegiatan(true)}>
                <Plus size={14}/> Tambah
              </button>
            </>
          )}
          {tab === 'rutin' && (
            <button className="btn btn-primary" onClick={()=>{setEditRutin(null);setModalRutin(true)}}>
              <Plus size={14}/> Rutin baru
            </button>
          )}
        </div>
      </div>

      {/* Tab */}
      <div className="flex gap-2 mb-4">
        <button onClick={()=>setTab('agenda')}
          className={'btn '+(tab==='agenda'?'btn-primary':'')}>
          <CalendarOff size={13}/> Agenda
        </button>
        <button onClick={()=>setTab('rutin')}
          className={'btn '+(tab==='rutin'?'btn-primary':'')}>
          <RefreshCw size={13}/> Kegiatan Rutin
        </button>
      </div>

      {/* ── Tab Agenda ── */}
      {tab === 'agenda' && (
        <div>
          {/* Legend */}
          <div className="flex gap-3 mb-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span> Kegiatan</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-400 inline-block"></span> Rutin</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block"></span> Tamu</span>
          </div>

          {Object.keys(grouped).length === 0 && (
            <p className="text-sm text-gray-400 py-8 text-center">Belum ada kegiatan bulan ini.</p>
          )}

          {Object.keys(grouped).sort().map(tgl => (
            <div key={tgl} className="mb-5">
              <p className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2">
                <span className="h-px flex-1 bg-gray-100"></span>
                {new Date(tgl+'T00:00:00').toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long'})}
                <span className="h-px flex-1 bg-gray-100"></span>
              </p>
              <div className="space-y-2">
                {grouped[tgl].map(k => {
                  const s = k.sumber || 'kegiatan'
                  const isRutin = s === 'rutin'
                  const isTamu = s === 'tamu'
                  return (
                    <div key={String(k.id)} className={'card flex items-start gap-3 border-l-4 '+colorMap[s]}>
                      <div className={'w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 '+bgMap[s]}>
                        <span className={'text-sm font-semibold '+textMap[s]}>
                          {new Date(k.tanggal+'T00:00:00').getDate()}
                        </span>
                        <span className={'text-[9px] opacity-60 '+textMap[s]}>
                          {new Date(k.tanggal+'T00:00:00').toLocaleDateString('id-ID',{month:'short'})}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-800">{k.name}</p>
                          {isRutin && <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">Rutin</span>}
                          {isTamu && <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{k.keterangan||'Kunjungan'}</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {fmtJam(k.jam_mulai)}
                          {k.jam_selesai && k.jam_selesai !== k.jam_mulai ? ` — ${fmtJam(k.jam_selesai)}` : ''}
                          {k.biro_name ? ` · ${k.biro_name}` : ''}
                          {k.ruangan_name ? ` · ${k.ruangan_name}` : ''}
                        </p>
                        {k.catatan && !isTamu && <p className="text-xs text-gray-400 italic mt-0.5">{k.catatan}</p>}
                        {isTamu && k.jumlah > 0 && <p className="text-xs text-gray-400 mt-0.5">{k.jumlah} orang{k.pemateri ? ` · ${k.pemateri}` : ''}</p>}
                      </div>
                      {!isTamu && (
                        <button className="btn hover:bg-red-50 hover:text-red-500 flex-shrink-0"
                          onClick={()=>hapusKegiatan(k.id, s, k.rutin_id)}>
                          <Trash2 size={13}/>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab Rutin ── */}
      {tab === 'rutin' && (
        <div className="space-y-3">
          {rutins.length === 0 && (
            <p className="text-sm text-gray-400 py-8 text-center">Belum ada kegiatan rutin.</p>
          )}
          {rutins.map(r => (
            <div key={r.id} className="card border border-violet-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <RefreshCw size={16} className="text-violet-500"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{r.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Setiap {HARI_NAMA[r.hari_minggu]} · {fmtJam(r.jam_mulai)} — {fmtJam(r.jam_selesai)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {r.biro_name||'Takmir'}{r.ruangan_name ? ` · ${r.ruangan_name}` : ''}
                  </p>
                  {r.libur?.length > 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      {r.libur.length} tanggal libur terdaftar
                    </p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button className="btn hover:bg-blue-50 hover:text-blue-600"
                    onClick={()=>setExpandedRutin(e=>({...e,[r.id]:!e[r.id]}))}>
                    {expandedRutin[r.id] ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                  </button>
                  <button className="btn hover:bg-violet-50 hover:text-violet-600"
                    onClick={()=>{setEditRutin(r);setModalRutin(true)}}>
                    <Edit2 size={13}/>
                  </button>
                  <button className="btn hover:bg-red-50 hover:text-red-500"
                    onClick={()=>hentikanRutin(r.id)}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>

              {/* Panel expand: daftar libur + tambah libur */}
              {expandedRutin[r.id] && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 mb-2">
                    Tanggal libur / pengecualian
                  </p>
                  {r.libur?.length === 0 && (
                    <p className="text-xs text-gray-400 mb-2">Belum ada libur terdaftar.</p>
                  )}
                  {r.libur?.map(l => (
                    <div key={l.tanggal} className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-lg flex-1">
                        {new Date(l.tanggal+'T00:00:00').toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
                        {l.alasan ? ` — ${l.alasan}` : ''}
                      </span>
                      <button className="btn hover:bg-red-50 hover:text-red-500 text-xs px-2"
                        onClick={()=>hapusLibur(r.id, l.tanggal)}>
                        <X size={11}/>
                      </button>
                    </div>
                  ))}

                  {/* Form tambah libur */}
                  <div className="mt-2 flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="label">Tambah tanggal libur</label>
                      <input type="date" className="input text-sm"
                        value={formLibur.rutin_id === r.id ? formLibur.tanggal : today()}
                        onChange={e=>setFormLibur({rutin_id:r.id, tanggal:e.target.value, alasan:formLibur.alasan})}/>
                    </div>
                    <div className="flex-1">
                      <label className="label">Alasan (opsional)</label>
                      <input className="input text-sm" placeholder="Libur nasional..."
                        value={formLibur.rutin_id === r.id ? formLibur.alasan : ''}
                        onChange={e=>setFormLibur(f=>({...f, rutin_id:r.id, alasan:e.target.value}))}/>
                    </div>
                    <button className="btn btn-primary text-xs"
                      onClick={async()=>{
                        const tgl = formLibur.rutin_id === r.id ? formLibur.tanggal : today()
                        await api.addLibur(r.id, { tanggal: tgl, alasan: formLibur.alasan||'' })
                        setFormLibur({tanggal:today(), alasan:'', rutin_id:null})
                        loadRutin(); loadKegiatan()
                      }}>
                      Tambah
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal tambah kegiatan manual */}
      <Modal open={modalKegiatan} onClose={()=>setModalKegiatan(false)} title="Tambah Kegiatan">
        <FormKegiatan biro={biro} ruangan={ruangan}
          onSave={saveKegiatan} onClose={()=>setModalKegiatan(false)}/>
      </Modal>

      {/* Modal tambah/edit rutin */}
      <Modal open={modalRutin} onClose={()=>{setModalRutin(false);setEditRutin(null)}}
        title={editRutin ? 'Edit Kegiatan Rutin' : 'Tambah Kegiatan Rutin'}>
        <FormRutin biro={biro} ruangan={ruangan}
          init={editRutin ? {
            name: editRutin.name, biro_id: editRutin.biro_id||'',
            ruangan_id: editRutin.ruangan_id||'', hari_minggu: editRutin.hari_minggu,
            jam_mulai: editRutin.jam_mulai, jam_selesai: editRutin.jam_selesai,
            catatan: editRutin.catatan||''
          } : null}
          onSave={saveRutin} onClose={()=>{setModalRutin(false);setEditRutin(null)}}/>
      </Modal>
    </div>
  )
}
