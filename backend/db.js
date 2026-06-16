const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join('/app/data', 'masjid.db');

function initDB() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS bidang (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS biro (
      id INTEGER PRIMARY KEY,
      bidang_id TEXT NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (bidang_id) REFERENCES bidang(id)
    );

    CREATE TABLE IF NOT EXISTS biro_anggota (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      biro_id INTEGER NOT NULL,
      nama TEXT NOT NULL,
      FOREIGN KEY (biro_id) REFERENCES biro(id)
    );

    CREATE TABLE IF NOT EXISTS ruangan (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      lantai INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kegiatan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      biro_id INTEGER,
      tanggal TEXT NOT NULL,
      waktu TEXT NOT NULL,
      ruangan_id TEXT DEFAULT '',
      catatan TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS pemesanan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ruangan_id TEXT NOT NULL,
      name TEXT NOT NULL,
      biro_id INTEGER,
      tanggal TEXT NOT NULL,
      mulai TEXT NOT NULL,
      selesai TEXT NOT NULL,
      pic TEXT DEFAULT '',
      ruangan_id TEXT DEFAULT '',
      catatan TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (ruangan_id) REFERENCES ruangan(id)
    );

    CREATE TABLE IF NOT EXISTS keuangan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipe TEXT NOT NULL CHECK(tipe IN ('masuk','keluar')),
      jumlah INTEGER NOT NULL,
      keterangan TEXT NOT NULL,
      biro_id INTEGER,
      tanggal TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS pengumuman (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      judul TEXT NOT NULL,
      isi TEXT NOT NULL,
      biro_id INTEGER,
      tanggal TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS tamu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hari TEXT NOT NULL,
      tanggal TEXT NOT NULL,
      jam TEXT NOT NULL,
      rombongan TEXT NOT NULL,
      jumlah INTEGER DEFAULT 0,
      keterangan TEXT DEFAULT 'STUDI BANDING',
      pemateri TEXT DEFAULT '',
      cp_nama TEXT DEFAULT '',
      cp_wa TEXT DEFAULT '',
      ruangan_id TEXT DEFAULT '',
      catatan TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'operator'
    );
  `);

  const rowCount = db.prepare('SELECT COUNT(*) as c FROM bidang').get();
  if (rowCount.c === 0) {
    seedData(db);
  }

  return db;
}

function seedData(db) {
  const insertBidang = db.prepare('INSERT OR IGNORE INTO bidang VALUES (?,?,?)');
  const insertBiro = db.prepare('INSERT OR IGNORE INTO biro VALUES (?,?,?)');
  const insertAnggota = db.prepare('INSERT INTO biro_anggota (biro_id, nama) VALUES (?,?)');
  const insertRuangan = db.prepare('INSERT OR IGNORE INTO ruangan VALUES (?,?,?)');
  const insertUser = db.prepare('INSERT OR IGNORE INTO users (username,password,role) VALUES (?,?,?)');

  const seedAll = db.transaction(() => {
    insertBidang.run('b1','Bidang 1 — Pembinaan & Kemasyarakatan','#1D9E75');
    insertBidang.run('b2','Bidang 2 — Ibadah & Kerohanian','#378ADD');
    insertBidang.run('b3','Bidang 3 — Seni, Budaya & Humas','#BA7517');
    insertBidang.run('b4','Bidang 4 — Pembangunan & Operasional','#D85A30');

    const biros = [
      [1,'b1','Pembinaan HAMAS',['Muhammad Hasan Habib','Adhi Maryanto','Nursanti Riyadh','Kanahel Huttaqi','Rachmi Husna','Zulfa Hayah','Enggar Haryo P','M Said Hasnan']],
      [2,'b1','Pembinaan RMJ',['Tyas Ikhsan','Difla Yustisia','Swasta Gustami','Haidar','Istiqomah Markhami','Heru Nurinto','Nursanti Riyadh']],
      [3,'b1','Ummida',['Liya Triyani','Dina Andriana','Nursanti Riyadh','Wahyuni Sri Winasih']],
      [4,'b1','Kurma',['Adhi Maryanto','Muhammad Fibran','Eryo Sasongko','Muhammad Ikhlas','Ledianto Bangun','Muhammad Galang Wibisono','Ahmeda Aulia N','Eko Hidayatul Fikri']],
      [5,'b1','IKS (Ikatan Keluarga Sakinah)',['Ari Suranto','Imam Supardi','H. Djupari','Drs. Ngadiyana','Tri Janu Harmadi','Iwan Arif Darmawan']],
      [6,'b1','Kuliah Subuh & Pembinaan Jamaah',['Rosyidi','Subandi Suyuti','Dr. Abdul Wahid','Dr. Nuruddin','Qomari S.Pd','M Falakhul Insan','Ibu dra. Alice M.Hum','Ibu Anis ASP','Ibu Erin Septy','Audi Ziyad']],
      [7,'b2','Pembinaan Ibadah Haji & Umroh',['Subandi Suyuti Bc.Hk','Gitta Welly Ariadi','Edy Siswo','Abdulrahman Hantiar','Sri Wahyuning','Sri Kadarwati','Sri Rahayu','Karsiyah','Sukartinah','Endang','Amiruddin Hamzah','Ibu Sudiyah','Bp Djupari','Joko Waskito']],
      [8,'b2','Pembinaan Imam dan Muadzin',['Gitta Welly Ariadi','Wahyu Wijayanto','Syubban Rizali Noor','Imam Supardi','Haidar Muhammad Tilmitsani']],
      [9,'b2','Pembinaan Muallaf',['Imam Supardi','Hasti Utami','Sri Rahayu','Syubban Rizali','Rosyidi','Gitta Welly Ariadi','Liya Triyani','Indra Astuti']],
      [10,'b2','Ibadah dan Relawan Jumat',['Noor Said','Sutarno','Enggar Haryo','Bambang Wisnu','Anugerah Yoga','Amiruddin Hamzah']],
      [11,'b2','Tadarus, Tahsin & Tahfidz',['Tsalits Ikhwan S','Bu Alice','Falakhul Insan','Syafiq Hamzah','Sri Lestari','Karsiyah','Deliawan','Maulida Sofa','Azizah Meysha Erbyandhini','Rachmi Husna','Indra']],
      [12,'b2','Perawatan Jenazah',['Anjang Noor Rahman','Ibu Maryati Furqoni','Edi Suratno','Supadmi','Iwan Arif Darmawan','Siti Sudiyah','Zakiah Ahmad Wasto','Edi Mahrus','Noor Rohmah','Sri Lestari']],
      [13,'b2','Pendidikan dan Pengkajian Islam',['Rizkibaldi Munada','Syafiq Hamzah','Subandi Suyuti','Hanif Wafdanuri','Dimas Ammar','Adifa Setyawan']],
      [14,'b3','Seni dan Budaya',['Rusdi Harminta','Dr. Andre Indrawan','Kendy Yudita','Dewi Andriani','Nurchandra Purwandari','Supradiono','Bambang Wisnu']],
      [15,'b3','Teknologi Informasi',['Zaki Aflahdiyag','MHD. Ismail Nawri Nasution S.Kom','Krishna Yuniar']],
      [16,'b3','Humas, Media, dan Dokumentasi',['Adhi Maryanto','Ananda Eka','Krisna Agustya P','Naufal Pasca','Robi Sumarwan','Farhan Hahan','Krishna']],
      [17,'b3','Pelatihan & Pengembangan Manajemen Masjid',['Enggar Haryo P','Rizkibaldi Munada','Ibu Siti Anisah','Gitta Welly Ariadi','Swasta Gustami','Sri Rahayu']],
      [18,'b3','Perpustakaan (Literasi / Working Space)',['Muhakim Ibnu Komar','Falakhul Insan','Salma Intifada','Arifah Nurita','Istighfari Ayuningtyas']],
      [19,'b3','Binaan Dakwah',['drh. Agus Abadiyanto','Affan Priyono','Suratno','Rahmat Aryfin','Drs Nukman Gunadi MA']],
      [20,'b3','Koordinator Jamaah',['Mujiono (RW 09)','Eko Teguh (RW 10)','M. Jazir ASP (RW 11)','Agus Triyatno (RW 12)']],
      [21,'b4','Pembangunan',['Yushna Septian','Ali Rosyadi','Ridwan Shodiq','Dimas Fibran','Moh Bintang Pandu Gunawan']],
      [22,'b4','Rumah Tangga',['Riyadi Agustono','Sukarni','Marsuti','Murjinten/Mbah Nen','Juriyah','Bandijah','Suprih','Alfian','Budi Tomo','Bambang Wisnugroho','Sri Lestari']],
      [23,'b4','Keamanan',['Joko Purnomo','Mujiraharjo','Agung Nugroho','Agus Trianto','Cancer Tri Yulianto','Irfan Sofyan','Arief Bianto','Supri Hartanto','Chaeruddin','Purnomo','Wahyu Widayat','Aditya Fathoni','Aminudin','Azmi','Muhammad Diwan','Tri Agus Sulistyo']],
      [24,'b4','Relawan Masjid Jogokariyan',['Totok Sugiraharto','Rais bin Durahman','Eko Teguh','Aunurrofiq','Abdulrahman Hantiar','Aris','Kuswanto','Suratno','Intan','Yeti','Patma','Khair','Tia','Rofiq','Tsalits Ikhwan']],
      [25,'b4','Donor Darah',['Noordian M Nugraha','Ali Riyanto','Ari Suranto','Aji Setiawan','Bagas Wibisono','Teguh Santoso','Shydan']],
      [26,'b4','Hukum dan Advokasi',['Mustofa','Haikal Imaduddin S.H','Rudi Fadillah S.H.','Ismail Thoha','Swasta Gustami','Rizkia Lubis','Agus Triyatno']],
      [27,'b4','Pemberdayaan Ekonomi',['Jardiyanto','Shahru Syaifuddin','Abdulrahman Hantiar','Aunurrofiq','Tsalits Ikhwan S','Erin','Firdaus','Aris Untoro']],
      [28,'b4','Klinik & Kesehatan',['Heru Nurinto','Ana Adina P','Husna Nur L','Istighfari Ayuningtyas','Eko Teguh','Kholida Fauziyah','Intan','Yunita Andhini Putri','Liza Husna Lubis','Tazkia Kamila','Indah Sari','Nadhifa']],
      [29,'b4','Olahraga',['Taufiq Nur Setiawan','Wahyu Bintoro','Sardi','Aris Untoro','Adhi Maryanto','Rusdi Harminto','Ledian Saputra']],
    ];

    for (const [id, bid, name, members] of biros) {
      insertBiro.run(id, bid, name);
      for (const m of members) insertAnggota.run(id, m);
    }

    const ruangan = [
      ['r1','Ruang Utama',1],['r2','Serambi Selatan',1],['r3','Serambi Utara',1],
      ['r4','Serambi Timur',1],['r5','Ruang Media',1],['r6','Depan Logo Masjid',1],['r7','Kantor Takmir',1],
      ['r8','Aula Lantai 2',2],['r9','Ruang Sholat Utara',2],['r10','Ruang Sholat Selatan',2],
      ['r11','Ruang Sholat Karpet Coklat',2],['r12','Ruang RMJ',2],
      ['r13','Aula Lantai 3',3],['r14','Ruang Duduk Penginapan',3],
    ];
    for (const [id, name, lantai] of ruangan) insertRuangan.run(id, name, lantai);

    insertUser.run('admin','admin123','admin');
    insertUser.run('takmir','takmir123','operator');
    insertUser.run('manajemen','manajemen123','manajemen');
  });

  seedAll();
}

module.exports = { initDB };
