const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'masjid-jogokariyan-secret-dev';

const db = initDB();
app.use(cors());
app.use(express.json());

function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: 'Token diperlukan' });
  try {
    req.user = jwt.verify(h.replace('Bearer ', ''), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token tidak valid' });
  }
}

// ── AUTH ──────────────────────────────────────────────────────────────────────

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username=? AND password=?').get(username, password);
  if (!user) return res.status(401).json({ error: 'Username atau password salah' });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

// ── BIDANG & BIRO ─────────────────────────────────────────────────────────────

app.get('/api/biro', auth, (req, res) => {
  const bidang = db.prepare('SELECT * FROM bidang').all();
  const biros = db.prepare('SELECT b.*, COUNT(a.id) as jumlah_anggota FROM biro b LEFT JOIN biro_anggota a ON a.biro_id=b.id GROUP BY b.id').all();
  const result = bidang.map(bd => ({
    ...bd,
    biros: biros.filter(b => b.bidang_id === bd.id)
  }));
  res.json(result);
});

app.get('/api/biro/:id', auth, (req, res) => {
  const biro = db.prepare('SELECT * FROM biro WHERE id=?').get(req.params.id);
  if (!biro) return res.status(404).json({ error: 'Biro tidak ditemukan' });
  const anggota = db.prepare('SELECT * FROM biro_anggota WHERE biro_id=?').all(req.params.id);
  res.json({ ...biro, anggota });
});

// ── RUANGAN ───────────────────────────────────────────────────────────────────

app.get('/api/ruangan', auth, (req, res) => {
  const { tanggal } = req.query;
  const ruangan = db.prepare('SELECT * FROM ruangan ORDER BY lantai, id').all();
  if (tanggal) {
    const bookings = db.prepare('SELECT ruangan_id, mulai, selesai FROM pemesanan WHERE tanggal=?').all(tanggal);
    const result = ruangan.map(r => {
      const bks = bookings.filter(b => b.ruangan_id === r.id);
      let status = 'tersedia';
      if (bks.length) status = bks.length >= 3 ? 'penuh' : 'sebagian';
      return { ...r, status, jumlah_booking: bks.length };
    });
    return res.json(result);
  }
  res.json(ruangan);
});

// ── PEMESANAN ─────────────────────────────────────────────────────────────────

app.get('/api/pemesanan', auth, (req, res) => {
  const { tanggal, ruangan_id, bulan } = req.query;
  let query = `
    SELECT p.*, r.name as ruangan_name, r.lantai, b.name as biro_name
    FROM pemesanan p
    LEFT JOIN ruangan r ON r.id = p.ruangan_id
    LEFT JOIN biro b ON b.id = p.biro_id
  `;
  const conds = [], params = [];
  if (tanggal) { conds.push('p.tanggal=?'); params.push(tanggal); }
  if (ruangan_id) { conds.push('p.ruangan_id=?'); params.push(ruangan_id); }
  if (bulan) { conds.push("strftime('%Y-%m', p.tanggal)=?"); params.push(bulan); }
  if (conds.length) query += ' WHERE ' + conds.join(' AND ');
  query += ' ORDER BY p.tanggal, p.mulai';
  res.json(db.prepare(query).all(...params));
});

