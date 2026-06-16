import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalIcon, DoorOpen } from 'lucide-react'
import { api } from '../api'

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

function padDate(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export default function Kalender() {
  const now = new Date()
  const [tahun, setTahun] = useState(now.getFullYear())
  const [bulan, setBulan] = useState(now.getMonth()) // 0-indexed
  const [kegiatan, setKegiatan] = useState([])
  const [pemesanan, setPemesanan] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [loading, setLoading] = useState(false)

  const bulanStr = `${tahun}-${String(bulan + 1).padStart(2, '0')}`

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.getKegiatan({ bulan: bulanStr }),
      api.getPemesanan({ bulan: bulanStr }),
    ]).then(([kg, bk]) => {
      setKegiatan(kg)
      setPemesanan(bk)
    }).finally(() => setLoading(false))
  }, [bulanStr])

  function prevBulan() {
    if (bulan === 0) { setBulan(11); setTahun(t => t - 1) }
    else setBulan(b => b - 1)
    setSelectedDate(null)
  }

  function nextBulan() {
    if (bulan === 11) { setBulan(0); setTahun(t => t + 1) }
    else setBulan(b => b + 1)
    setSelectedDate(null)
  }

  // Bangun grid kalender
  const firstDay = new Date(tahun, bulan, 1).getDay() // 0=Min
  const daysInMonth = new Date(tahun, bulan + 1, 0).getDate()
  const prevMonthDays = new Date(tahun, bulan, 0).getDate()

  const cells = []
  // Hari dari bulan sebelumnya
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, current: false })
  }
  // Hari bulan ini
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true })
  }
  // Hari bulan depan
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, current: false })
  }

  function getEvents(day) {
    if (!day.current) return { kegiatan: [], pemesanan: [] }
    const dateStr = padDate(tahun, bulan + 1, day.day)
    return {
      kegiatan: kegiatan.filter(k => k.tanggal === dateStr),
      pemesanan: pemesanan.filter(p => p.tanggal === dateStr),
    }
  }

  const todayStr = padDate(now.getFullYear(), now.getMonth() + 1, now.getDate())

  // Detail tanggal yang dipilih
  const selectedEvents = selectedDate
    ? {
        kegiatan: kegiatan.filter(k => k.tanggal === selectedDate),
        pemesanan: pemesanan.filter(p => p.tanggal === selectedDate),
      }
    : null

  const selectedLabel = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      })
    : null

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-gray-800">Kalender</h1>
        <div className="flex items-center gap-3">
          <button onClick={prevBulan} className="btn"><ChevronLeft size={15} /></button>
          <span className="text-sm font-semibold text-gray-700 w-36 text-center">
            {BULAN[bulan]} {tahun}
          </span>
          <button onClick={nextBulan} className="btn"><ChevronRight size={15} /></button>
          <button
            className="btn text-xs"
            onClick={() => { setTahun(now.getFullYear()); setBulan(now.getMonth()); setSelectedDate(todayStr) }}
          >
            Hari ini
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Grid Kalender */}
        <div className="flex-1">
          {/* Legend */}
          <div className="flex gap-3 mb-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span> Kegiatan</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-masjid-400 inline-block"></span> Pemesanan ruangan</span>
          </div>

          {/* Nama hari */}
          <div className="grid grid-cols-7 mb-1">
            {HARI.map(h => (
              <div key={h} className={`text-center text-xs font-semibold py-1.5 ${h === 'Min' ? 'text-red-400' : 'text-gray-400'}`}>
                {h}
              </div>
            ))}
          </div>

          {/* Sel kalender */}
          <div className="grid grid-cols-7 border-l border-t border-gray-100 rounded-xl overflow-hidden">
            {cells.map((cell, i) => {
              const events = getEvents(cell)
              const dateStr = cell.current ? padDate(tahun, bulan + 1, cell.day) : null
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const isSunday = i % 7 === 0
              const hasEvents = events.kegiatan.length > 0 || events.pemesanan.length > 0

              return (
                <div
                  key={i}
                  onClick={() => cell.current && setSelectedDate(dateStr)}
                  className={`border-r border-b border-gray-100 min-h-[72px] p-1.5 transition-colors
                    ${cell.current ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-50/50'}
                    ${isSelected ? 'bg-masjid-50 hover:bg-masjid-50' : ''}
                  `}
                >
                  {/* Nomor hari */}
                  <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1
                    ${isToday ? 'bg-masjid-400 text-white' : ''}
                    ${isSunday && cell.current && !isToday ? 'text-red-400' : ''}
                    ${!cell.current ? 'text-gray-300' : !isToday ? 'text-gray-700' : ''}
                  `}>
                    {cell.day}
                  </div>

                  {/* Dot events */}
                  {cell.current && (
                    <div className="space-y-0.5">
                      {events.kegiatan.slice(0, 2).map(k => (
                        <div key={k.id} className="text-[10px] bg-blue-50 text-blue-600 rounded px-1 truncate leading-4">
                          {k.name}
                        </div>
                      ))}
                      {events.kegiatan.length > 2 && (
                        <div className="text-[10px] text-blue-400 px-1">+{events.kegiatan.length - 2} lagi</div>
                      )}
                      {events.pemesanan.slice(0, 1).map(p => (
                        <div key={p.id} className="text-[10px] bg-masjid-50 text-masjid-600 rounded px-1 truncate leading-4">
                          {p.name}
                        </div>
                      ))}
                      {events.pemesanan.length > 1 && (
                        <div className="text-[10px] text-masjid-400 px-1">+{events.pemesanan.length - 1} ruangan</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Panel Detail */}
        <div className="w-64 flex-shrink-0">
          {selectedDate && selectedEvents ? (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-3">{selectedLabel}</p>

              {selectedEvents.kegiatan.length === 0 && selectedEvents.pemesanan.length === 0 && (
                <p className="text-sm text-gray-400">Tidak ada kegiatan atau pemesanan.</p>
              )}

              {selectedEvents.kegiatan.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-blue-500 mb-2 flex items-center gap-1">
                    <CalIcon size={11} /> Kegiatan
                  </p>
                  <div className="space-y-2">
                    {selectedEvents.kegiatan.map(k => (
                      <div key={k.id} className="bg-blue-50 rounded-lg p-2.5">
                        <p className="text-sm font-medium text-gray-800">{k.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {k.waktu} · {k.biro_name || 'Takmir'}
                        </p>
                        {k.catatan && <p className="text-xs text-gray-400 mt-0.5">{k.catatan}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedEvents.pemesanan.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-masjid-500 mb-2 flex items-center gap-1">
                    <DoorOpen size={11} /> Pemesanan Ruangan
                  </p>
                  <div className="space-y-2">
                    {selectedEvents.pemesanan.map(p => (
                      <div key={p.id} className="bg-masjid-50 rounded-lg p-2.5">
                        <p className="text-sm font-medium text-gray-800">{p.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {p.ruangan_name} · Lt {p.lantai}
                        </p>
                        <p className="text-xs text-gray-400">
                          {p.mulai}–{p.selesai} · {p.biro_name || 'Takmir'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-400 text-center pt-10">
              <CalIcon size={28} className="mx-auto mb-2 text-gray-200" />
              Klik tanggal untuk melihat detail
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="text-xs text-gray-400 text-center mt-3">Memuat data...</div>
      )}
    </div>
  )
}
