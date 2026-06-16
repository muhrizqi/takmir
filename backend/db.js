const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://masjid:masjid_secret_2024@localhost:5432/masjid',
  ssl: process.env.NODE_ENV === 'production' && process.env.DATABASE_URL?.includes('amazonaws') 
    ? { rejectUnauthorized: false } : false
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

async function initDB() {
  // Buat semua tabel
  await query(`
    CREATE TABLE IF NOT EXISTS bidang (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS biro (
      id INTEGER PRIMARY KEY,
      bidang_id TEXT NOT NULL REFERENCES bidang(id),
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS biro_anggota (
      id SERIAL PRIMARY KEY,
      biro_id INTEGER NOT NULL REFERENCES biro(id),
      nama TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ruangan (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      lantai INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kegiatan_rutin (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      biro_id INTEGER REFERENCES biro(id),
      ruangan_id TEXT REFERENCES ruangan(id),
      hari_minggu INTEGER NOT NULL, -- 0=Ahad, 1=Senin, ..., 6=Sabtu
      jam_mulai TEXT NOT NULL,
      jam_selesai TEXT NOT NULL,
      catatan TEXT DEFAULT '',
      aktif BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS kegiatan_rutin_libur (
      id SERIAL PRIMARY KEY,
      rutin_id INTEGER NOT NULL REFERENCES kegiatan_rutin(id) ON DELETE CASCADE,
      tanggal TEXT NOT NULL,
      alasan TEXT DEFAULT '',
      UNIQUE(rutin_id, tanggal)
    );

    CREATE TABLE IF NOT EXISTS kegiatan (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      biro_id INTEGER REFERENCES biro(id),
      ruangan_id TEXT REFERENCES ruangan(id),
      tanggal TEXT NOT NULL,
      jam_mulai TEXT NOT NULL,
      jam_selesai TEXT NOT NULL,
      catatan TEXT DEFAULT '',
      rutin_id INTEGER REFERENCES kegiatan_rutin(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pemesanan (
      id SERIAL PRIMARY KEY,
      ruangan_id TEXT NOT NULL REFERENCES ruangan(id),
      name TEXT NOT NULL,
      biro_id INTEGER REFERENCES biro(id),
      tanggal TEXT NOT NULL,
      mulai TEXT NOT NULL,
      selesai TEXT NOT NULL,
      pic TEXT DEFAULT '',
      catatan TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS keuangan (
      id SERIAL PRIMARY KEY,
      tipe TEXT NOT NULL CHECK(tipe IN ('masuk','keluar')),
      jumlah BIGINT NOT NULL,
      keterangan TEXT NOT NULL,
      biro_id INTEGER REFERENCES biro(id),
      tanggal TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pengumuman (
      id SERIAL PRIMARY KEY,
      judul TEXT NOT NULL,
      isi TEXT NOT NULL,
      biro_id INTEGER REFERENCES biro(id),
      tanggal TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tamu (
      id SERIAL PRIMARY KEY,
      hari TEXT NOT NULL,
      tanggal TEXT NOT NULL,
      jam TEXT NOT NULL,
      rombongan TEXT NOT NULL,
      jumlah INTEGER DEFAULT 0,
      keterangan TEXT DEFAULT 'STUDI BANDING',
      pemateri TEXT DEFAULT '',
      ruangan_id TEXT REFERENCES ruangan(id),
      cp_nama TEXT DEFAULT '',
      cp_wa TEXT DEFAULT '',
      catatan TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'operator'
    );
  `);

  // Cek apakah sudah ada seed data
  const { rows } = await query('SELECT COUNT(*) as c FROM bidang');
  if (parseInt(rows[0].c) === 0) {
    await seedData();
  }
}

