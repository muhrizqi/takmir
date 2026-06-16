const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { query, initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'masjid-jogokariyan-secret-dev';

app.use(cors());
app.use(express.json());

// Inisialisasi DB saat startup
initDB().then(() => {
  console.log('Database siap');
}).catch(err => {
  console.error('Database error:', err);
  process.exit(1);
});

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

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const { rows } = await query('SELECT * FROM users WHERE username=$1 AND password=$2', [username, password]);
    if (!rows.length) return res.status(401).json({ error: 'Username atau password salah' });
    const user = rows[0];
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── BIDANG & BIRO ─────────────────────────────────────────────────────────────

app.get('/api/biro', auth, async (req, res) => {
  try {
    const { rows: bidang } = await query('SELECT * FROM bidang ORDER BY id');
    const { rows: biros } = await query(`
      SELECT b.*, COUNT(a.id)::int as jumlah_anggota 
      FROM biro b LEFT JOIN biro_anggota a ON a.biro_id=b.id 
      GROUP BY b.id ORDER BY b.id
    `);
    const result = bidang.map(bd => ({
      ...bd, biros: biros.filter(b => b.bidang_id === bd.id)
    }));
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/biro/:id', auth, async (req, res) => {
  try {
    const { rows: biro } = await query('SELECT * FROM biro WHERE id=$1', [req.params.id]);
    if (!biro.length) return res.status(404).json({ error: 'Biro tidak ditemukan' });
    const { rows: anggota } = await query('SELECT * FROM biro_anggota WHERE biro_id=$1 ORDER BY id', [req.params.id]);
    res.json({ ...biro[0], anggota });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── RUANGAN ───────────────────────────────────────────────────────────────────

app.get('/api/ruangan', auth, async (req, res) => {
  try {
    const { tanggal } = req.query;
    const { rows: ruangan } = await query('SELECT * FROM ruangan ORDER BY lantai, id');
    if (tanggal) {
      const { rows: bookings } = await query(
        'SELECT ruangan_id, mulai, selesai FROM pemesanan WHERE tanggal=$1', [tanggal]
      );
      const { rows: kgToday } = await query(
        'SELECT ruangan_id, jam_mulai, jam_selesai FROM kegiatan WHERE tanggal=$1 AND ruangan_id IS NOT NULL', [tanggal]
      );
      const result = ruangan.map(r => {
        const bks = bookings.filter(b => b.ruangan_id === r.id);
        const kgs = kgToday.filter(k => k.ruangan_id === r.id);
        const total = bks.length + kgs.length;
        let status = 'tersedia';
        if (total >= 3) status = 'penuh';
        else if (total > 0) status = 'sebagian';
        return { ...r, status, jumlah_booking: total };
      });
      return res.json(result);
    }
    res.json(ruangan);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Timeline ruangan per hari
app.get('/api/ruangan/timeline', auth, async (req, res) => {
  try {
    const { tanggal, ruangan_id } = req.query;
    if (!tanggal || !ruangan_id) return res.status(400).json({ error: 'tanggal dan ruangan_id diperlukan' });

    const { rows: pemesanan } = await query(`
      SELECT 'pemesanan' as sumber, p.name, p.mulai as jam_mulai, p.selesai as jam_selesai,
             b.name as biro_name, p.catatan
      FROM pemesanan p LEFT JOIN biro b ON b.id=p.biro_id
      WHERE p.tanggal=$1 AND p.ruangan_id=$2
    `, [tanggal, ruangan_id]);

    const { rows: kegiatan } = await query(`
      SELECT 'kegiatan' as sumber, k.name, k.jam_mulai, k.jam_selesai,
             b.name as biro_name, k.catatan, k.rutin_id
      FROM kegiatan k LEFT JOIN biro b ON b.id=k.biro_id
      WHERE k.tanggal=$1 AND k.ruangan_id=$2
    `, [tanggal, ruangan_id]);

    const all = [...pemesanan, ...kegiatan].sort((a, b) => a.jam_mulai.localeCompare(b.jam_mulai));
    res.json(all);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── KEGIATAN RUTIN ────────────────────────────────────────────────────────────

app.get('/api/kegiatan-rutin', auth, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT kr.*, b.name as biro_name, r.name as ruangan_name, r.lantai
      FROM kegiatan_rutin kr 
      LEFT JOIN biro b ON b.id=kr.biro_id
      LEFT JOIN ruangan r ON r.id=kr.ruangan_id
      WHERE kr.aktif=true
      ORDER BY kr.hari_minggu, kr.jam_mulai
    `);
    // Sertakan daftar libur per rutin
    for (const r of rows) {
      const { rows: libur } = await query(
        'SELECT tanggal, alasan FROM kegiatan_rutin_libur WHERE rutin_id=$1 ORDER BY tanggal', [r.id]
      );
      r.libur = libur;
    }
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/kegiatan-rutin', auth, async (req, res) => {
  try {
    const { name, biro_id, ruangan_id, hari_minggu, jam_mulai, jam_selesai, catatan } = req.body;
    if (!name || hari_minggu === undefined || !jam_mulai || !jam_selesai)
      return res.status(400).json({ error: 'Field wajib: name, hari_minggu, jam_mulai, jam_selesai' });
    const { rows } = await query(`
      INSERT INTO kegiatan_rutin (name, biro_id, ruangan_id, hari_minggu, jam_mulai, jam_selesai, catatan)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id
    `, [name, biro_id||null, ruangan_id||null, hari_minggu, jam_mulai, jam_selesai, catatan||'']);
    res.status(201).json({ id: rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/kegiatan-rutin/:id', auth, async (req, res) => {
  try {
    const { name, biro_id, ruangan_id, hari_minggu, jam_mulai, jam_selesai, catatan, aktif } = req.body;
    await query(`
      UPDATE kegiatan_rutin SET name=$1,biro_id=$2,ruangan_id=$3,hari_minggu=$4,
      jam_mulai=$5,jam_selesai=$6,catatan=$7,aktif=$8 WHERE id=$9
    `, [name, biro_id||null, ruangan_id||null, hari_minggu, jam_mulai, jam_selesai, catatan||'', aktif !== false, req.params.id]);
    res.json({ message: 'Berhasil diperbarui' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Hapus seluruh kegiatan rutin (nonaktifkan)
app.delete('/api/kegiatan-rutin/:id', auth, async (req, res) => {
  try {
    await query('UPDATE kegiatan_rutin SET aktif=false WHERE id=$1', [req.params.id]);
    res.json({ message: 'Kegiatan rutin dihentikan' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Tambah libur / pengecualian tanggal tertentu
app.post('/api/kegiatan-rutin/:id/libur', auth, async (req, res) => {
  try {
    const { tanggal, alasan } = req.body;
    if (!tanggal) return res.status(400).json({ error: 'tanggal diperlukan' });
    await query(`
      INSERT INTO kegiatan_rutin_libur (rutin_id, tanggal, alasan)
      VALUES ($1,$2,$3) ON CONFLICT (rutin_id, tanggal) DO UPDATE SET alasan=$3
    `, [req.params.id, tanggal, alasan||'']);
    res.status(201).json({ message: 'Libur ditambahkan' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Hapus libur
app.delete('/api/kegiatan-rutin/:id/libur/:tanggal', auth, async (req, res) => {
  try {
    await query('DELETE FROM kegiatan_rutin_libur WHERE rutin_id=$1 AND tanggal=$2',
      [req.params.id, req.params.tanggal]);
    res.json({ message: 'Libur dihapus' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── KEGIATAN ──────────────────────────────────────────────────────────────────

// Helper: generate kegiatan rutin untuk suatu bulan
async function getKegiatanRutin(bulan) {
  const [yr, mn] = bulan.split('-').map(Number);
  const daysInMonth = new Date(yr, mn, 0).getDate();

  // Ambil semua rutin aktif
  const { rows: rutins } = await query(`
    SELECT kr.*, b.name as biro_name, r.name as ruangan_name
    FROM kegiatan_rutin kr
    LEFT JOIN biro b ON b.id=kr.biro_id
    LEFT JOIN ruangan r ON r.id=kr.ruangan_id
    WHERE kr.aktif=true
  `);

  // Ambil semua libur dalam bulan ini
  const { rows: liburs } = await query(`
    SELECT krl.rutin_id, krl.tanggal FROM kegiatan_rutin_libur krl
    WHERE tanggal LIKE $1
  `, [`${bulan}%`]);

  // Ambil tanggal yang sudah dibuat sebagai kegiatan manual dari rutin ini
  const { rows: sudahAda } = await query(`
    SELECT rutin_id, tanggal FROM kegiatan 
    WHERE tanggal LIKE $1 AND rutin_id IS NOT NULL
  `, [`${bulan}%`]);

  const hasil = [];
  for (const rutin of rutins) {
    const liburTanggal = liburs.filter(l => l.rutin_id === rutin.id).map(l => l.tanggal);
    const sudahTanggal = sudahAda.filter(s => s.rutin_id === rutin.id).map(s => s.tanggal);

    for (let d = 1; d <= daysInMonth; d++) {
      const tgl = `${yr}-${String(mn).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayOfWeek = new Date(tgl + 'T00:00:00').getDay(); // 0=Sun
      if (dayOfWeek !== rutin.hari_minggu) continue;
      if (liburTanggal.includes(tgl)) continue;
      if (sudahTanggal.includes(tgl)) continue; // sudah dibuat jangan duplikat

      hasil.push({
        id: `rutin-${rutin.id}-${tgl}`,
        name: rutin.name,
        tanggal: tgl,
        jam_mulai: rutin.jam_mulai,
        jam_selesai: rutin.jam_selesai,
        catatan: rutin.catatan,
        biro_name: rutin.biro_name,
        ruangan_id: rutin.ruangan_id,
        ruangan_name: rutin.ruangan_name,
        sumber: 'rutin',
        rutin_id: rutin.id,
      });
    }
  }
  return hasil;
}

app.get('/api/kegiatan', auth, async (req, res) => {
  try {
    const { bulan, tanggal } = req.query;

    // Kegiatan manual
    let q = `
      SELECT k.id, k.name, k.tanggal, k.jam_mulai, k.jam_selesai, k.catatan,
             k.rutin_id, k.ruangan_id,
             b.name as biro_name, r.name as ruangan_name,
             'kegiatan' as sumber
      FROM kegiatan k 
      LEFT JOIN biro b ON b.id=k.biro_id
      LEFT JOIN ruangan r ON r.id=k.ruangan_id
    `;
    const params = [];
    const conds = [];
    if (tanggal) { conds.push(`k.tanggal=$${params.length+1}`); params.push(tanggal); }
    if (bulan) { conds.push(`k.tanggal LIKE $${params.length+1}`); params.push(`${bulan}%`); }
    if (conds.length) q += ' WHERE ' + conds.join(' AND ');
    q += ' ORDER BY k.tanggal, k.jam_mulai';
    const { rows: kegiatan } = await query(q, params);

    // Kegiatan rutin (generate otomatis)
    let rutinItems = [];
    if (bulan) rutinItems = await getKegiatanRutin(bulan);
    if (tanggal) {
      const tglBulan = tanggal.substring(0, 7);
      const allRutin = await getKegiatanRutin(tglBulan);
      rutinItems = allRutin.filter(r => r.tanggal === tanggal);
    }

    // Tamu sebagai kegiatan
    let q2 = `
      SELECT t.id, t.rombongan as name, t.tanggal, t.jam as jam_mulai,
             t.jam as jam_selesai, t.keterangan as catatan,
             'Manajemen Masjid' as biro_name, 'tamu' as sumber,
             t.jumlah, t.pemateri, t.keterangan, t.hari,
             r.name as ruangan_name, t.ruangan_id
      FROM tamu t LEFT JOIN ruangan r ON r.id=t.ruangan_id
    `;
    const conds2 = [], params2 = [];
    if (tanggal) { conds2.push(`t.tanggal=$${params2.length+1}`); params2.push(tanggal); }
    if (bulan) { conds2.push(`t.tanggal LIKE $${params2.length+1}`); params2.push(`${bulan}%`); }
    if (conds2.length) q2 += ' WHERE ' + conds2.join(' AND ');
    const { rows: tamu } = await query(q2, params2);

    const result = [...kegiatan, ...rutinItems, ...tamu].sort((a, b) => {
      if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
      return (a.jam_mulai||'').localeCompare(b.jam_mulai||'');
    });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/kegiatan', auth, async (req, res) => {
  try {
    const { name, biro_id, ruangan_id, tanggal, jam_mulai, jam_selesai, catatan, rutin_id } = req.body;
    if (!name || !tanggal || !jam_mulai || !jam_selesai)
      return res.status(400).json({ error: 'Field wajib: name, tanggal, jam_mulai, jam_selesai' });
    const { rows } = await query(`
      INSERT INTO kegiatan (name,biro_id,ruangan_id,tanggal,jam_mulai,jam_selesai,catatan,rutin_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id
    `, [name, biro_id||null, ruangan_id||null, tanggal, jam_mulai, jam_selesai, catatan||'', rutin_id||null]);
    res.status(201).json({ id: rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/kegiatan/:id', auth, async (req, res) => {
  try {
    const { name, biro_id, ruangan_id, tanggal, jam_mulai, jam_selesai, catatan } = req.body;
    await query(`
      UPDATE kegiatan SET name=$1,biro_id=$2,ruangan_id=$3,tanggal=$4,
      jam_mulai=$5,jam_selesai=$6,catatan=$7 WHERE id=$8
    `, [name, biro_id||null, ruangan_id||null, tanggal, jam_mulai, jam_selesai, catatan||'', req.params.id]);
    res.json({ message: 'Berhasil diperbarui' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/kegiatan/:id', auth, async (req, res) => {
  try {
    await query('DELETE FROM kegiatan WHERE id=$1', [req.params.id]);
    res.json({ message: 'Berhasil dihapus' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PEMESANAN ─────────────────────────────────────────────────────────────────

app.get('/api/pemesanan', auth, async (req, res) => {
  try {
    const { tanggal, ruangan_id, bulan } = req.query;
    let q = `
      SELECT p.*, r.name as ruangan_name, r.lantai, b.name as biro_name
      FROM pemesanan p
      LEFT JOIN ruangan r ON r.id=p.ruangan_id
      LEFT JOIN biro b ON b.id=p.biro_id
    `;
    const conds = [], params = [];
    if (tanggal) { conds.push(`p.tanggal=$${params.length+1}`); params.push(tanggal); }
    if (ruangan_id) { conds.push(`p.ruangan_id=$${params.length+1}`); params.push(ruangan_id); }
    if (bulan) { conds.push(`p.tanggal LIKE $${params.length+1}`); params.push(`${bulan}%`); }
    if (conds.length) q += ' WHERE ' + conds.join(' AND ');
    q += ' ORDER BY p.tanggal, p.mulai';
    const { rows } = await query(q, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/pemesanan', auth, async (req, res) => {
  try {
    const { ruangan_id, name, biro_id, tanggal, mulai, selesai, pic, catatan } = req.body;
    if (!ruangan_id || !name || !tanggal || !mulai || !selesai)
      return res.status(400).json({ error: 'Field wajib tidak lengkap' });
    // Cek konflik
    const { rows: clash } = await query(`
      SELECT id FROM pemesanan 
      WHERE ruangan_id=$1 AND tanggal=$2 AND mulai < $3 AND selesai > $4
    `, [ruangan_id, tanggal, selesai, mulai]);
    if (clash.length) return res.status(409).json({ error: 'Ruangan sudah dipesan pada waktu tersebut' });
    const { rows } = await query(`
      INSERT INTO pemesanan (ruangan_id,name,biro_id,tanggal,mulai,selesai,pic,catatan)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id
    `, [ruangan_id, name, biro_id||null, tanggal, mulai, selesai, pic||'', catatan||'']);
    res.status(201).json({ id: rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/pemesanan/:id', auth, async (req, res) => {
  try {
    const { name, biro_id, tanggal, mulai, selesai, pic, catatan } = req.body;
    await query(`
      UPDATE pemesanan SET name=$1,biro_id=$2,tanggal=$3,mulai=$4,selesai=$5,pic=$6,catatan=$7 WHERE id=$8
    `, [name, biro_id||null, tanggal, mulai, selesai, pic||'', catatan||'', req.params.id]);
    res.json({ message: 'Berhasil diperbarui' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/pemesanan/:id', auth, async (req, res) => {
  try {
    await query('DELETE FROM pemesanan WHERE id=$1', [req.params.id]);
    res.json({ message: 'Berhasil dihapus' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── KEUANGAN ──────────────────────────────────────────────────────────────────

app.get('/api/keuangan', auth, async (req, res) => {
  try {
    const { bulan } = req.query;
    let q = `SELECT k.*, b.name as biro_name FROM keuangan k LEFT JOIN biro b ON b.id=k.biro_id`;
    const params = [];
    if (bulan) { q += ` WHERE k.tanggal LIKE $1`; params.push(`${bulan}%`); }
    q += ' ORDER BY k.tanggal DESC';
    const { rows } = await query(q, params);
    const total_masuk = rows.filter(r=>r.tipe==='masuk').reduce((s,r)=>s+parseInt(r.jumlah),0);
    const total_keluar = rows.filter(r=>r.tipe==='keluar').reduce((s,r)=>s+parseInt(r.jumlah),0);
    res.json({ transaksi: rows, total_masuk, total_keluar, saldo: total_masuk - total_keluar });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/keuangan', auth, async (req, res) => {
  try {
    const { tipe, jumlah, keterangan, biro_id, tanggal } = req.body;
    const { rows } = await query(`
      INSERT INTO keuangan (tipe,jumlah,keterangan,biro_id,tanggal) VALUES ($1,$2,$3,$4,$5) RETURNING id
    `, [tipe, jumlah, keterangan, biro_id||null, tanggal]);
    res.status(201).json({ id: rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/keuangan/:id', auth, async (req, res) => {
  try {
    await query('DELETE FROM keuangan WHERE id=$1', [req.params.id]);
    res.json({ message: 'Berhasil dihapus' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PENGUMUMAN ────────────────────────────────────────────────────────────────

app.get('/api/pengumuman', auth, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT p.*, b.name as biro_name FROM pengumuman p LEFT JOIN biro b ON b.id=p.biro_id
      ORDER BY p.tanggal DESC LIMIT 50
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/pengumuman', auth, async (req, res) => {
  try {
    const { judul, isi, biro_id, tanggal } = req.body;
    const { rows } = await query(`
      INSERT INTO pengumuman (judul,isi,biro_id,tanggal) VALUES ($1,$2,$3,$4) RETURNING id
    `, [judul, isi, biro_id||null, tanggal]);
    res.status(201).json({ id: rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/pengumuman/:id', auth, async (req, res) => {
  try {
    await query('DELETE FROM pengumuman WHERE id=$1', [req.params.id]);
    res.json({ message: 'Berhasil dihapus' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── TAMU ──────────────────────────────────────────────────────────────────────

app.get('/api/tamu', auth, async (req, res) => {
  try {
    const { dari, sampai, bulan } = req.query;
    let q = `
      SELECT t.*, r.name as ruangan_name, r.lantai as ruangan_lantai
      FROM tamu t LEFT JOIN ruangan r ON r.id=t.ruangan_id
    `;
    const conds = [], params = [];
    if (dari) { conds.push(`t.tanggal >= $${params.length+1}`); params.push(dari); }
    if (sampai) { conds.push(`t.tanggal <= $${params.length+1}`); params.push(sampai); }
    if (bulan) { conds.push(`t.tanggal LIKE $${params.length+1}`); params.push(`${bulan}%`); }
    if (conds.length) q += ' WHERE ' + conds.join(' AND ');
    q += ' ORDER BY t.tanggal ASC, t.jam ASC';
    const { rows } = await query(q, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tamu', auth, async (req, res) => {
  try {
    const { hari, tanggal, jam, rombongan, jumlah, keterangan, pemateri, ruangan_id, cp_nama, cp_wa, catatan } = req.body;
    const { rows } = await query(`
      INSERT INTO tamu (hari,tanggal,jam,rombongan,jumlah,keterangan,pemateri,ruangan_id,cp_nama,cp_wa,catatan)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id
    `, [hari, tanggal, jam, rombongan, jumlah||0, keterangan||'STUDI BANDING', pemateri||'', ruangan_id||null, cp_nama||'', cp_wa||'', catatan||'']);
    res.status(201).json({ id: rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/tamu/:id', auth, async (req, res) => {
  try {
    const { hari, tanggal, jam, rombongan, jumlah, keterangan, pemateri, ruangan_id, cp_nama, cp_wa, catatan } = req.body;
    await query(`
      UPDATE tamu SET hari=$1,tanggal=$2,jam=$3,rombongan=$4,jumlah=$5,keterangan=$6,
      pemateri=$7,ruangan_id=$8,cp_nama=$9,cp_wa=$10,catatan=$11 WHERE id=$12
    `, [hari, tanggal, jam, rombongan, jumlah||0, keterangan||'STUDI BANDING', pemateri||'', ruangan_id||null, cp_nama||'', cp_wa||'', catatan||'', req.params.id]);
    res.json({ message: 'Berhasil diperbarui' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/tamu/:id', auth, async (req, res) => {
  try {
    await query('DELETE FROM tamu WHERE id=$1', [req.params.id]);
    res.json({ message: 'Berhasil dihapus' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DASHBOARD ─────────────────────────────────────────────────────────────────

app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const bulan = today.substring(0, 7);

    const { rows: booking_hari_ini } = await query(`
      SELECT p.*, r.name as ruangan_name, r.lantai, b.name as biro_name
      FROM pemesanan p LEFT JOIN ruangan r ON r.id=p.ruangan_id LEFT JOIN biro b ON b.id=p.biro_id
      WHERE p.tanggal=$1 ORDER BY p.mulai
    `, [today]);

    const { rows: kegiatan_mendatang } = await query(`
      SELECT k.*, b.name as biro_name FROM kegiatan k LEFT JOIN biro b ON b.id=k.biro_id
      WHERE k.tanggal >= $1 ORDER BY k.tanggal, k.jam_mulai LIMIT 5
    `, [today]);

    const { rows: keuangan } = await query(`
      SELECT tipe, SUM(jumlah)::bigint as total FROM keuangan 
      WHERE tanggal LIKE $1 GROUP BY tipe
    `, [`${bulan}%`]);

    const masuk = parseInt(keuangan.find(r=>r.tipe==='masuk')?.total || 0);
    const keluar = parseInt(keuangan.find(r=>r.tipe==='keluar')?.total || 0);

    const { rows: pengumuman_terbaru } = await query(`
      SELECT p.*, b.name as biro_name FROM pengumuman p LEFT JOIN biro b ON b.id=p.biro_id
      ORDER BY p.tanggal DESC LIMIT 3
    `);

    const { rows: [{ c: total_biro }] } = await query('SELECT COUNT(*)::int as c FROM biro');
    const { rows: [{ c: total_ruangan }] } = await query('SELECT COUNT(*)::int as c FROM ruangan');
    const { rows: [{ c: kegiatan_bulan }] } = await query(`SELECT COUNT(*)::int as c FROM kegiatan WHERE tanggal LIKE $1`, [`${bulan}%`]);

    res.json({
      stats: {
        total_biro, total_ruangan,
        booking_hari_ini: booking_hari_ini.length,
        kegiatan_bulan_ini: kegiatan_bulan,
        saldo_bulan_ini: masuk - keluar,
      },
      booking_hari_ini,
      kegiatan_mendatang,
      pengumuman_terbaru,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => console.log(`Masjid API v2 berjalan di port ${PORT}`));
