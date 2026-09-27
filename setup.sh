#!/usr/bin/env bash

# ==============================================================================
# Setup Script for Gsuite to ChatGPT (OpenAI) Harvester
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=================================================================="
echo "⚡ Gsuite to ChatGPT Harvester Setup"
echo "=================================================================="

# 1. Cek Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js belum terpasang! Silakan pasang Node.js v18+ terlebih dahulu."
    exit 1
fi

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
echo "✓ Node.js versi $(node -v) terdeteksi."

if [ "$NODE_VER" -lt 18 ]; then
    echo "⚠️ Peringatan: Disarankan menggunakan Node.js v18 atau yang lebih baru."
fi

# 2. Pasang dependensi Node.js
if [ -d "/root/projects/GsuitetoBAI/node_modules" ] && [ ! -d "node_modules" ]; then
    echo "🔗 Menghubungkan paket dependensi Puppeteer yang sudah terpasang..."
    ln -s /root/projects/GsuitetoBAI/node_modules node_modules
elif [ ! -d "node_modules" ]; then
    echo "📦 Memasang dependensi Puppeteer & Stealth Plugin via npm..."
    npm install
fi

# 3. Buat berkas akun.txt jika belum ada
if [ ! -f "akun.txt" ]; then
    echo "📝 Membuat berkas akun.txt dari template..."
    cp akun.example.txt akun.txt
    echo "✓ Berkas akun.txt telah dibuat. Silakan isi akun GSuite Anda."
fi

# 4. Buat folder tokens & screenshots
mkdir -p tokens screenshots

# 5. Set executable permissions
chmod +x bot.js run.sh

echo ""
echo "=================================================================="
echo "🎉 Setup Selesai!"
echo "Langkah selanjutnya:"
echo "1. Masukkan akun GSuite Anda ke: nano akun.txt"
echo "2. Jalankan pemanenan dengan:   ./run.sh"
echo "=================================================================="
