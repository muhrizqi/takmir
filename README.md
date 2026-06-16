# 🕌 Sistem Manajemen Masjid Jogokariyan

Aplikasi manajemen internal untuk Takmir Masjid Jogokariyan.  
Dijalankan secara lokal di server Proxmox — tidak memerlukan koneksi internet.

---

## Fitur

| Modul | Fungsi |
|---|---|
| **Dashboard** | Ringkasan harian: booking, kegiatan, saldo, pengumuman |
| **Kegiatan** | Jadwal kajian, rapat, dan program masjid |
| **Ruangan** | Status ketersediaan 14 ruangan di 3 lantai |
| **Pemesanan** | Booking ruangan dengan cek konflik otomatis |
| **Keuangan** | Pencatatan pemasukan & pengeluaran per biro |
| **Pengumuman** | Pengumuman internal takmir |
| **Pengurus & Biro** | Data 29 biro dari kepengurusan 2023–2027 |

---

## Struktur Ruangan

**Lantai 1:** Ruang Utama, Serambi Selatan, Serambi Utara, Serambi Timur,
Ruang Media, Depan Logo Masjid, Kantor Takmir

**Lantai 2:** Aula Lantai 2, Ruang Sholat Utara, Ruang Sholat Selatan,
Ruang Sholat Karpet Coklat, Ruang RMJ

**Lantai 3:** Aula Lantai 3, Ruang Duduk Penginapan

---

## Instalasi di Proxmox

### Cara 1 — Script otomatis (disarankan)

```bash
# Di dalam LXC/VM Ubuntu 22.04+
git clone <repo-url> masjid-app
cd masjid-app
chmod +x deploy.sh
./deploy.sh
```

### Cara 2 — Manual

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker --now

# 2. Clone project
git clone <repo-url> masjid-app
cd masjid-app

# 3. Sesuaikan JWT secret (wajib!)
nano docker-compose.yml
# Ganti: JWT_SECRET=ganti_dengan_secret_yang_kuat_min32char

# 4. Build dan jalankan
docker compose up -d --build

# 5. Akses aplikasi
# http://<IP-PROXMOX>:8080
```

---

## Akun Default

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Admin |
| `takmir` | `takmir123` | Operator |

> ⚠️ **Ganti password default setelah instalasi pertama!**

---

## Perintah berguna

```bash
# Cek status container
docker compose ps

# Lihat log
docker compose logs -f

# Restart
docker compose restart

# Stop
docker compose down

# Update aplikasi
git pull
docker compose up -d --build

# Backup database
docker cp masjid-backend:/app/data/masjid.db ./backup-$(date +%Y%m%d).db
```

---

## Stack Teknologi

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** SQLite (via better-sqlite3) — tersimpan di Docker volume
- **Proxy:** Nginx
- **Runtime:** Docker Compose

---

## Struktur File

```
masjid-app/
├── docker-compose.yml       # Orkestrasi semua service
├── deploy.sh                # Script deploy otomatis
├── nginx/
│   └── default.conf         # Reverse proxy config
├── backend/
│   ├── Dockerfile
│   ├── server.js            # Express API (semua endpoint)
│   ├── db.js                # Database init + seed data
│   └── package.json
└── frontend/
    ├── Dockerfile
    ├── src/
    │   ├── App.jsx           # Router utama
    │   ├── api.js            # API client
    │   ├── components/
    │   │   └── Layout.jsx    # Sidebar + navigasi
    │   └── pages/
    │       ├── Login.jsx
    │       ├── Dashboard.jsx
    │       ├── Ruangan.jsx
    │       └── pages.jsx     # Kegiatan, Pemesanan, Keuangan,
    │                         # Pengumuman, Pengurus
    └── package.json
```

---

## API Endpoints

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | `/api/login` | Login |
| GET | `/api/dashboard` | Data dashboard |
| GET | `/api/biro` | Semua biro per bidang |
| GET | `/api/biro/:id` | Detail biro + anggota |
| GET/POST | `/api/ruangan` | Daftar ruangan + status |
| GET/POST/PUT/DELETE | `/api/pemesanan` | CRUD pemesanan |
| GET/POST/DELETE | `/api/kegiatan` | CRUD kegiatan |
| GET/POST/DELETE | `/api/keuangan` | CRUD keuangan |
| GET/POST/DELETE | `/api/pengumuman` | CRUD pengumuman |

Semua endpoint (kecuali `/api/login`) memerlukan header:
```
Authorization: Bearer <token>
```

---

## Pengembangan Lokal

```bash
# Backend
cd backend
npm install
node server.js   # berjalan di port 3001

# Frontend (terminal baru)
cd frontend
npm install
npm run dev      # berjalan di port 5173
```