app.post('/api/pemesanan', auth, (req, res) => {
  const { ruangan_id, name, biro_id, tanggal, mulai, selesai, pic, catatan } = req.body;
  if (!ruangan_id || !name || !tanggal || !mulai || !selesai)
    return res.status(400).json({ error: 'Field wajib: ruangan_id, name, tanggal, mulai, selesai' });

  const clash = db.prepare(`
    SELECT id FROM pemesanan
    WHERE ruangan_id=? AND tanggal=? AND mulai < ? AND selesai > ?
  `).get(ruangan_id, tanggal, selesai, mulai);
  if (clash) return res.status(409).json({ error: 'Ruangan sudah dipesan pada waktu tersebut' });

  const result = db.prepare(`
    INSERT INTO pemesanan (ruangan_id,name,biro_id,tanggal,mulai,selesai,pic,catatan)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(ruangan_id, name, biro_id || null, tanggal, mulai, selesai, pic || '', catatan || '');
  res.status(201).json({ id: result.lastInsertRowid, message: 'Berhasil disimpan' });
});

app.delete('/api/pemesanan/:id', auth, (req, res) => {
  db.prepare('DELETE FROM pemesanan WHERE id=?').run(req.params.id);
  res.json({ message: 'Berhasil dihapus' });
});

app.put('/api/pemesanan/:id', auth, (req, res) => {
  const { name, biro_id, tanggal, mulai, selesai, pic, catatan } = req.body;
  db.prepare(`
    UPDATE pemesanan SET name=?,biro_id=?,tanggal=?,mulai=?,selesai=?,pic=?,catatan=? WHERE id=?
  `).run(name, biro_id || null, tanggal, mulai, selesai, pic || '', catatan || '', req.params.id);
  res.json({ message: 'Berhasil diperbarui' });
});

// ── KEGIATAN ──────────────────────────────────────────────────────────────────

app.get('/api/kegiatan', auth, (req, res) => {
  const { bulan, tanggal } = req.query;
  let query = `
    SELECT k.*, b.name as biro_name
    FROM kegiatan k LEFT JOIN biro b ON b.id = k.biro_id
  `;
  const conds = [], params = [];
  if (tanggal) { conds.push('k.tanggal=?'); params.push(tanggal); }
  if (bulan) { conds.push("strftime('%Y-%m', k.tanggal)=?"); params.push(bulan); }
  if (conds.length) query += ' WHERE ' + conds.join(' AND ');
  query += ' ORDER BY k.tanggal, k.waktu';
  res.json(db.prepare(query).all(...params));
});

app.post('/api/kegiatan', auth, (req, res) => {
  const { name, biro_id, tanggal, waktu, catatan } = req.body;
  if (!name || !tanggal || !waktu)
    return res.status(400).json({ error: 'Field wajib: name, tanggal, waktu' });
  const result = db.prepare(`
    INSERT INTO kegiatan (name,biro_id,tanggal,waktu,catatan) VALUES (?,?,?,?,?)
  `).run(name, biro_id || null, tanggal, waktu, catatan || '');
  res.status(201).json({ id: result.lastInsertRowid, message: 'Berhasil disimpan' });
});

app.delete('/api/kegiatan/:id', auth, (req, res) => {
  db.prepare('DELETE FROM kegiatan WHERE id=?').run(req.params.id);
  res.json({ message: 'Berhasil dihapus' });
});

app.put('/api/kegiatan/:id', auth, (req, res) => {
  const { name, biro_id, tanggal, waktu, catatan } = req.body;
  db.prepare(`
    UPDATE kegiatan SET name=?,biro_id=?,tanggal=?,waktu=?,catatan=? WHERE id=?
  `).run(name, biro_id || null, tanggal, waktu, catatan || '', req.params.id);
  res.json({ message: 'Berhasil diperbarui' });
});

// ── KEUANGAN ──────────────────────────────────────────────────────────────────

app.get('/api/keuangan', auth, (req, res) => {
  const { bulan } = req.query;
  let query = `
    SELECT k.*, b.name as biro_name FROM keuangan k LEFT JOIN biro b ON b.id=k.biro_id
  `;
  const params = [];
  if (bulan) { query += " WHERE strftime('%Y-%m', k.tanggal)=?"; params.push(bulan); }
  query += ' ORDER BY k.tanggal DESC';
  const rows = db.prepare(query).all(...params);
  const total_masuk = rows.filter(r => r.tipe === 'masuk').reduce((s, r) => s + r.jumlah, 0);
  const total_keluar = rows.filter(r => r.tipe === 'keluar').reduce((s, r) => s + r.jumlah, 0);
  res.json({ transaksi: rows, total_masuk, total_keluar, saldo: total_masuk - total_keluar });
});

app.post('/api/keuangan', auth, (req, res) => {
  const { tipe, jumlah, keterangan, biro_id, tanggal } = req.body;
  if (!tipe || !jumlah || !keterangan || !tanggal)
    return res.status(400).json({ error: 'Field wajib: tipe, jumlah, keterangan, tanggal' });
  const result = db.prepare(`
    INSERT INTO keuangan (tipe,jumlah,keterangan,biro_id,tanggal) VALUES (?,?,?,?,?)
  `).run(tipe, jumlah, keterangan, biro_id || null, tanggal);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.delete('/api/keuangan/:id', auth, (req, res) => {
  db.prepare('DELETE FROM keuangan WHERE id=?').run(req.params.id);
  res.json({ message: 'Berhasil dihapus' });
});

// ── PENGUMUMAN ────────────────────────────────────────────────────────────────

app.get('/api/pengumuman', auth, (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, b.name as biro_name FROM pengumuman p LEFT JOIN biro b ON b.id=p.biro_id
    ORDER BY p.tanggal DESC LIMIT 50
  `).all();
  res.json(rows);
});

