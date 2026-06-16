import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalIcon, DoorOpen, Users } from 'lucide-react'
import { api } from '../api'

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function padDate(y, m, d) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

function fmtTgl(t) {
  if (!t) return ''
  return new Date(t+'T00:00:00').toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
}

export default function Kalender() {
  const now = new Date()
  const [tahun, setTahun] = useState(now.getFullYear())
  const [bulan, setBulan] = useState(now.getMonth())
  const [kegiatan, setKegiatan] = useState([])
  const [pemesanan, setPemesanan] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [loading, setLoading] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)

  const bulanStr = `${tahun}-${String(bulan+1).padStart(2,'0')}`

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
    if (bulan === 0) { setBulan(11); setTahun(t => t-1) }
    else setBulan(b => b-1)
    setSelectedDate(null)
  }
  function nextBulan() {
    if (bulan === 11) { setBulan(0); setTahun(t => t+1) }
    else setBulan(b => b+1)
    setSelectedDate(null)
  }

  const firstDay = new Date(tahun, bulan, 1).getDay()
  const daysInMonth = new Date(tahun, bulan+1, 0).getDate()
  const prevMonthDays = new Date(tahun, bulan, 0).getDate()

  const cells = []
  for (let i = firstDay-1; i >= 0; i--) cells.push({ day: prevMonthDays-i, current: false })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, current: true })
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) cells.push({ day: d, current: false })

  const todayStr = padDate(now.getFullYear(), now.getMonth()+1, now.getDate())

  function getEvents(day) {
    if (!day.current) return { kegiatan: [], kegiatanTamu: [], pemesanan: [] }
    const dateStr = padDate(tahun, bulan+1, day.day)
    return {
      kegiatan: kegiatan.filter(k => k.tanggal === dateStr && k.sumber === 'kegiatan'),
      kegiatanTamu: kegiatan.filter(k => k.tanggal === dateStr && k.sumber === 'tamu'),
      pemesanan: pemesanan.filter(p => p.tanggal === dateStr),
    }
  }

  const selectedEvents = selectedDate ? {
    kegiatan: kegiatan.filter(k => k.tanggal === selectedDate && k.sumber === 'kegiatan'),
    kegiatanTamu: kegiatan.filter(k => k.tanggal === selectedDate && k.sumber === 'tamu'),
    pemesanan: pemesanan.filter(p => p.tanggal === selectedDate),
  } : null

  function handleDateClick(dateStr) {
    setSelectedDate(dateStr)
    setDetailOpen(true) // di mobile buka panel sebagai overlay
  }

  const DetailPanel = () => (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-3">{fmtTgl(selectedDate)}</p>

      {selectedEvents.kegiatan.length === 0 && selectedEvents.kegiatanTamu.length === 0 && selectedEvents.pemesanan.length === 0 && (
        <p className="text-sm text-gray-400">Tidak ada agenda.</p>
      )}

      {selectedEvents.kegiatan.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-blue-500 mb-2 flex items-center gap-1">
            <CalIcon size={11}/> Kegiatan
          </p>
          <div className="space-y-2">
            {selectedEvents.kegiatan.map(k => (
              <div key={k.id} className="bg-blue-50 rounded-lg p-2.5">
                <p className="text-sm font-medium text-gray-800">{k.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{k.waktu} · {k.biro_name || 'Takmir'}</p>
                {k.catatan && <p className="text-xs text-gray-400 mt-0.5">{k.catatan}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedEvents.kegiatanTamu.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-orange-500 mb-2 flex items-center gap-1">
            <Users size={11}/> Kunjungan Tamu
          </p>
          <div className="space-y-2">
            {selectedEvents.kegiatanTamu.map(k => (
              <div key={k.id} className="bg-orange-50 rounded-lg p-2.5 border border-orange-100">
                <p className="text-sm font-medium text-gray-800">{k.name}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                    {k.keterangan || k.catatan}
                  </span>
                  {k.jumlah > 0 && (
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {k.jumlah} orang
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {k.waktu}{k.pemateri ? ` · Pemateri: ${k.pemateri}` : ''}
                  {k.ruangan_name ? ` · ${k.ruangan_name}` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedEvents.pemesanan.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-masjid-500 mb-2 flex items-center gap-1">
            <DoorOpen size={11}/> Pemesanan Ruangan
          </p>
          <div className="space-y-2">
            {selectedEvents.pemesanan.map(p => (
              <div key={p.id} className="bg-masjid-50 rounded-lg p-2.5">
                <p className="text-sm font-medium text-gray-800">{p.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{p.ruangan_name} · Lt {p.lantai}</p>
                <p className="text-xs text-gray-400">{p.mulai}–{p.selesai} · {p.biro_name||'Takmir'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="p-3 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-base md:text-lg font-semibold text-gray-800">Kalender</h1>
        <div className="flex items-center gap-1 md:gap-3">
          <button onClick={prevBulan} className="btn p-1.5 md:px-3"><ChevronLeft size={15}/></button>
          <span className="text-sm font-semibold text-gray-700 w-28 md:w-36 text-center">
            {BULAN[bulan]} {tahun}
          </span>
          <button onClick={nextBulan} className="btn p-1.5 md:px-3"><ChevronRight size={15}/></button>
          <button className="btn text-xs hidden md:inline-flex"
            onClick={() => { setTahun(now.getFullYear()); setBulan(now.getMonth()); setSelectedDate(todayStr) }}>
            Hari ini
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span> Kegiatan</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block"></span> Tamu</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-masjid-400 inline-block"></span> Pemesanan</span>
      </div>

      <div className="flex gap-4">
        {/* Grid kalender */}
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-7 mb-1">
            {HARI.map(h => (
              <div key={h} className={`text-center text-[10px] md:text-xs font-semibold py-1 ${h==='Min'?'text-red-400':'text-gray-400'}`}>
                {h}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 border-l border-t border-gray-100 rounded-xl overflow-hidden">
            {cells.map((cell, i) => {
              const events = getEvents(cell)
              const dateStr = cell.current ? padDate(tahun, bulan+1, cell.day) : null
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const isSunday = i % 7 === 0
              const hasAny = events.kegiatan.length > 0 || events.kegiatanTamu.length > 0 || events.pemesanan.length > 0

              return (
                <div key={i}
                  onClick={() => cell.current && handleDateClick(dateStr)}
                  className={`border-r border-b border-gray-100 min-h-[52px] md:min-h-[72px] p-1 md:p-1.5 transition-colors
                    ${cell.current ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-50/50'}
                    ${isSelected ? 'bg-masjid-50 hover:bg-masjid-50' : ''}
                  `}>
                  <div className={`text-[10px] md:text-xs font-medium w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full mb-0.5
                    ${isToday ? 'bg-masjid-400 text-white' : ''}
                    ${isSunday && cell.current && !isToday ? 'text-red-400' : ''}
                    ${!cell.current ? 'text-gray-300' : !isToday ? 'text-gray-700' : ''}
                  `}>
                    {cell.day}
                  </div>

                  {/* Mobile: hanya dot */}
                  {cell.current && hasAny && (
                    <div className="flex gap-0.5 flex-wrap md:hidden mt-0.5">
                      {events.kegiatan.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>}
                      {events.kegiatanTamu.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>}
                      {events.pemesanan.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-masjid-400"></span>}
                    </div>
                  )}

                  {/* Desktop: label */}
                  {cell.current && (
                    <div className="space-y-0.5 hidden md:block">
                      {events.kegiatan.slice(0,1).map(k => (
                        <div key={k.id} className="text-[10px] bg-blue-50 text-blue-600 rounded px-1 truncate leading-4">{k.name}</div>
                      ))}
                      {events.kegiatanTamu.slice(0,1).map(k => (
                        <div key={k.id} className="text-[10px] bg-orange-50 text-orange-600 rounded px-1 truncate leading-4">{k.name}</div>
                      ))}
                      {events.pemesanan.slice(0,1).map(p => (
                        <div key={p.id} className="text-[10px] bg-masjid-50 text-masjid-600 rounded px-1 truncate leading-4">{p.name}</div>
                      ))}
                      {(events.kegiatan.length + events.kegiatanTamu.length + events.pemesanan.length) > 2 && (
                        <div className="text-[9px] text-gray-400 px-1">+lagi</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Panel detail — desktop only */}
        <div className="w-60 flex-shrink-0 hidden md:block">
          {selectedDate && selectedEvents
            ? <DetailPanel />
            : <div className="text-sm text-gray-400 text-center pt-10">
                <CalIcon size={28} className="mx-auto mb-2 text-gray-200"/>
                Klik tanggal untuk detail
              </div>
          }
        </div>
      </div>

      {loading && <p className="text-xs text-gray-400 text-center mt-3">Memuat...</p>}

      {/* Mobile bottom sheet detail */}
      {detailOpen && selectedDate && selectedEvents && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDetailOpen(false)}/>
          <div className="relative w-full bg-white rounded-t-2xl p-4 max-h-[75vh] overflow-y-auto shadow-2xl">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4"/>
            <DetailPanel />
            <button className="mt-4 w-full btn justify-center" onClick={() => setDetailOpen(false)}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  )
}
