import React, { useEffect, useState } from 'react'
import { api } from '../api'
import { Building2, DoorOpen, Calendar, ClipboardList, Wallet, Megaphone, Clock } from 'lucide-react'

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-semibold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

function rupiahFormat(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export default function Dashboard() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api.getDashboard().then(setData).catch(console.error)
  }, [])

  if (!data) return <div className="p-6 text-sm text-gray-400">Memuat data...</div>

  const { stats, booking_hari_ini, kegiatan_mendatang, pengumuman_terbaru } = data

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-400">{new Date().toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Building2} label="Total biro" value={stats.total_biro} color="bg-masjid-400" />
        <StatCard icon={DoorOpen} label="Total ruangan" value={stats.total_ruangan} color="bg-blue-400" />
        <StatCard icon={ClipboardList} label="Booking hari ini" value={stats.booking_hari_ini} color="bg-amber-400" />
        <StatCard icon={Wallet} label="Saldo bulan ini" value={rupiahFormat(stats.saldo_bulan_ini)} color="bg-emerald-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Booking hari ini */}
        <div className="card lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <ClipboardList size={14} className="text-masjid-400" /> Pemesanan hari ini
          </h2>
          {booking_hari_ini.length === 0
            ? <p className="text-xs text-gray-400">Tidak ada pemesanan hari ini.</p>
            : booking_hari_ini.map(b => (
              <div key={b.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="w-1 h-full min-h-[36px] rounded bg-masjid-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{b.name}</p>
                  <p className="text-xs text-gray-400">{b.ruangan_name} · Lt {b.lantai} · {b.mulai}–{b.selesai}</p>
                </div>
              </div>
            ))
          }
        </div>

        {/* Pengumuman */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Megaphone size={14} className="text-amber-500" /> Pengumuman terbaru
          </h2>
          {pengumuman_terbaru.length === 0
            ? <p className="text-xs text-gray-400">Belum ada pengumuman.</p>
            : pengumuman_terbaru.map(p => (
              <div key={p.id} className="py-2 border-b border-gray-50 last:border-0">
                <p className="text-sm font-medium text-gray-800 truncate">{p.judul}</p>
                <p className="text-xs text-gray-400">{p.tanggal}</p>
              </div>
            ))
          }
        </div>
      </div>

      {/* Kegiatan mendatang */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Calendar size={14} className="text-blue-400" /> Kegiatan mendatang
        </h2>
        <div className="space-y-2">
          {kegiatan_mendatang.length === 0
            ? <p className="text-xs text-gray-400">Tidak ada kegiatan mendatang.</p>
            : kegiatan_mendatang.map(k => (
              <div key={k.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-[10px] text-blue-400 font-medium">{new Date(k.tanggal+'T00:00:00').toLocaleDateString('id-ID',{day:'2-digit'})}</span>
                  <span className="text-[9px] text-blue-300">{new Date(k.tanggal+'T00:00:00').toLocaleDateString('id-ID',{month:'short'})}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{k.name}</p>
                  <p className="text-xs text-gray-400">{k.waktu} · {k.biro_name || 'Takmir'}{k.catatan ? ' — ' + k.catatan : ''}</p>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}
