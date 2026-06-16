import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, CalendarDays, DoorOpen, ClipboardList,
  Wallet, Megaphone, Users, LogOut, Building2
} from 'lucide-react'

const navItems = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/kalender',   icon: CalendarDays,    label: 'Kalender' },
  { to: '/kegiatan',   icon: Calendar,        label: 'Kegiatan' },
  { to: '/ruangan',    icon: DoorOpen,        label: 'Ruangan' },
  { to: '/pemesanan',  icon: ClipboardList,   label: 'Pemesanan' },
  { to: '/keuangan',   icon: Wallet,          label: 'Keuangan' },
  { to: '/pengumuman', icon: Megaphone,       label: 'Pengumuman' },
  { to: '/pengurus',   icon: Users,           label: 'Pengurus & Biro' },
]

export default function Layout() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className="w-52 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-masjid-400" />
            <div>
              <p className="text-xs font-semibold text-gray-800 leading-tight">Masjid Jogokariyan</p>
              <p className="text-[10px] text-gray-400">Sistem Manajemen</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-masjid-50 text-masjid-600 font-medium'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-masjid-50 flex items-center justify-center">
              <span className="text-[10px] font-medium text-masjid-600">
                {(user.username || 'U')[0].toUpperCase()}
              </span>
            </div>
            <span className="text-xs text-gray-600 font-medium">{user.username}</span>
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded ml-auto">{user.role}</span>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg">
            <LogOut size={13} /> Keluar
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
