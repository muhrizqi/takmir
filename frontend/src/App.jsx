import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Kalender from './pages/Kalender'
import Kegiatan from './pages/Kegiatan'
import Ruangan from './pages/Ruangan'
import Pemesanan from './pages/Pemesanan'
import Keuangan from './pages/Keuangan'
import Pengumuman from './pages/Pengumuman'
import Pengurus from './pages/Pengurus'
import Tamu from './pages/Tamu'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="kalender" element={<Kalender />} />
        <Route path="kegiatan" element={<Kegiatan />} />
        <Route path="ruangan" element={<Ruangan />} />
        <Route path="pemesanan" element={<Pemesanan />} />
        <Route path="keuangan" element={<Keuangan />} />
        <Route path="pengumuman" element={<Pengumuman />} />
        <Route path="pengurus" element={<Pengurus />} />
        <Route path="tamu" element={<Tamu />} />
      </Route>
    </Routes>
  )
}