app.post('/api/pengumuman', auth, (req, res) => {
  const { judul, isi, biro_id, tanggal } = req.body;
  if (!judul || !isi || !tanggal)
    return res.status(400).json({ error: 'Field wajib: judul, isi, tanggal' });
  const result = db.prepare(`
    INSERT INTO pengumuman (judul,isi,biro_id,tanggal) VALUES (?,?,?,?)
  `).run(judul, isi, biro_id || null, tanggal);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.delete('/api/pengumuman/:id', auth, (req, res) => {
  db.prepare('DELETE FROM pengumuman WHERE id=?').run(req.params.id);
  res.json({ message: 'Berhasil dihapus' });
});

// ── DASHBOARD STATS ───────────────────────────────────────────────────────────

app.get('/api/dashboard', auth, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const bulan = today.substring(0, 7);

  const booking_hari_ini = db.prepare(`
    SELECT p.*, r.name as ruangan_name, r.lantai, b.name as biro_name
    FROM pemesanan p LEFT JOIN ruangan r ON r.id=p.ruangan_id LEFT JOIN biro b ON b.id=p.biro_id
    WHERE p.tanggal=? ORDER BY p.mulai
  `).all(today);

  const kegiatan_mendatang = db.prepare(`
    SELECT k.*, b.name as biro_name FROM kegiatan k LEFT JOIN biro b ON b.id=k.biro_id
    WHERE k.tanggal >= ? ORDER BY k.tanggal, k.waktu LIMIT 5
  `).all(today);

  const keuangan = db.prepare(`
    SELECT tipe, SUM(jumlah) as total FROM keuangan WHERE strftime('%Y-%m',tanggal)=? GROUP BY tipe
  `).all(bulan);

  const masuk = keuangan.find(r => r.tipe === 'masuk')?.total || 0;
  const keluar = keuangan.find(r => r.tipe === 'keluar')?.total || 0;

  const pengumuman_terbaru = db.prepare(`
    SELECT p.*, b.name as biro_name FROM pengumuman p LEFT JOIN biro b ON b.id=p.biro_id
    ORDER BY p.tanggal DESC LIMIT 3
  `).all();

  res.json({
    stats: {
      total_biro: db.prepare('SELECT COUNT(*) as c FROM biro').get().c,
      total_ruangan: db.prepare('SELECT COUNT(*) as c FROM ruangan').get().c,
      booking_hari_ini: booking_hari_ini.length,
      kegiatan_bulan_ini: db.prepare("SELECT COUNT(*) as c FROM kegiatan WHERE strftime('%Y-%m',tanggal)=?").get(bulan).c,
      saldo_bulan_ini: masuk - keluar,
    },
    booking_hari_ini,
    kegiatan_mendatang,
    pengumuman_terbaru,
  });
});

app.listen(PORT, () => console.log(`Masjid API berjalan di port ${PORT}`));

// ── TAMU ──────────────────────────────────────────────────────────────────────

app.get('/api/tamu', auth, (req, res) => {
  const { dari, sampai, bulan } = req.query;
  let query = `
    SELECT t.*, r.name as ruangan_name, r.lantai as ruangan_lantai
    FROM tamu t LEFT JOIN ruangan r ON r.id = t.ruangan_id
  `;
  const conds = [], params = [];
  if (dari) { conds.push('t.tanggal >= ?'); params.push(dari); }
  if (sampai) { conds.push('t.tanggal <= ?'); params.push(sampai); }
  if (bulan) { conds.push("strftime('%Y-%m', t.tanggal) = ?"); params.push(bulan); }
  if (conds.length) query += ' WHERE ' + conds.join(' AND ');
  query += ' ORDER BY t.tanggal ASC, t.jam ASC';
  res.json(db.prepare(query).all(...params));
});

app.post('/api/tamu', auth, (req, res) => {
  const { hari, tanggal, jam, rombongan, jumlah, keterangan, pemateri, ruangan_id, cp_nama, cp_wa, catatan } = req.body;
  if (!hari || !tanggal || !jam || !rombongan)
    return res.status(400).json({ error: 'Field wajib: hari, tanggal, jam, rombongan' });
  const result = db.prepare(`
    INSERT INTO tamu (hari,tanggal,jam,rombongan,jumlah,keterangan,pemateri,ruangan_id,cp_nama,cp_wa,catatan)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).run(hari, tanggal, jam, rombongan, jumlah||0, keterangan||'STUDI BANDING', pemateri||'', ruangan_id||'', cp_nama||'', cp_wa||'', catatan||'');
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put('/api/tamu/:id', auth, (req, res) => {
  const { hari, tanggal, jam, rombongan, jumlah, keterangan, pemateri, ruangan_id, cp_nama, cp_wa, catatan } = req.body;
  db.prepare(`
    UPDATE tamu SET hari=?,tanggal=?,jam=?,rombongan=?,jumlah=?,keterangan=?,pemateri=?,ruangan_id=?,cp_nama=?,cp_wa=?,catatan=? WHERE id=?
  `).run(hari, tanggal, jam, rombongan, jumlah||0, keterangan||'STUDI BANDING', pemateri||'', ruangan_id||'', cp_nama||'', cp_wa||'', catatan||'', req.params.id);
  res.json({ message: 'Berhasil diperbarui' });
});

app.delete('/api/tamu/:id', auth, (req, res) => {
  db.prepare('DELETE FROM tamu WHERE id=?').run(req.params.id);
  res.json({ message: 'Berhasil dihapus' });
});
