import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, Calendar, DoorOpen,
  ClipboardList, Wallet, Megaphone, Users, LogOut,
  Building2, UserCheck, Menu
} from 'lucide-react'

const navItems = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/kalender',   icon: CalendarDays,    label: 'Kalender' },
  { to: '/kegiatan',   icon: Calendar,        label: 'Kegiatan' },
  { to: '/ruangan',    icon: DoorOpen,        label: 'Ruangan' },
  { to: '/pemesanan',  icon: ClipboardList,   label: 'Pemesanan' },
  { to: '/tamu',       icon: UserCheck,       label: 'Tamu Masjid' },
  { to: '/keuangan',   icon: Wallet,          label: 'Keuangan' },
  { to: '/pengumuman', icon: Megaphone,       label: 'Pengumuman' },
  { to: '/pengurus',   icon: Users,           label: 'Pengurus & Biro' },
]

export default function Layout() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [open, setOpen] = useState(false)

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden flex-col md:flex-row">
      {/* Header mobile */}
      <header className="md:hidden flex items-center justify-between p-3 border-b bg-white">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-masjid-400" />
          <span className="text-sm font-semibold">Masjid Jogokariyan</span>
        </div>
        <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-gray-100">
          <Menu size={18} />
        </button>
      </header>

      {/* Sidebar desktop */}
      {(open || window.innerWidth >= 768) && (
        <aside className="sidebar md:block">
          {/* ... isi sidebar tetap sama ... */}
        </aside>
      )}

      {/* Main content */}
      <main className="main-content pb-12 md:pb-0">
        <Outlet />
      </main>

      {/* Bottom navigation mobile */}
      <nav className="bottom-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `bottom-nav-item ${isActive ? 'bottom-nav-item-active' : ''}`
            }>
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
