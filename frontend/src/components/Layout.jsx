import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, Calendar, DoorOpen,
  ClipboardList, Wallet, Megaphone, Users, LogOut,
  Building2, UserCheck, Menu, X
} from 'lucide-react'

const navItems = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/kalender',   icon: CalendarDays,    label: 'Kalender' },
  { to: '/kegiatan',   icon: Calendar,        label: 'Kegiatan' },
  { to: '/ruangan',    icon: DoorOpen,        label: 'Ruangan' },
  { to: '/pemesanan',  icon: ClipboardList,   label: 'Pemesanan' },
  { to: '/tamu',       icon: UserCheck,       label: 'Tamu' },
  { to: '/keuangan',   icon: Wallet,          label: 'Keuangan' },
  { to: '/pengumuman', icon: Megaphone,       label: 'Pengumuman' },
  { to: '/pengurus',   icon: Users,           label: 'Pengurus' },
]

// Bottom nav hanya tampilkan 5 item terpenting, sisanya di menu drawer
const bottomNavItems = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Home' },
  { to: '/kalender',   icon: CalendarDays,    label: 'Kalender' },
  { to: '/ruangan',    icon: DoorOpen,        label: 'Ruangan' },
  { to: '/tamu',       icon: UserCheck,       label: 'Tamu' },
  { to: '/kegiatan',   icon: Calendar,        label: 'Kegiatan' },
]

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [drawerOpen, setDrawerOpen] = useState(false)

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Sidebar desktop (hidden di mobile) ── */}
      <aside className="hidden md:flex w-52 bg-white border-r border-gray-100 flex-col flex-shrink-0">
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
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-masjid-50 text-masjid-600 font-medium'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`
              }>
              <Icon size={15} />{label}
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

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar mobile */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-masjid-400" />
            <span className="text-sm font-semibold text-gray-800">Masjid Jogokariyan</span>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <Menu size={20} />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <Outlet />
        </main>

        {/* ── Bottom navigation mobile ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-40"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {bottomNavItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] transition-colors ${
                  isActive ? 'text-masjid-600' : 'text-gray-400'
                }`
              }>
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-masjid-50' : ''}`}>
                    <Icon size={20} />
                  </div>
                  <span className="font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
          {/* Tombol More */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] text-gray-400"
          >
            <div className="p-1.5 rounded-xl">
              <Menu size={20} />
            </div>
            <span className="font-medium">Lainnya</span>
          </button>
        </nav>
      </div>

      {/* ── Drawer overlay (mobile) ── */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          {/* Drawer */}
          <div className="relative ml-auto w-72 bg-white h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-800">Menu</p>
                <p className="text-xs text-gray-400">{user.username} · {user.role}</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                      isActive
                        ? 'bg-masjid-50 text-masjid-600 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`
                  }>
                  <Icon size={18} />{label}
                </NavLink>
              ))}
            </nav>

            <div className="p-4 border-t border-gray-100">
              <button onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm text-red-500 bg-red-50 hover:bg-red-100 rounded-xl font-medium">
                <LogOut size={16} /> Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
