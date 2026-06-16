import React, { useState, useEffect } from 'react'
import { api } from '../api'
import { Plus, Trash2 } from 'lucide-react'

const STATUS_COLOR = {
  tersedia: 'border-l-masjid-400 bg-white',
  sebagian: 'border-l-amber-400 bg-white',
  penuh:    'border-l-red-400 bg-white',
}
const STATUS_BADGE = {
  tersedia: 'bg-masjid-50 text-masjid-600',
  sebagian: 'bg-amber-50 text-amber-700',
  penuh:    'bg-red-50 text-red-600',
}
const STATUS_LABEL = { tersedia: 'Tersedia', sebagian: 'Sebagian', penuh: 'Penuh' }

function today() { return new Date().toISOString().split('T')[0] }

export default function Ruangan() {
  const [lantai, setLantai] = useState(1)
  const [tanggal, setTanggal] = useState(today())
  const [ruangan, setRuangan] = useState([])
  const [pemesanan, setPemesanan] = useState([])
  const [biro, setBiro] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [form, setForm] = useState({ ruangan_id:'', name:'', biro_id:'', tanggal: today(), mulai:'08:00', selesai:'10:00', pic:'', catatan:'' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function load() {
    api.getRuangan(tanggal).then(setRuangan)
    api.getPemesanan({ tanggal }).then(setPemesanan)
  }

  useEffect(() => { load() }, [tanggal])
  useEffect(() => { api.getBiro().then(bd => setBiro(bd.flatMap(b => b.biros))) }, [])

  function openModal(room) {
    setSelectedRoom(room)
    setForm(f => ({ ...f, ruangan_id: room?.id || '', tanggal }))
    setShowModal(true); setErr('')
  }

  async function save() {
    setSaving(true); setErr('')
    try {
      await api.createPemesanan(form)
      setShowModal(false); load()
    } catch (e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  async function hapus(id) {
    if (!confirm('Hapus pemesanan ini?')) return
    await api.deletePemesanan(id); load()
  }

  const floors = [1, 2, 3]
  const curRuangan = ruangan.filter(r => r.lantai === lantai)
  const floorRoomIds = curRuangan.map(r => r.id)
  const curPemesanan = pemesanan.filter(p => floorRoomIds.includes(p.ruangan_id)).sort((a,b) => a.mulai.localeCompare(b.mulai))

  const allBiroOptions = biro.map(b => <option key={b.id} value={b.id}>{b.id}. {b.name}</option>)
  const allRoomOptions = ruangan.map(r => <option key={r.id} value={r.id}>Lt {r.lantai} — {r.name}</option>)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-semibold text-gray-800">Ruangan Masjid</h1>
        <div className="flex gap-2 items-center">
          <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} className="input text-sm" style={{width:'auto'}} />
          <button className="btn btn-primary" onClick={() => openModal(null)}>
            <Plus size={14} /> Pesan ruangan
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {floors.map(f => (
          <button key={f} onClick={() => setLantai(f)}
            className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${lantai === f ? 'bg-masjid-400 text-white border-masjid-400' : 'border-gray-200 text-gray-500 hover:border-masjid-400 hover:text-masjid-600'}`}>
            Lantai {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {curRuangan.map(r => (
          <div key={r.id}
            onClick={() => openModal(r)}
            className={`card border-l-4 cursor-pointer hover:shadow-sm transition-shadow ${STATUS_COLOR[r.status || 'tersedia']}`}>
            <p className="text-sm font-medium text-gray-800 leading-snug">{r.name}</p>
            <span className={`badge mt-2 ${STATUS_BADGE[r.status || 'tersedia']}`}>
              {STATUS_LABEL[r.status || 'tersedia']}
            </span>
            {r.jumlah_booking > 0 && (
              <p className="text-xs text-gray-400 mt-1">{r.jumlah_booking} pemesanan</p>
            )}
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-600 mb-2">Pemesanan lantai {lantai} — {tanggal}</h2>
        {curPemesanan.length === 0
          ? <p className="text-xs text-gray-400">Belum ada pemesanan.</p>
          : curPemesanan.map(p => (
            <div key={p.id} className="card mb-2 flex items-start gap-3">
              <div className="w-1 min-h-[40px] rounded bg-masjid-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{p.name}</p>
                <p className="text-xs text-gray-400">{p.ruangan_name} · {p.mulai}–{p.selesai} · {p.biro_name || 'Takmir'}</p>
              </div>
              <button className="btn hover:bg-red-50 hover:text-red-500" onClick={() => hapus(p.id)}><Trash2 size={13} /></button>
            </div>
          ))
        }
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-md space-y-3">
            <h3 className="font-semibold text-gray-800">
              {selectedRoom ? `Pesan — ${selectedRoom.name}` : 'Pesan ruangan'}
            </h3>
            {!selectedRoom && (
              <div><label className="label">Ruangan</label>
                <select className="input" value={form.ruangan_id} onChange={e => setForm(f => ({...f, ruangan_id:e.target.value}))}>
                  <option value="">— Pilih ruangan —</option>{allRoomOptions}
                </select>
              </div>
            )}
            <div><label className="label">Nama kegiatan</label>
              <input className="input" placeholder="Kajian, Rapat..." value={form.name} onChange={e => setForm(f => ({...f, name:e.target.value}))} />
            </div>
            <div><label className="label">Biro penyelenggara</label>
              <select className="input" value={form.biro_id} onChange={e => setForm(f => ({...f, biro_id:e.target.value}))}>
                <option value="">— Takmir / Umum —</option>{allBiroOptions}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Tanggal</label>
                <input type="date" className="input" value={form.tanggal} onChange={e => setForm(f => ({...f, tanggal:e.target.value}))} />
              </div>
              <div><label className="label">Penanggung jawab</label>
                <input className="input" placeholder="Nama..." value={form.pic} onChange={e => setForm(f => ({...f, pic:e.target.value}))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Mulai</label>
                <input type="time" className="input" value={form.mulai} onChange={e => setForm(f => ({...f, mulai:e.target.value}))} />
              </div>
              <div><label className="label">Selesai</label>
                <input type="time" className="input" value={form.selesai} onChange={e => setForm(f => ({...f, selesai:e.target.value}))} />
              </div>
            </div>
            <div><label className="label">Catatan</label>
              <textarea className="input" rows={2} value={form.catatan} onChange={e => setForm(f => ({...f, catatan:e.target.value}))} />
            </div>
            {err && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button className="btn" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
