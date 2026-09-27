#!/usr/bin/env bash

# ==============================================================================
# Runner for Gsuite to ChatGPT (OpenAI) Harvester
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f "akun.txt" ]; then
    echo "❌ Berkas akun.txt tidak ditemukan!"
    echo "Jalankan ./setup.sh terlebih dahulu atau buat akun.txt"
    exit 1
fi

node bot.js "$@"
