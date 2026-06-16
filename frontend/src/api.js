const BASE = '/api';

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

  getPemesanan: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req('GET', `/pemesanan${q ? '?' + q : ''}`);
  },
  createPemesanan: (body) => req('POST', '/pemesanan', body),
  updatePemesanan: (id, body) => req('PUT', `/pemesanan/${id}`, body),
  deletePemesanan: (id) => req('DELETE', `/pemesanan/${id}`),

  getKegiatan: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req('GET', `/kegiatan${q ? '?' + q : ''}`);
  },
  createKegiatan: (body) => req('POST', '/kegiatan', body),
  updateKegiatan: (id, body) => req('PUT', `/kegiatan/${id}`, body),
  deleteKegiatan: (id) => req('DELETE', `/kegiatan/${id}`),

  getKeuangan: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req('GET', `/keuangan${q ? '?' + q : ''}`);
  },
  createKeuangan: (body) => req('POST', '/keuangan', body),
  deleteKeuangan: (id) => req('DELETE', `/keuangan/${id}`),

  getPengumuman: () => req('GET', '/pengumuman'),
  createPengumuman: (body) => req('POST', '/pengumuman', body),
  deletePengumuman: (id) => req('DELETE', `/pengumuman/${id}`),
};
