<div align="center">

# ⚡ Gsuite to ChatGPT (OpenAI)

**Automated Bulk Google Workspace Onboarding & Token Harvester for ChatGPT**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Puppeteer Stealth](https://img.shields.io/badge/Puppeteer-Stealth%20Mode-40B5A4?style=for-the-badge&logo=puppeteer&logoColor=white)](https://pptr.dev/)
[![OpenAI](https://img.shields.io/badge/OpenAI-ChatGPT-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com)
[![Platform](https://img.shields.io/badge/Platform-Linux%20VPS%20%7C%20Windows%20%7C%20macOS-orange?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

</div>

---

## 📌 Ringkasan Proyek

**Gsuite to ChatGPT** adalah alat automasi cerdas berbasis **Headless Browser Stealth** untuk mendaftarkan dan memanen sesi akun Google / GSuite Workspace secara massal ke platform resmi **OpenAI ChatGPT (`chatgpt.com`)**.

Alat ini mengekstrak **Session Token (`__Secure-next-auth.session-token`)** dan **Access Token** resmi dari sesi web ChatGPT untuk dihubungkan ke:
- **9Router AI Gateway**
- **OpenAI Codex CLI**
- **Gateway Multi-Akun (chatgpt2api / chat2api)**
- Kebutuhan rotasi akun AI tanpa limit.

---

## 💡 Mengapa Menggunakan Jalur Google SSO?

Mendaftar akun ChatGPT baru dari VPS Linux menggunakan email biasa hampir selalu **gagal terkena blokir Cloudflare Turnstile & Arkose CAPTCHA (Error 403 Forbidden)** karena IP datacenter VPS dicurigai sebagai bot.

### Keunggulan Jalur GSuite SSO:
1. 🛡️ **100% Bebas CAPTCHA / Turnstile:** Otorisasi melalui Google OAuth Consumer SSO (`accounts.google.com`) dipercaya sepenuhnya oleh OpenAI dan tidak memicu tantangan captcha.
2. 📱 **Tanpa Verifikasi Nomor Telepon:** Akun Google Workspace yang sudah aktif langsung dapat digunakan untuk masuk ke ChatGPT tanpa meminta verifikasi SMS tambahan.
3. 🤖 **Auto-Bypass Onboarding OpenAI:** Secara otomatis menangani layar awal akun baru (seperti pertanyaan *"How old are you?"* dan konfirmasi *"You're all set"*).

---

## 🏗️ Cara Kerja Sistem (Arsitektur)

```
[Akun GSuite (akun.txt)]
         │
         ▼ (Puppeteer Stealth + Human-like Typing)
[Portal ChatGPT: chatgpt.com/auth/login]
         │
         ▼ (Klik 'Continue with Google')
[Google OAuth SSO (accounts.google.com)]
         │
         ├──► Auto-accept GSuite Education / Warning Screens ("I understand")
         │
         ▼ (Otorisasi Sukses → Redirect ke OpenAI)
[Layar Onboarding OpenAI: auth.openai.com/about-you]
         │
         ├──► Auto-fill Profil & Umur Realistis (24 - 31 tahun)
         ├──► Auto-click "Continue" & "You're all set"
         │
         ▼ (Mendarat di Dashboard: chatgpt.com)
[Ekstraksi Token Sesi & Kredensial]
         │
         ├──► chatgpt_tokens.txt  (Format ringkas: email|accessToken|sessionToken|expires)
         └──► tokens/{email}.json (Objek terstruktur: cookies, user data, metadata)
```

---

## ✨ Fitur Unggulan

- 🥷 **Puppeteer Stealth Plugin:** Menyamarkan sidik jari otomasi browser (`navigator.webdriver`, canvas, audio, plugins) agar tidak terdeteksi oleh Cloudflare dan Google.
- ⌨️ **Simulasi Ketikan Manusiawi (*Human-like Typing*):** Kecepatan ketikan dinamis dan acak (30ms – 75ms) untuk mencegah kecurigaan sistem keamanan input.
- 🎓 **Bypass Otomatis Layar Onboarding GSuite:** Mendeteksi dan mengklik tombol *"I understand"*, *"Saya mengerti"*, dan konfirmasi OAuth otomatis.
- 🎂 **Penanganan Form Onboarding OpenAI:** Otomatis mendeteksi formulir umur di `auth.openai.com/about-you` dan mengisikan usia realistis secara acak.
- 🧹 **Pembersihan Otomatis `akun.txt` (Idempotent):** Akun yang berhasil diproses langsung dihapus dari `akun.txt` secara real-time. Jika proses terhenti di tengah jalan, Anda dapat melanjutkannya tanpa memproses ulang akun yang sudah sukses.
- 📸 **Auto Screenshot Error Logging:** Jika terjadi kendala pada salah satu akun, tangkapan layar otomatis disimpan ke folder `screenshots/` untuk kemudahan investigasi tanpa menghentikan akun berikutnya.

---

## 📦 Persyaratan Sistem

- **Sistem Operasi:** Linux (Ubuntu 22.04+ / Debian 11+ direkomendasikan), Windows, atau macOS.
- **Node.js:** Versi 18.0.0 atau lebih baru.
- **Dependensi Chrome:** Terpasang pustaka sistem pendukung Chromium di Linux.

---

## 🚀 Panduan Setup & Penggunaan

### 1. Kloning Repositori
```bash
git clone https://github.com/ketanvpn/GsuitetoChatGPT.git
cd GsuitetoChatGPT
```

### 2. Jalankan Skrip Setup
```bash
chmod +x setup.sh run.sh
./setup.sh
```
*Skrip akan memeriksa Node.js, memasang dependensi `puppeteer` & `stealth plugin`, serta membuat berkas `akun.txt`.*

### 3. Masukkan Daftar Akun GSuite
Edit berkas `akun.txt`:
```bash
nano akun.txt
```
Masukkan akun dengan format baris tunggal (bisa menggunakan delimiter `|` atau `:`):
```text
gadang1@paragadis.com|password123
gadang2@paragadis.com|password123
gadang3@paragadis.com:password123
```
*Simpan dengan menekan `Ctrl + O`, `Enter`, lalu `Ctrl + X`.*

### 4. Mulai Pemanenan (Harvester)
```bash
./run.sh
```
*Bot akan membuka browser headless, melakukan login Google SSO, menyelesaikan onboarding OpenAI, dan mengekstrak token sesi.*

---

## 📁 Struktur Berkas Hasil (Output)

Setelah proses selesai, hasil pemanenan tersimpan di dua tempat:

### 1. Ringkasan Cepat: `chatgpt_tokens.txt`
Format baris tunggal berpembatas pipa (`|`):
```text
email|accessToken|sessionToken|expireTime
```
*Cocok untuk skrip import cepat atau CLI tools.*

### 2. Detail Terstruktur: `tokens/{email}.json`
Setiap akun menghasilkan berkas JSON lengkap:
```json
{
  "email": "user@domain.com",
  "name": "Nama Pengguna",
  "accessToken": "eyJhbGciOi...",
  "sessionToken": "eyJhbGciOi...",
  "expires": "2026-10-27T10:00:00.000Z",
  "harvestedAt": "2026-09-27T10:05:00.000Z",
  "cookies": [ ... ],
  "user": {
    "id": "user-...",
    "name": "...",
    "email": "..."
  }
}
```

---

## 🔌 Integrasi ke Gateway / Tool Coding

### 1. Integrasi dengan Gateway Multi-Akun (chatgpt2api)
Salin nilai `sessionToken` ke dalam daftar session token gateway Anda. Gateway akan memutar akun secara berkala sehingga kuota tidak pernah habis.

### 2. Integrasi dengan OpenAI Codex CLI
Gunakan nilai `accessToken` atau set cookie sesi ke environment konfigurasi Codex untuk menikmati model reasoning dan coding tanpa batas.

---

## 🛡️ Keamanan & Privasi

- Berkas `.gitignore` telah dikonfigurasi untuk **TIDAK MENGIRIM** berkas privat seperti `akun.txt`, `chatgpt_tokens.txt`, `tokens/`, dan `screenshots/` ke repositori publik.
- Selalu pastikan Anda tidak menambahkan kredensial pribadi ke dalam komit Git.

---

## 📄 Lisensi

Proyek ini dirilis di bawah lisensi [MIT](LICENSE). Dikembangkan oleh **KetanTech** ([@ketanvpn](https://github.com/ketanvpn)).
