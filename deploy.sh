#!/bin/bash
# Deploy script — Masjid Jogokariyan
# Jalankan di Proxmox LXC/VM Ubuntu/Debian

set -e

echo "======================================"
echo "  Deploy Aplikasi Masjid Jogokariyan  "
echo "======================================"

# Cek docker
if ! command -v docker &> /dev/null; then
  echo "[1/4] Menginstall Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker --now
else
  echo "[1/4] Docker sudah terinstall."
fi

# Cek docker compose
if ! docker compose version &> /dev/null; then
  echo "      Menginstall Docker Compose plugin..."
  apt-get install -y docker-compose-plugin
fi

echo "[2/4] Membangun Docker images..."
docker compose build --no-cache

echo "[3/4] Menjalankan containers..."
docker compose up -d

echo "[4/4] Menunggu service siap..."
sleep 5

# Cek status
if curl -sf http://localhost:8080/api/login -X POST \
   -H "Content-Type: application/json" \
   -d '{"username":"admin","password":"admin123"}' > /dev/null 2>&1; then
  IP=$(hostname -I | awk '{print $1}')
  echo ""
  echo "======================================"
  echo "  ✅  Aplikasi berhasil berjalan!"
  echo "======================================"
  echo ""
  echo "  URL   : http://$IP:8080"
  echo "  Login : admin / admin123"
  echo "         takmir / takmir123"
  echo ""
  echo "  ⚠️  Ganti password setelah login pertama!"
  echo ""
else
  echo "⚠️  Cek status: docker compose logs"
fi
