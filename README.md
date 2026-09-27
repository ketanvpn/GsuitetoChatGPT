<div align="center">

# ⚡ Gsuite to ChatGPT (OpenAI)

**Automated Bulk Google Workspace Onboarding, Token Harvester & 9Router Sync**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Puppeteer Stealth](https://img.shields.io/badge/Puppeteer-Stealth%20Mode-40B5A4?style=for-the-badge&logo=puppeteer&logoColor=white)](https://pptr.dev/)
[![9Router](https://img.shields.io/badge/9Router-Integrated-6366F1?style=for-the-badge)](https://9router.ketantech.my.id)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

*Automate onboarding for bulk Google Workspace (GSuite) accounts into ChatGPT / OpenAI without CAPTCHA, harvest authentic session tokens, and automatically sync them directly to your 9Router AI Gateway.*

</div>

---

## 📌 Ringkasan Proyek

**Gsuite to ChatGPT** adalah alat automasi cerdas berbasis **Headless Browser Stealth** untuk mendaftarkan dan memanen sesi akun Google / GSuite Workspace secara massal ke platform resmi **OpenAI ChatGPT (`chatgpt.com`)**, lengkap dengan sinkronisasi langsung ke [9Router AI Gateway](https://9router.ketantech.my.id).

Alat ini mengekstrak **Session Token (`__Secure-next-auth.session-token`)** dan **Access Token** resmi dari sesi web ChatGPT untuk dihubungkan ke:
- **9Router AI Gateway** (Provider OpenAI Codex `cx`)
- **Browser Laptop / HP** tanpa perlu login ulang manual (via Cookie-Editor)
- **Gateway Multi-Akun (Aurora / chatgpt2api)**
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
         ├──► tokens/{email}.json (Objek terstruktur: cookies, user data, metadata)
         │
         ▼ (Auto-Sync ke 9Router API)
[9Router AI Gateway (https://9router.ketantech.my.id)]
         └──► Provider: OpenAI Codex (cx)
```

---

## ✨ Fitur Unggulan

- 🥷 **Puppeteer Stealth Plugin:** Menyamarkan sidik jari otomasi browser (`navigator.webdriver`, canvas, audio, plugins) agar tidak terdeteksi oleh Cloudflare dan Google.
- ⚡ **Auto-Sync ke 9Router:** Setiap akun yang berhasil dipanen otomatis didaftarkan ke [9Router](https://9router.ketantech.my.id) (Provider: `codex` / `cx`).
- 🔄 **Sinkronisasi Massal Mandiri:** Tersedia perintah `npm run sync` untuk mengimpor seluruh token yang tersimpan di folder `tokens/` ke 9Router kapan saja.
- ⌨️ **Simulasi Ketikan Manusiawi (*Human-like Typing*):** Kecepatan ketikan dinamis dan acak (30ms – 75ms) untuk mencegah kecurigaan sistem keamanan input.
- 🎓 **Bypass Otomatis Layar Onboarding GSuite:** Mendeteksi dan mengklik tombol *"I understand"*, *"Saya mengerti"*, dan konfirmasi OAuth otomatis.
- 🎂 **Penanganan Form Onboarding OpenAI:** Otomatis mendeteksi formulir umur di `auth.openai.com/about-you` dan mengisikan usia realistis secara acak.
- 🧹 **Pembersihan Otomatis `akun.txt` (Idempotent):** Akun yang berhasil diproses langsung dihapus dari `akun.txt` secara real-time. Jika proses terhenti di tengah jalan, Anda dapat melanjutkannya tanpa memproses ulang akun yang sudah sukses.
- 📸 **Auto Screenshot Error Logging:** Jika terjadi kendala pada salah satu akun, tangkapan layar otomatis disimpan ke folder `screenshots/` untuk kemudahan investigasi tanpa menghentikan akun berikutnya.
- 🔑 **Refresh Token Auto-Renew:** Bot menyadap `refresh_token` dari OAuth flow (`auth0.openai.com/oauth/token`) saat proses login. Refresh token ini di-upload ke chat2api, yang akan **otomatis memperbarui access token setiap 5 hari** tanpa perlu login ulang — token hidup selama akun tidak di-revoke.

---

## 📂 Struktur Proyek

```text
GsuitetoChatGPT/
├── bot.js                   # Mesin utama otomasi browser Puppeteer & ekstraksi token
├── sync-9router.js          # Sinkronisasi token ke 9Router (Provider Codex cx)
├── sync-chatgpt2api.js      # Sinkronisasi token ke chat2api bridge
├── run.sh                   # Skrip peluncur cepat (runner)
├── setup.sh                 # Installer dependensi sistem Linux & Chromium
├── docker-compose.yml       # Docker Compose: chat2api + Cloudflare WARP sidecar
├── config.example.yaml      # Template konfigurasi (salin ke config.yaml)
├── akun.example.txt         # Contoh format daftar akun input
├── akun.txt                 # File input akun Anda (diabaikan oleh git)
├── chatgpt_tokens.txt       # Ringkasan token hasil panen (diabaikan oleh git)
├── tokens/                  # Folder berkas JSON detail tiap akun (diabaikan oleh git)
├── bridge/                  # File tambahan untuk chat2api bridge
│   ├── custom_models.py     # Endpoint /v1/models (11 model, sesuai 9Router Codex)
│   ├── patch_models.py      # Patch ChatService.py agar support model GPT-5.x/6
│   └── start.sh             # Startup script (auto-patch saat container start)
├── package.json             # Metadata & dependensi Node.js
└── README.md                # Dokumentasi panduan penggunaan
```

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
# Atau menggunakan npm:
npm start
```
*Bot akan membuka browser headless, login ke ChatGPT via Google SSO, menyelesaikan onboarding OpenAI, mengekstrak token sesi, dan otomatis menyinkronkan ke 9Router.*

---

## 💡 Bagaimana Cara Memakai Token Hasil Panen?

Setelah pemanenan selesai, token Anda tersimpan di folder `tokens/` (format JSON) dan `chatgpt_tokens.txt`. Terdapat **3 cara praktis** untuk menggunakannya:

### 1. Masuk Otomatis ke 9Router (Paling Direkomendasikan)
Secara bawaan, bot otomatis mendaftarkan akun yang berhasil ke 9Router lokal (`http://127.0.0.1:20128`).
Jika Anda ingin menyinkronkan ulang seluruh token yang ada di folder `tokens/` ke 9Router kapan saja:
```bash
npm run sync
```
*Hasilnya:* Akun akan muncul aktif di dashboard [9Router](https://9router.ketantech.my.id) pada menu **OpenAI Codex (`cx`)**.

### 2. Menggunakan Token di Browser Tanpa Login Ulang
Jika Anda ingin membuka ChatGPT Web di komputer/laptop pribadi menggunakan akun hasil panen tanpa perlu mengetik email/password:
1. Buka file `tokens/email_anda.json` atau baris di `chatgpt_tokens.txt`.
2. Salin nilai `sessionToken` (dimulai dengan `eyJ...`).
3. Buka browser di laptop/PC Anda, pasang ekstensi **Cookie-Editor**.
4. Buka `https://chatgpt.com`, buka Cookie-Editor, tambahkan cookie baru:
   - **Name:** `__Secure-next-auth.session-token`
   - **Value:** *paste nilai sessionToken*
   - Centang **Secure** dan **HttpOnly**.
5. Refresh browser — Anda langsung berada di dalam dashboard akun ChatGPT tersebut!

### 3. Menghubungkan ke chat2api Bridge (Web-to-API)
Token sesi web diubah menjadi endpoint OpenAI-compatible (`/v1/chat/completions`) melalui **chat2api** bridge:
```bash
npm run sync:chat2api
```

**🔑 Refresh Token (Direkomendasikan):** Bot otomatis menyadap `refresh_token` saat proses login. Token ini di-upload ke chat2api dan akan **auto-renew setiap 5 hari** — tidak perlu harvest ulang selama akun hidup. Jika refresh token tidak tersedia, bot fallback ke access token (berlaku 10 hari).

Bridge ini mendukung **11 model** yang selaras dengan 9Router Codex:
- **GPT-6:** Astra, Sol, Luna
- **GPT-5.6:** Sol, Terra, Luna
- **GPT-5.5**, **GPT-5.4**, **GPT-5.4 Mini**
- **GPT-5.3 Codex Spark**, **Auto**

Setup bridge via Docker:
```bash
cp config.example.yaml config.yaml   # Edit sesuai kebutuhan
docker compose up -d                  # Jalankan chat2api + WARP proxy
```
> ⚠️ **WARP Proxy wajib** — IP datacenter VPS diblokir oleh `chatgpt.com/backend-api`. Bridge menggunakan Cloudflare WARP sidecar untuk merutekan trafik melalui IP residensial.

---

## ⚙️ Variabel Lingkungan (Opsional)

Anda dapat mengonfigurasi variabel berikut (atau membuat berkas `.env`):

| Variabel | Bawaan | Deskripsi |
| :--- | :--- | :--- |
| `ROUTER_HOST` | `127.0.0.1` | Host instance 9Router |
| `ROUTER_PORT` | `20128` | Port instance 9Router |
| `ROUTER_PASSWORD` | *(wajib diisi)* | Password admin 9Router untuk injeksi API |
| `AUTO_SYNC` | `true` | Otomatis mendaftarkan akun ke 9Router saat panen |
| `CHAT2API_HOST` | `127.0.0.1` | Host instance chat2api bridge |
| `CHAT2API_PORT` | `8085` | Port instance chat2api bridge |
| `CHAT2API_AUTH` | *(wajib diisi)* | API key chat2api (env `AUTHORIZATION` di chat2api) |

---

## 🔑 Tentang Token & Masa Berlaku

Bot mengekstrak **3 jenis token** dari setiap akun:

| Token | Masa Berlaku | Auto-Renew | Kegunaan |
| :--- | :--- | :--- | :--- |
| **Refresh Token** | Sampai di-revoke | ✅ Ya (chat2api) | Upload ke chat2api → auto-renew setiap 5 hari |
| Access Token (JWT) | 10 hari | ❌ | Fallback jika refresh token gagal |
| Session Token (Cookie) | ~90 hari | ❌ | Login browser via Cookie-Editor |

**Prioritas upload ke chat2api:** Refresh Token → Access Token (fallback).

---

## 🛡️ Keamanan & Privasi

- Berkas `.gitignore` telah dikonfigurasi untuk **TIDAK MENGIRIM** berkas privat seperti `akun.txt`, `chatgpt_tokens.txt`, `tokens/`, dan `screenshots/` ke repositori publik.
- Ekstraksi token berjalan lokal 100% di server/mesin Anda tanpa perantara server pihak ketiga.

---

## 📄 Lisensi

Proyek ini dirilis di bawah lisensi [MIT](LICENSE). Dikembangkan oleh **KetanTech** ([@ketanvpn](https://github.com/ketanvpn)).
