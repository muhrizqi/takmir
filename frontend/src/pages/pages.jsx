import React, { useState, useEffect } from 'react'
import { api } from '../api'
import { Plus, Trash2, Search } from 'lucide-react'

function today() { return new Date().toISOString().split('T')[0] }
function bulanIni() { return new Date().toISOString().substring(0,7) }

// ── Shared components ──────────────────────────────────────────────────────────

function PageHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
      <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
      {action}
    </div>
  )
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-md">
        <h3 className="font-semibold text-gray-800 mb-3">{title}</h3>
        {children}
      </div>
    </div>
  )
}

// ── KEGIATAN ──────────────────────────────────────────────────────────────────

export function Kegiatan() {
  const [items, setItems] = useState([])
  const [biro, setBiro] = useState([])
  const [bulan, setBulan] = useState(bulanIni())
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name:'', biro_id:'', tanggal: today(), waktu:'08:00', catatan:'' })
  const [err, setErr] = useState('')

  function load() { api.getKegiatan({ bulan }).then(setItems) }
  useEffect(() => { load() }, [bulan])
  useEffect(() => { api.getBiro().then(bd => setBiro(bd.flatMap(b => b.biros))) }, [])

  async function save() {
    setErr('')
    try { await api.createKegiatan(form); setModal(false); load() }
    catch(e) { setErr(e.message) }
  }

  return (
    <div className="p-6">
      <PageHeader title="Kegiatan" action={
        <div className="flex gap-2 items-center">
          <input type="month" className="input text-sm" value={bulan} onChange={e => setBulan(e.target.value)} style={{width:'auto'}} />
          <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={14} /> Tambah</button>
        </div>
      } />
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-gray-400">Belum ada kegiatan bulan ini.</p>}
        {items.map(k => (
          <div key={k.id} className="card flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-blue-500">{new Date(k.tanggal+'T00:00:00').getDate()}</span>
              <span className="text-[9px] text-blue-300">{new Date(k.tanggal+'T00:00:00').toLocaleDateString('id-ID',{month:'short'})}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{k.name}</p>
              <p className="text-xs text-gray-400">{k.waktu} · {k.biro_name || 'Takmir'}{k.catatan ? ' — '+k.catatan : ''}</p>
            </div>
            <button className="btn hover:bg-red-50 hover:text-red-500" onClick={async () => { await api.deleteKegiatan(k.id); load() }}><Trash2 size={13}/></button>
          </div>
        ))}
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="Tambah kegiatan">
        <div className="space-y-3">
          <div><label className="label">Nama kegiatan</label><input className="input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} /></div>
          <div><label className="label">Biro</label>
            <select className="input" value={form.biro_id} onChange={e => setForm(f=>({...f,biro_id:e.target.value}))}>
              <option value="">— Takmir / Umum —</option>
              {biro.map(b => <option key={b.id} value={b.id}>{b.id}. {b.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Tanggal</label><input type="date" className="input" value={form.tanggal} onChange={e => setForm(f=>({...f,tanggal:e.target.value}))} /></div>
            <div><label className="label">Waktu</label><input type="time" className="input" value={form.waktu} onChange={e => setForm(f=>({...f,waktu:e.target.value}))} /></div>
          </div>
          <div><label className="label">Catatan</label><textarea className="input" rows={2} value={form.catatan} onChange={e => setForm(f=>({...f,catatan:e.target.value}))} /></div>
          {err && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
          <div className="flex justify-end gap-2"><button className="btn" onClick={()=>setModal(false)}>Batal</button><button className="btn btn-primary" onClick={save}>Simpan</button></div>
        </div>
      </Modal>
    </div>
  )
}

// ── PEMESANAN ─────────────────────────────────────────────────────────────────

export function Pemesanan() {
  const [items, setItems] = useState([])
  const [bulan, setBulan] = useState(bulanIni())

  useEffect(() => { api.getPemesanan({ bulan }).then(setItems) }, [bulan])

  const grouped = items.reduce((acc, p) => {
    const key = p.tanggal
    if (!acc[key]) acc[key] = []
    acc[key].push(p); return acc
  }, {})

  return (
    <div className="p-6">
      <PageHeader title="Semua pemesanan" action={
        <input type="month" className="input text-sm" value={bulan} onChange={e => setBulan(e.target.value)} style={{width:'auto'}} />
      } />
      {Object.keys(grouped).sort().map(tgl => (
        <div key={tgl} className="mb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">
            {new Date(tgl+'T00:00:00').toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          </p>
          {grouped[tgl].map(p => (
            <div key={p.id} className="card mb-2 flex items-start gap-3">
              <div className="w-1 min-h-[40px] rounded bg-masjid-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{p.name}</p>
                <p className="text-xs text-gray-400">{p.ruangan_name} · Lt {p.lantai} · {p.mulai}–{p.selesai} · {p.biro_name||'Takmir'}</p>
              </div>
              <button className="btn hover:bg-red-50 hover:text-red-500" onClick={async()=>{await api.deletePemesanan(p.id);setItems(i=>i.filter(x=>x.id!==p.id))}}><Trash2 size={13}/></button>
            </div>
          ))}
        </div>
      ))}
      {items.length === 0 && <p className="text-sm text-gray-400">Belum ada pemesanan bulan ini.</p>}
    </div>
  )
}

// ── KEUANGAN ──────────────────────────────────────────────────────────────────

function rp(n) { return new Intl.NumberFormat('id-ID').format(n) }

export function Keuangan() {
  const [data, setData] = useState({ transaksi:[], total_masuk:0, total_keluar:0, saldo:0 })
  const [biro, setBiro] = useState([])
  const [bulan, setBulan] = useState(bulanIni())
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ tipe:'masuk', jumlah:'', keterangan:'', biro_id:'', tanggal: today() })
  const [err, setErr] = useState('')

  function load() { api.getKeuangan({ bulan }).then(setData) }
  useEffect(() => { load() }, [bulan])
  useEffect(() => { api.getBiro().then(bd => setBiro(bd.flatMap(b => b.biros))) }, [])

  async function save() {
    setErr('')
    try { await api.createKeuangan({...form, jumlah: parseInt(form.jumlah)||0}); setModal(false); load() }
    catch(e) { setErr(e.message) }
  }

  return (
    <div className="p-6">
      <PageHeader title="Keuangan" action={
        <div className="flex gap-2">
          <input type="month" className="input text-sm" value={bulan} onChange={e=>setBulan(e.target.value)} style={{width:'auto'}} />
          <button className="btn btn-primary" onClick={()=>setModal(true)}><Plus size={14}/> Catat</button>
        </div>
      } />

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          {label:'Total masuk', val:data.total_masuk, color:'bg-masjid-50 text-masjid-600'},
          {label:'Total keluar', val:data.total_keluar, color:'bg-red-50 text-red-600'},
          {label:'Saldo', val:data.saldo, color:'bg-blue-50 text-blue-600'},
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
            <p className="text-xs font-medium opacity-70">{s.label}</p>
            <p className="text-xl font-semibold mt-1">Rp {rp(s.val)}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {data.transaksi.map(t => (
          <div key={t.id} className="card flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.tipe==='masuk'?'bg-masjid-400':'bg-red-400'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{t.keterangan}</p>
              <p className="text-xs text-gray-400">{t.tanggal} · {t.biro_name||'Takmir'}</p>
            </div>
            <p className={`text-sm font-semibold flex-shrink-0 ${t.tipe==='masuk'?'text-masjid-600':'text-red-500'}`}>
              {t.tipe==='masuk'?'+':'-'} Rp {rp(t.jumlah)}
            </p>
            <button className="btn hover:bg-red-50 hover:text-red-500" onClick={async()=>{await api.deleteKeuangan(t.id);load()}}><Trash2 size={13}/></button>
          </div>
        ))}
        {data.transaksi.length === 0 && <p className="text-sm text-gray-400">Belum ada transaksi.</p>}
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title="Catat transaksi">
        <div className="space-y-3">
          <div>
            <label className="label">Tipe</label>
            <div className="flex gap-2">
              {['masuk','keluar'].map(t => (
                <button key={t} onClick={()=>setForm(f=>({...f,tipe:t}))}
                  className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${form.tipe===t?'bg-masjid-400 text-white border-masjid-400':'border-gray-200 text-gray-600'}`}>
                  {t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div><label className="label">Jumlah (Rp)</label><input type="number" className="input" placeholder="50000" value={form.jumlah} onChange={e=>setForm(f=>({...f,jumlah:e.target.value}))} /></div>
          <div><label className="label">Keterangan</label><input className="input" value={form.keterangan} onChange={e=>setForm(f=>({...f,keterangan:e.target.value}))} /></div>
          <div><label className="label">Biro</label>
            <select className="input" value={form.biro_id} onChange={e=>setForm(f=>({...f,biro_id:e.target.value}))}>
              <option value="">— Takmir / Umum —</option>
              {biro.map(b=><option key={b.id} value={b.id}>{b.id}. {b.name}</option>)}
            </select>
          </div>
          <div><label className="label">Tanggal</label><input type="date" className="input" value={form.tanggal} onChange={e=>setForm(f=>({...f,tanggal:e.target.value}))} /></div>
          {err && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
          <div className="flex justify-end gap-2"><button className="btn" onClick={()=>setModal(false)}>Batal</button><button className="btn btn-primary" onClick={save}>Simpan</button></div>
        </div>
      </Modal>
    </div>
  )
}

// ── PENGUMUMAN ────────────────────────────────────────────────────────────────

export function Pengumuman() {
  const [items, setItems] = useState([])
  const [biro, setBiro] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ judul:'', isi:'', biro_id:'', tanggal: today() })
  const [err, setErr] = useState('')

  function load() { api.getPengumuman().then(setItems) }
  useEffect(() => { load() }, [])
  useEffect(() => { api.getBiro().then(bd => setBiro(bd.flatMap(b => b.biros))) }, [])

  async function save() {
    setErr('')
    try { await api.createPengumuman(form); setModal(false); load() }
    catch(e) { setErr(e.message) }
  }

  return (
    <div className="p-6">
      <PageHeader title="Pengumuman" action={
        <button className="btn btn-primary" onClick={()=>setModal(true)}><Plus size={14}/> Buat pengumuman</button>
      } />
      <div className="space-y-3">
        {items.map(p => (
          <div key={p.id} className="card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-800">{p.judul}</p>
                <p className="text-xs text-gray-400 mt-0.5">{p.tanggal} · {p.biro_name || 'Takmir'}</p>
              </div>
              <button className="btn hover:bg-red-50 hover:text-red-500 flex-shrink-0" onClick={async()=>{await api.deletePengumuman(p.id);load()}}><Trash2 size={13}/></button>
            </div>
            <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{p.isi}</p>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-400">Belum ada pengumuman.</p>}
      </div>
      <Modal open={modal} onClose={()=>setModal(false)} title="Buat pengumuman">
        <div className="space-y-3">
          <div><label className="label">Judul</label><input className="input" value={form.judul} onChange={e=>setForm(f=>({...f,judul:e.target.value}))} /></div>
          <div><label className="label">Isi pengumuman</label><textarea className="input" rows={4} value={form.isi} onChange={e=>setForm(f=>({...f,isi:e.target.value}))} /></div>
          <div><label className="label">Biro</label>
            <select className="input" value={form.biro_id} onChange={e=>setForm(f=>({...f,biro_id:e.target.value}))}>
              <option value="">— Takmir / Umum —</option>
              {biro.map(b=><option key={b.id} value={b.id}>{b.id}. {b.name}</option>)}
            </select>
          </div>
          <div><label className="label">Tanggal</label><input type="date" className="input" value={form.tanggal} onChange={e=>setForm(f=>({...f,tanggal:e.target.value}))} /></div>
          {err && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
          <div className="flex justify-end gap-2"><button className="btn" onClick={()=>setModal(false)}>Batal</button><button className="btn btn-primary" onClick={save}>Simpan</button></div>
        </div>
      </Modal>
    </div>
  )
}

// ── PENGURUS ──────────────────────────────────────────────────────────────────

export function Pengurus() {
  const [data, setData] = useState([])
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)

  useEffect(() => { api.getBiro().then(setData) }, [])

  async function openDetail(id) {
    const d = await api.getBiroDetail(id)
    setDetail(d)
  }

  const filtered = data.map(bd => ({
    ...bd,
    biros: bd.biros.filter(b => !q || b.name.toLowerCase().includes(q.toLowerCase()))
  })).filter(bd => bd.biros.length > 0)

  return (
    <div className="p-6">
      <PageHeader title="Pengurus & Biro" />
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-8" placeholder="Cari nama biro atau anggota..." value={q} onChange={e=>setQ(e.target.value)} />
      </div>

      <div className="space-y-5">
        {filtered.map(bd => (
          <div key={bd.id}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:bd.color}} />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{bd.label}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {bd.biros.map(b => (
                <button key={b.id} onClick={()=>openDetail(b.id)}
                  className="card text-left hover:border-masjid-100 hover:shadow-sm transition-all flex items-start gap-2">
                  <span className="text-xs font-bold text-masjid-400 bg-masjid-50 rounded px-1.5 py-0.5 flex-shrink-0 mt-0.5">{b.id}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800 leading-snug">{b.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{b.jumlah_anggota} anggota</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {detail && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-gray-800">Biro {detail.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{detail.bidang_id?.toUpperCase()}</p>
              </div>
              <button className="btn" onClick={()=>setDetail(null)}>✕</button>
            </div>
            <div className="overflow-y-auto flex-1">
              <p className="text-xs font-medium text-gray-500 mb-2">Anggota ({detail.anggota?.length || 0})</p>
              <div className="flex flex-wrap gap-1.5">
                {(detail.anggota || []).map(a => (
                  <span key={a.id} className="badge bg-gray-100 text-gray-700">{a.nama}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
