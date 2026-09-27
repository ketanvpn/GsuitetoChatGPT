#!/usr/bin/env node

/**
 * sync-9router.js
 * Tool untuk mengimpor hasil panen token ChatGPT/GSuite ke database 9Router.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROUTER_HOST = process.env.ROUTER_HOST || '127.0.0.1';
const ROUTER_PORT = process.env.ROUTER_PORT || 20128;
const ROUTER_PASSWORD = process.env.ROUTER_PASSWORD || 'maduTJ150';

const TOKENS_DIR = path.join(__dirname, 'tokens');
const TOKENS_FILE = path.join(__dirname, 'chatgpt_tokens.txt');

function loginTo9Router() {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ password: ROUTER_PASSWORD });
    const req = http.request(
      {
        hostname: ROUTER_HOST,
        port: ROUTER_PORT,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        const setCookies = res.headers['set-cookie'];
        let cookie = '';
        if (setCookies) {
          cookie = setCookies.map((c) => c.split(';')[0]).join('; ');
        }
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (data.success || cookie) {
              resolve(cookie);
            } else {
              reject(new Error(data.error || 'Gagal login ke 9Router'));
            }
          } catch (e) {
            resolve(cookie);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function importTokenTo9Router(cookie, accessToken, email) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ accessToken, name: email });
    const req = http.request(
      {
        hostname: ROUTER_HOST,
        port: ROUTER_PORT,
        path: '/api/oauth/codex/import-token',
        method: 'POST',
        headers: {
          Cookie: cookie,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve({ raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('⚡ [9Router Sync] Memulai sinkronisasi token ke 9Router...');

  let accounts = [];

  // 1. Coba baca dari folder tokens/*.json
  if (fs.existsSync(TOKENS_DIR)) {
    const files = fs.readdirSync(TOKENS_DIR).filter((f) => f.endsWith('.json'));
    for (const f of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(TOKENS_DIR, f), 'utf-8'));
        if (data.accessToken && data.accessToken.startsWith('eyJ')) {
          accounts.push({ email: data.email || f.replace('.json', ''), accessToken: data.accessToken });
        }
      } catch (e) {}
    }
  }

  if (accounts.length === 0) {
    console.log('⚠️ Tidak ditemukan token valid di folder tokens/. Pastikan sudah menjalankan ./run.sh');
    return;
  }

  console.log(`📋 Ditemukan ${accounts.length} akun siap di-sync.`);
  console.log('🔑 Melakukan autentikasi ke 9Router...');

  try {
    const cookie = await loginTo9Router();
    console.log('✓ Berhasil terhubung ke 9Router.');

    let successCount = 0;
    for (const acc of accounts) {
      process.stdout.write(`  → Mengimpor ${acc.email}... `);
      const res = await importTokenTo9Router(cookie, acc.accessToken, acc.email);
      if (res.success) {
        console.log('✅ SUKSES (ID: ' + (res.connection?.id?.slice(0, 8) || 'ok') + ')');
        successCount++;
      } else {
        console.log('❌ GAGAL: ' + (res.error || JSON.stringify(res)));
      }
    }

    console.log(`\n🎉 Selesai! Berhasil mengimpor ${successCount}/${accounts.length} akun ke 9Router.`);
    console.log('👉 Periksa akun yang terdaftar di: https://9router.ketantech.my.id');
  } catch (err) {
    console.error('❌ Terjadi kesalahan saat sinkronisasi:', err.message);
  }
}

main();