async function seedData() {
  console.log('Seeding data awal...');

  // Bidang
  await query(`INSERT INTO bidang VALUES
    ('b1','Bidang 1 — Pembinaan & Kemasyarakatan','#1D9E75'),
    ('b2','Bidang 2 — Ibadah & Kerohanian','#378ADD'),
    ('b3','Bidang 3 — Seni, Budaya & Humas','#BA7517'),
    ('b4','Bidang 4 — Pembangunan & Operasional','#D85A30')
    ON CONFLICT DO NOTHING`);

  // Biro
  const biros = [
    [1,'b1','Pembinaan HAMAS'],
    [2,'b1','Pembinaan RMJ'],
    [3,'b1','Ummida'],
    [4,'b1','Kurma'],
    [5,'b1','IKS (Ikatan Keluarga Sakinah)'],
    [6,'b1','Kuliah Subuh & Pembinaan Jamaah'],
    [7,'b2','Pembinaan Ibadah Haji & Umroh'],
    [8,'b2','Pembinaan Imam dan Muadzin'],
    [9,'b2','Pembinaan Muallaf'],
    [10,'b2','Ibadah dan Relawan Jumat'],
    [11,'b2','Tadarus, Tahsin & Tahfidz'],
    [12,'b2','Perawatan Jenazah'],
    [13,'b2','Pendidikan dan Pengkajian Islam'],
    [14,'b3','Seni dan Budaya'],
    [15,'b3','Teknologi Informasi'],
    [16,'b3','Humas, Media, dan Dokumentasi'],
    [17,'b3','Pelatihan & Pengembangan Manajemen Masjid'],
    [18,'b3','Perpustakaan (Literasi / Working Space)'],
    [19,'b3','Binaan Dakwah'],
    [20,'b3','Koordinator Jamaah'],
    [21,'b4','Pembangunan'],
    [22,'b4','Rumah Tangga'],
    [23,'b4','Keamanan'],
    [24,'b4','Relawan Masjid Jogokariyan'],
    [25,'b4','Donor Darah'],
    [26,'b4','Hukum dan Advokasi'],
    [27,'b4','Pemberdayaan Ekonomi'],
    [28,'b4','Klinik & Kesehatan'],
    [29,'b4','Olahraga'],
  ];
  for (const [id, bid, name] of biros) {
    await query('INSERT INTO biro VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [id, bid, name]);
  }

  // Anggota biro
  const anggota = [
    [1,['Muhammad Hasan Habib','Adhi Maryanto','Nursanti Riyadh','Kanahel Huttaqi','Rachmi Husna','Zulfa Hayah','Enggar Haryo P','M Said Hasnan']],
    [2,['Tyas Ikhsan','Difla Yustisia','Swasta Gustami','Haidar','Istiqomah Markhami','Heru Nurinto','Nursanti Riyadh']],
    [3,['Liya Triyani','Dina Andriana','Nursanti Riyadh','Wahyuni Sri Winasih']],
    [4,['Adhi Maryanto','Muhammad Fibran','Eryo Sasongko','Muhammad Ikhlas','Ledianto Bangun','Muhammad Galang Wibisono','Ahmeda Aulia N','Eko Hidayatul Fikri']],
    [5,['Ari Suranto','Imam Supardi','H. Djupari','Drs. Ngadiyana','Tri Janu Harmadi','Iwan Arif Darmawan']],
    [6,['Rosyidi','Subandi Suyuti','Dr. Abdul Wahid','Dr. Nuruddin','Qomari S.Pd','M Falakhul Insan','Ibu dra. Alice M.Hum','Ibu Anis ASP','Ibu Erin Septy','Audi Ziyad']],
    [7,['Subandi Suyuti Bc.Hk','Gitta Welly Ariadi','Edy Siswo','Abdulrahman Hantiar','Sri Wahyuning','Sri Kadarwati','Sri Rahayu','Karsiyah','Sukartinah','Endang','Amiruddin Hamzah','Ibu Sudiyah','Bp Djupari','Joko Waskito']],
    [8,['Gitta Welly Ariadi','Wahyu Wijayanto','Syubban Rizali Noor','Imam Supardi','Haidar Muhammad Tilmitsani']],
    [9,['Imam Supardi','Hasti Utami','Sri Rahayu','Syubban Rizali','Rosyidi','Gitta Welly Ariadi','Liya Triyani','Indra Astuti']],
    [10,['Noor Said','Sutarno','Enggar Haryo','Bambang Wisnu','Anugerah Yoga','Amiruddin Hamzah']],
    [11,['Tsalits Ikhwan S','Bu Alice','Falakhul Insan','Syafiq Hamzah','Sri Lestari','Karsiyah','Deliawan','Maulida Sofa','Azizah Meysha Erbyandhini','Rachmi Husna','Indra']],
    [12,['Anjang Noor Rahman','Ibu Maryati Furqoni','Edi Suratno','Supadmi','Iwan Arif Darmawan','Siti Sudiyah','Zakiah Ahmad Wasto','Edi Mahrus','Noor Rohmah','Sri Lestari']],
    [13,['Rizkibaldi Munada','Syafiq Hamzah','Subandi Suyuti','Hanif Wafdanuri','Dimas Ammar','Adifa Setyawan']],
    [14,['Rusdi Harminta','Dr. Andre Indrawan','Kendy Yudita','Dewi Andriani','Nurchandra Purwandari','Supradiono','Bambang Wisnu']],
    [15,['Zaki Aflahdiyag','MHD. Ismail Nawri Nasution S.Kom','Krishna Yuniar']],
    [16,['Adhi Maryanto','Ananda Eka','Krisna Agustya P','Naufal Pasca','Robi Sumarwan','Farhan Hahan','Krishna']],
    [17,['Enggar Haryo P','Rizkibaldi Munada','Ibu Siti Anisah','Gitta Welly Ariadi','Swasta Gustami','Sri Rahayu']],
    [18,['Muhakim Ibnu Komar','Falakhul Insan','Salma Intifada','Arifah Nurita','Istighfari Ayuningtyas']],
    [19,['drh. Agus Abadiyanto','Affan Priyono','Suratno','Rahmat Aryfin','Drs Nukman Gunadi MA']],
    [20,['Mujiono (RW 09)','Eko Teguh (RW 10)','M. Jazir ASP (RW 11)','Agus Triyatno (RW 12)']],
    [21,['Yushna Septian','Ali Rosyadi','Ridwan Shodiq','Dimas Fibran','Moh Bintang Pandu Gunawan']],
    [22,['Riyadi Agustono','Sukarni','Marsuti','Murjinten/Mbah Nen','Juriyah','Bandijah','Suprih','Alfian','Budi Tomo','Bambang Wisnugroho','Sri Lestari']],
    [23,['Joko Purnomo','Mujiraharjo','Agung Nugroho','Agus Trianto','Cancer Tri Yulianto','Irfan Sofyan','Arief Bianto','Supri Hartanto','Chaeruddin','Purnomo','Wahyu Widayat','Aditya Fathoni','Aminudin','Azmi','Muhammad Diwan','Tri Agus Sulistyo']],
    [24,['Totok Sugiraharto','Rais bin Durahman','Eko Teguh','Aunurrofiq','Abdulrahman Hantiar','Aris','Kuswanto','Suratno','Intan','Yeti','Patma','Khair','Tia','Rofiq','Tsalits Ikhwan']],
    [25,['Noordian M Nugraha','Ali Riyanto','Ari Suranto','Aji Setiawan','Bagas Wibisono','Teguh Santoso','Shydan']],
    [26,['Mustofa','Haikal Imaduddin S.H','Rudi Fadillah S.H.','Ismail Thoha','Swasta Gustami','Rizkia Lubis','Agus Triyatno']],
    [27,['Jardiyanto','Shahru Syaifuddin','Abdulrahman Hantiar','Aunurrofiq','Tsalits Ikhwan S','Erin','Firdaus','Aris Untoro']],
    [28,['Heru Nurinto','Ana Adina P','Husna Nur L','Istighfari Ayuningtyas','Eko Teguh','Kholida Fauziyah','Intan','Yunita Andhini Putri','Liza Husna Lubis','Tazkia Kamila','Indah Sari','Nadhifa']],
    [29,['Taufiq Nur Setiawan','Wahyu Bintoro','Sardi','Aris Untoro','Adhi Maryanto','Rusdi Harminto','Ledian Saputra']],
  ];
  for (const [biroId, members] of anggota) {
    for (const nama of members) {
      await query('INSERT INTO biro_anggota (biro_id, nama) VALUES ($1,$2)', [biroId, nama]);
    }
  }

  // Ruangan
  const ruangan = [
    ['r1','Ruang Utama',1],['r2','Serambi Selatan',1],['r3','Serambi Utara',1],
    ['r4','Serambi Timur',1],['r5','Ruang Media',1],['r6','Depan Logo Masjid',1],['r7','Kantor Takmir',1],
    ['r8','Aula Lantai 2',2],['r9','Ruang Sholat Utara',2],['r10','Ruang Sholat Selatan',2],
    ['r11','Ruang Sholat Karpet Coklat',2],['r12','Ruang RMJ',2],
    ['r13','Aula Lantai 3',3],['r14','Ruang Duduk Penginapan',3],
  ];
  for (const [id, name, lantai] of ruangan) {
    await query('INSERT INTO ruangan VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [id, name, lantai]);
  }

  // Users
  await query(`INSERT INTO users (username,password,role) VALUES
    ('admin','admin123','admin'),
    ('takmir','takmir123','operator'),
    ('manajemen','manajemen123','manajemen')
    ON CONFLICT DO NOTHING`);

  // Contoh kegiatan rutin
  await query(`INSERT INTO kegiatan_rutin (name, biro_id, ruangan_id, hari_minggu, jam_mulai, jam_selesai, catatan)
    VALUES ('Kajian Subuh', 6, 'r1', 0, '05:00', '06:30', 'Kajian rutin setiap Ahad pagi')
    ON CONFLICT DO NOTHING`);

  console.log('Seed data selesai!');
}

module.exports = { query, initDB };
