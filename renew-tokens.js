#!/usr/bin/env node

/**
 * ⚡ Gsuite to ChatGPT — Auto-Renew Token Pipeline
 * ====================================================================
 * Memperbarui Access Token dari cookie sesi (Session Token ~90 hari)
 * tanpa perlu login Google ulang atau melewati Turnstile/Captcha.
 * 
 * Pipeline:
 *  1. Baca seluruh file sesi dari tokens/*.json
 *  2. Buka context browser terisolasi via Puppeteer + Stealth + WARP proxy
 *  3. Request https://chatgpt.com/api/auth/session dengan cookie tersimpan
 *  4. Simpan Access Token baru (masa berlaku 10 hari) ke file JSON
 *  5. Tulis ulang ringkasan chatgpt_tokens.txt
 *  6. Otomatis sinkronisasi ke chat2api dan 9Router
 * ====================================================================
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

// --- ANSI Colors ---
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// --- Paths & Configurations ---
const ROOT_DIR = __dirname;
const TOKENS_DIR = path.join(ROOT_DIR, 'tokens');
const TOKENS_FILE = path.join(ROOT_DIR, 'chatgpt_tokens.txt');

const WARP_SOCKS = process.env.WARP_SOCKS || 'socks5://172.21.0.2:1080';
const CHAT2API_URL = process.env.CHAT2API_URL || 'http://127.0.0.1:8085';
const CHAT2API_AUTH = process.env.CHAT2API_AUTH || 'sk-chat2api-ketan';
const AUTO_SYNC = process.env.AUTO_SYNC !== 'false';
const DELAY_MS = parseInt(process.env.DELAY_MS || '500', 10);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function printBanner() {
  console.log(`${c.magenta}${c.bright}`);
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║       ⚡ Gsuite to ChatGPT — Auto-Renew Session Token Pipeline     ║');
  console.log('║           Perpanjang Masa Berlaku Token Tanpa Login Ulang          ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log(`${c.reset}`);
}

async function httpPost(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const postData = typeof data === 'string' ? data : JSON.stringify(data);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 80,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${CHAT2API_AUTH}`,
        ...headers,
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function uploadToChat2API(tokens) {
  if (!tokens || tokens.length === 0) return false;

  try {
    // 1. Bersihkan token lama terlebih dahulu
    await httpPost(`${CHAT2API_URL}/tokens/clear`, '');

    // 2. Upload token baru
    const postData = `text=${encodeURIComponent(tokens.join('\n'))}`;
    const res = await httpPost(`${CHAT2API_URL}/tokens/upload`, postData);
    const data = JSON.parse(res.body);
    return data.status === 'success';
  } catch (err) {
    console.log(`  ${c.red}✗ Gagal sync ke chat2api: ${err.message}${c.reset}`);
    return false;
  }
}

async function sync9Router() {
  const syncScript = path.join(ROOT_DIR, 'sync-9router.js');
  if (!fs.existsSync(syncScript)) return;

  console.log(`\n${c.cyan}⚡ Menjalankan sinkronisasi ke 9Router...${c.reset}`);
  const result = spawnSync('node', [syncScript], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    env: process.env,
  });

  if (result.stdout) {
    const lines = result.stdout.trim().split('\n');
    lines.forEach((l) => console.log(`  ${c.gray}${l}${c.reset}`));
  }
  if (result.status === 0) {
    console.log(`  ${c.green}✓ Sinkronisasi ke 9Router selesai.${c.reset}`);
  } else {
    console.log(`  ${c.yellow}⚠ Sinkronisasi 9Router berakhir dengan status ${result.status}.${c.reset}`);
  }
}

async function main() {
  printBanner();

  if (!fs.existsSync(TOKENS_DIR)) {
    console.log(`${c.red}✗ Direktori ${TOKENS_DIR} tidak ditemukan.${c.reset}`);
    process.exit(1);
  }

  const tokenFiles = fs.readdirSync(TOKENS_DIR).filter((f) => f.endsWith('.json'));
  if (tokenFiles.length === 0) {
    console.log(`${c.yellow}⚠ Tidak ada file sesi di folder tokens/. Silakan harvest terlebih dahulu.${c.reset}`);
    process.exit(0);
  }

  console.log(`${c.cyan}[i] Ditemukan ${c.bright}${tokenFiles.length}${c.reset}${c.cyan} file akun untuk diperbarui.${c.reset}`);
  console.log(`${c.gray}[i] Menggunakan WARP Proxy: ${WARP_SOCKS}${c.reset}`);
  console.log(`${c.gray}[i] Membuka browser engine (Headless Mode)...${c.reset}\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      `--proxy-server=${WARP_SOCKS}`,
    ],
  });

  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;
  const activeTokens = [];
  const refreshedLines = [];

  for (let i = 0; i < tokenFiles.length; i++) {
    const file = tokenFiles[i];
    const filePath = path.join(TOKENS_DIR, file);
    let accountData;

    try {
      accountData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      console.log(`[${i + 1}/${tokenFiles.length}] ${c.red}✗ Gagal membaca JSON: ${file}${c.reset}`);
      failCount++;
      continue;
    }

    const email = accountData.email || file.replace('.json', '');
    process.stdout.write(`[${i + 1}/${tokenFiles.length}] 🔄 ${email.padEnd(30)} `);

    if (!accountData.cookies || !Array.isArray(accountData.cookies) || accountData.cookies.length === 0) {
      console.log(`${c.red}✗ Tidak ada cookie tersimpan${c.reset}`);
      failCount++;
      continue;
    }

    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36'
    );

    try {
      await page.setCookie(...accountData.cookies);

      const response = await page.goto('https://chatgpt.com/api/auth/session', {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });

      const bodyText = await page.evaluate(() => document.body.innerText);
      let sessionData = {};

      try {
        sessionData = JSON.parse(bodyText);
      } catch {
        throw new Error('Respon bukan JSON valid (Cloudflare atau redirect)');
      }

      if (sessionData && sessionData.accessToken) {
        const freshAccessToken = sessionData.accessToken;
        const freshExpires = sessionData.expires || '';
        const freshCookies = await page.cookies();

        // Update data akun
        accountData.accessToken = freshAccessToken;
        accountData.expires = freshExpires;
        accountData.lastRenewedAt = new Date().toISOString();
        if (sessionData.user) {
          accountData.user = sessionData.user;
        }
        if (freshCookies && freshCookies.length > 0) {
          accountData.cookies = freshCookies;
        }

        // Tulis kembali ke JSON
        fs.writeFileSync(filePath, JSON.stringify(accountData, null, 2), 'utf8');

        activeTokens.push(freshAccessToken);
        const sessionTokenStr = accountData.sessionToken || '';
        refreshedLines.push(`${email}|${freshAccessToken}|${sessionTokenStr}|${freshExpires}`);

        const expiresDate = freshExpires ? freshExpires.substring(0, 10) : '10 hari ke depan';
        console.log(`${c.green}✓ SUKSES!${c.reset} ${c.gray}(Expired: ${expiresDate})${c.reset}`);
        successCount++;
      } else {
        console.log(`${c.yellow}✗ Sesi kedaluwarsa (perlu re-harvest)${c.reset}`);
        failCount++;
      }
    } catch (err) {
      console.log(`${c.red}✗ Error: ${err.message}${c.reset}`);
      failCount++;
    } finally {
      await context.close().catch(() => {});
      if (DELAY_MS > 0 && i < tokenFiles.length - 1) {
        await sleep(DELAY_MS);
      }
    }
  }

  await browser.close().catch(() => {});

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Perbarui chatgpt_tokens.txt
  if (refreshedLines.length > 0) {
    fs.writeFileSync(TOKENS_FILE, refreshedLines.join('\n') + '\n', 'utf8');
  }

  // Ringkasan
  console.log(`\n${c.bright}════════════════════════════════════════════════════════════════════${c.reset}`);
  console.log(`${c.bright}📊 RINGKASAN PEMBARUAN TOKEN (RENEW SESSION):${c.reset}`);
  console.log(`  • Total Akun Diperiksa : ${tokenFiles.length}`);
  console.log(`  • ${c.green}Berhasil Diperbarui   : ${successCount}${c.reset}`);
  console.log(`  • ${c.red}Gagal / Kedaluwarsa    : ${failCount}${c.reset}`);
  console.log(`  • Total Durasi         : ${elapsed}s`);
  console.log(`  • File Output          : ${TOKENS_FILE}`);
  console.log(`${c.bright}════════════════════════════════════════════════════════════════════${c.reset}`);

  // Sinkronisasi Otomatis
  if (AUTO_SYNC && activeTokens.length > 0) {
    console.log(`\n${c.cyan}🔄 Mengunggah ${activeTokens.length} token aktif ke chat2api (${CHAT2API_URL})...${c.reset}`);
    const uploaded = await uploadToChat2API(activeTokens);
    if (uploaded) {
      console.log(`  ${c.green}✓ Berhasil mengunggah ${activeTokens.length} token baru ke chat2api!${c.reset}`);
    }

    await sync9Router();
  }

  console.log(`\n${c.green}${c.bright}🎉 Selesai! Seluruh token aktif siap digunakan.${c.reset}\n`);
}

main().catch((err) => {
  console.error(`\n${c.red}Fatal Error: ${err.message}${c.reset}`);
  process.exit(1);
});
