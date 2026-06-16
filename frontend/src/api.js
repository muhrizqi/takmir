const BASE = 'https://api.takmir.lewat.web.id/api';

function getToken() {
  return localStorage.getItem('token');
}

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    return;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan');
  return data;
}

export const api = {
  login: (body) => req('POST', '/login', body),
  getDashboard: () => req('GET', '/dashboard'),

  getBiro: () => req('GET', '/biro'),
  getBiroDetail: (id) => req('GET', `/biro/${id}`),

  getRuangan: (tanggal) => req('GET', `/ruangan${tanggal ? `?tanggal=${tanggal}` : ''}`),
  getRuanganTimeline: (ruangan_id, tanggal) => req('GET', `/ruangan/timeline?ruangan_id=${ruangan_id}&tanggal=${tanggal}`),

  // Kegiatan rutin
  getKegiatanRutin: () => req('GET', '/kegiatan-rutin'),
  createKegiatanRutin: (body) => req('POST', '/kegiatan-rutin', body),
  updateKegiatanRutin: (id, body) => req('PUT', `/kegiatan-rutin/${id}`, body),
  deleteKegiatanRutin: (id) => req('DELETE', `/kegiatan-rutin/${id}`),
  addLibur: (id, body) => req('POST', `/kegiatan-rutin/${id}/libur`, body),
  deleteLibur: (id, tanggal) => req('DELETE', `/kegiatan-rutin/${id}/libur/${tanggal}`),

  // Kegiatan
  getKegiatan: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req('GET', `/kegiatan${q ? '?' + q : ''}`);
  },
  createKegiatan: (body) => req('POST', '/kegiatan', body),
  updateKegiatan: (id, body) => req('PUT', `/kegiatan/${id}`, body),
  deleteKegiatan: (id) => req('DELETE', `/kegiatan/${id}`),

  getPemesanan: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req('GET', `/pemesanan${q ? '?' + q : ''}`);
  },
  createPemesanan: (body) => req('POST', '/pemesanan', body),
  updatePemesanan: (id, body) => req('PUT', `/pemesanan/${id}`, body),
  deletePemesanan: (id) => req('DELETE', `/pemesanan/${id}`),

  getKeuangan: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req('GET', `/keuangan${q ? '?' + q : ''}`);
  },
  createKeuangan: (body) => req('POST', '/keuangan', body),
  deleteKeuangan: (id) => req('DELETE', `/keuangan/${id}`),

  getPengumuman: () => req('GET', '/pengumuman'),
  createPengumuman: (body) => req('POST', '/pengumuman', body),
  deletePengumuman: (id) => req('DELETE', `/pengumuman/${id}`),

  getTamu: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req('GET', `/tamu${q ? '?' + q : ''}`);
  },
  createTamu: (body) => req('POST', '/tamu', body),
  updateTamu: (id, body) => req('PUT', `/tamu/${id}`, body),
  deleteTamu: (id) => req('DELETE', `/tamu/${id}`),
};
