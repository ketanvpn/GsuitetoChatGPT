#!/usr/bin/env node

/**
 * ⚡ Gsuite to ChatGPT (OpenAI) Harvester & Token Bridge
 * Automated bulk Google Workspace OAuth onboarding for ChatGPT
 *
 * Author: KetanTech (https://github.com/ketanvpn)
 * License: MIT
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

// --- Paths Configuration ---
const ACCOUNTS_FILE = path.join(__dirname, 'akun.txt');
const TOKENS_FILE = path.join(__dirname, 'chatgpt_tokens.txt');
const TOKENS_DIR = path.join(__dirname, 'tokens');
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

// Ensure directories exist
if (!fs.existsSync(TOKENS_DIR)) fs.mkdirSync(TOKENS_DIR, { recursive: true });
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// --- Color Helpers ---
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function printBanner() {
  console.log(`
${c.cyan}╔════════════════════════════════════════════════════════════════════╗
║             ⚡ GSUITE TO CHATGPT (OPENAI) HARVESTER               ║
║      Automated Google Workspace SSO & Token Extraction Pipeline    ║
║                     By KetanTech (ketanvpn)                        ║
╚════════════════════════════════════════════════════════════════════╝${c.reset}
`);
}

function loadAccounts() {
  if (!fs.existsSync(ACCOUNTS_FILE)) {
    console.error(`${c.red}[✗] Berkas ${ACCOUNTS_FILE} tidak ditemukan!${c.reset}`);
    console.log(`${c.yellow}[!] Buat berkas akun.txt dan masukkan akun dengan format: email|password${c.reset}\n`);
    process.exit(1);
  }

  const lines = fs.readFileSync(ACCOUNTS_FILE, 'utf-8').split('\n');
  const accounts = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    let email = '';
    let password = '';

    if (trimmed.includes('|')) {
      const parts = trimmed.split('|');
      email = parts[0].trim();
      password = parts.slice(1).join('|').trim();
    } else if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      email = parts[0].trim();
      password = parts.slice(1).join(':').trim();
    }

    if (email && password) {
      accounts.push({ email, password, raw: trimmed });
    }
  }

  return accounts;
}

function removeAccountFromList(rawLine) {
  try {
    if (!fs.existsSync(ACCOUNTS_FILE)) return;
    const content = fs.readFileSync(ACCOUNTS_FILE, 'utf-8');
    const lines = content.split('\n');
    const remaining = lines.filter((l) => l.trim() !== rawLine.trim());
    fs.writeFileSync(ACCOUNTS_FILE, remaining.join('\n'), 'utf-8');
  } catch (err) {
    console.error(`${c.yellow}[!] Gagal memperbarui akun.txt: ${err.message}${c.reset}`);
  }
}

async function typeHumanLike(page, element, text) {
  await element.click({ clickCount: 3 });
  await page.keyboard.press('Backspace');
  await sleep(150);

  for (const char of text) {
    await page.keyboard.sendCharacter(char);
    const delay = Math.floor(Math.random() * 45) + 30;
    await sleep(delay);
  }
}

async function processAccount(browser, account, index, total) {
  const { email, password, raw } = account;
  const startTime = Date.now();
  console.log(`\n${c.cyan}[${index + 1}/${total}] 🚀 Memproses: ${c.bright}${email}${c.reset}`);

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Custom User-Agent to mirror a genuine Linux Desktop browser
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
  );

  try {
    console.log(`  ${c.gray}→ Mengakses portal ChatGPT (auth/login)...${c.reset}`);
    await page.goto('https://chatgpt.com/auth/login', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // 1. Klik tombol "Continue with Google"
    console.log(`  ${c.gray}→ Memilih metode 'Continue with Google'...${c.reset}`);
    const [googleBtn] = await page.$$("xpath/.//button[contains(., 'Continue with Google')]");
    if (!googleBtn) {
      throw new Error("Tombol 'Continue with Google' tidak ditemukan pada halaman!");
    }

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
      googleBtn.click(),
    ]);

    // 2. Google OAuth - Isi Email
    console.log(`  ${c.gray}→ Memasukkan email Google...${c.reset}`);
    await page.waitForSelector('#identifierId', { visible: true, timeout: 20000 });
    await sleep(600);

    const emailInput = await page.$('#identifierId');
    await typeHumanLike(page, emailInput, email);
    await sleep(500);

    const nextBtn = await page.$('#identifierNext button, #identifierNext');
    if (nextBtn) await nextBtn.click();
    else await page.keyboard.press('Enter');

    // 3. Google OAuth - Isi Password
    console.log(`  ${c.gray}→ Memasukkan password Google...${c.reset}`);
    await sleep(2000);

    const pwdSelectors = [
      'input[type="password"][name="Passwd"]',
      'input[type="password"]',
      '#password input',
      'input[name="Passwd"]',
    ];

    let pwdField = null;
    for (const sel of pwdSelectors) {
      try {
        pwdField = await page.waitForSelector(sel, { visible: true, timeout: 8000 });
        if (pwdField) break;
      } catch {}
    }

    if (!pwdField) {
      throw new Error('Kolom password Google tidak muncul atau akun meminta verifikasi tambahan');
    }

    await sleep(600);
    await typeHumanLike(page, pwdField, password);
    await sleep(500);

    const pwdNextBtn = await page.$('#passwordNext button, #passwordNext');
    if (pwdNextBtn) await pwdNextBtn.click();
    else await page.keyboard.press('Enter');

    // 4. Penanganan Layar Onboarding Google Workspace & OpenAI
    console.log(`  ${c.gray}→ Menunggu otorisasi OAuth & verifikasi profil...${c.reset}`);
    const consentTimeout = 40000;
    const consentStart = Date.now();

    while (Date.now() - consentStart < consentTimeout) {
      await sleep(2000);
      const curUrl = page.url();

      // Cek apakah sudah kembali ke ChatGPT utama
      if (curUrl.includes('chatgpt.com') && !curUrl.includes('/auth/')) {
        break;
      }

      // Deteksi layar "How old are you?" (auth.openai.com/about-you)
      if (curUrl.includes('about-you')) {
        console.log(`  ${c.yellow}→ Layar onboarding OpenAI terdeteksi: Mengisi data umur...${c.reset}`);
        try {
          const ageSelector =
            'input[name="age"], input[type="number"], input[placeholder*="Age"], input[id*="age"]';
          const ageEl = await page.waitForSelector(ageSelector, { timeout: 6000 });
          if (ageEl) {
            // Berikan umur realistis acak (24 - 31 tahun)
            const randomAge = String(24 + Math.floor(Math.random() * 8));
            await typeHumanLike(page, ageEl, randomAge);
            await sleep(500);

            const [continueBtn] = await page.$$("xpath/.//button[contains(., 'Continue')]");
            if (continueBtn) {
              await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {}),
                continueBtn.click(),
              ]);
            }
          }
        } catch (e) {
          // ignore transient DOM errors
        }
      }

      // Klik tombol consent / persetujuan otomatis (Google & OpenAI)
      try {
        await page.evaluate(() => {
          const buttons = Array.from(
            document.querySelectorAll('button, [role="button"], input[type="submit"]')
          );
          const keywords = [
            'i understand',
            'saya mengerti',
            'continue',
            'lanjutkan',
            'allow',
            'izinkan',
            'next',
            'agree',
            'setuju',
          ];
          for (const btn of buttons) {
            const text = (btn.innerText || btn.value || '').trim().toLowerCase();
            for (const kw of keywords) {
              if (text === kw || text.includes(kw)) {
                if (btn.offsetParent !== null) {
                  btn.click();
                  return;
                }
              }
            }
          }
        });
      } catch (e) {}
    }

    // 5. Tunggu inisialisasi sesi ChatGPT
    await sleep(3500);

    // Klik tombol "Continue" jika ada modal "You're all set"
    try {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const continueBtn = btns.find((b) => (b.innerText || '').trim().toLowerCase() === 'continue');
        if (continueBtn && continueBtn.offsetParent !== null) {
          continueBtn.click();
        }
      });
    } catch (e) {}

    await sleep(2000);

    // 6. Ekstraksi Token Sesi & Kredensial
    console.log(`  ${c.gray}→ Mengekstrak token sesi & cookie otentikasi...${c.reset}`);
    const cookies = await page.cookies();

    // Ambil session-token (baik format tunggal maupun split .0)
    const sessionTokenParts = cookies
      .filter((ck) => ck.name.startsWith('__Secure-next-auth.session-token'))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((ck) => ck.value)
      .join('');

    if (!sessionTokenParts) {
      throw new Error('Gagal menemukan cookie __Secure-next-auth.session-token');
    }

    // Ambil Access Token resmi dari endpoint internal session
    let sessionData = {};
    try {
      sessionData = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/auth/session');
          if (res.ok) return await res.json();
        } catch (e) {}
        return {};
      });
    } catch (e) {}

    const accessToken = sessionData.accessToken || 'N/A';
    const expires = sessionData.expires || 'N/A';
    const userName = (sessionData.user && sessionData.user.name) || 'User';

    // 7. Simpan Token
    // Simpan ke ringkasan chatgpt_tokens.txt
    const tokenRecord = `${email}|${accessToken}|${sessionTokenParts}|${expires}\n`;
    fs.appendFileSync(TOKENS_FILE, tokenRecord, 'utf-8');

    // Simpan detail terstruktur ke tokens/{email}.json
    const jsonPath = path.join(TOKENS_DIR, `${email.replace(/[@.]/g, '_')}.json`);
    const fullData = {
      email,
      name: userName,
      accessToken,
      sessionToken: sessionTokenParts,
      expires,
      harvestedAt: new Date().toISOString(),
      cookies,
      user: sessionData.user || {},
    };
    fs.writeFileSync(jsonPath, JSON.stringify(fullData, null, 2), 'utf-8');

    // 8. Bersihkan akun dari akun.txt (Idempotent)
    removeAccountFromList(raw);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ${c.green}✓ SUKSES! [${elapsed}s] Token sesi berhasil disimpan.${c.reset}`);
    console.log(`    ${c.gray}User:${c.reset} ${userName} | ${c.gray}Expires:${c.reset} ${expires}`);
    return true;
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`  ${c.red}✗ GAGAL! [${elapsed}s] ${error.message}${c.reset}`);

    // Tangkap screenshot error untuk kemudahan investigasi
    try {
      const sanitized = email.replace(/[@.]/g, '_');
      const ssPath = path.join(SCREENSHOTS_DIR, `error-${sanitized}-${Date.now()}.png`);
      await page.screenshot({ path: ssPath, fullPage: true });
      console.log(`    ${c.dim}Screenshot error disimpan: ${ssPath}${c.reset}`);
    } catch (e) {}

    return false;
  } finally {
    await page.close();
  }
}

async function main() {
  printBanner();

  const accounts = loadAccounts();
  const total = accounts.length;

  if (total === 0) {
    console.log(`${c.yellow}[!] Berkas akun.txt kosong. Masukkan akun terlebih dahulu.${c.reset}\n`);
    process.exit(0);
  }

  console.log(`${c.cyan}[i] Ditemukan ${c.bright}${total}${c.reset}${c.cyan} akun di akun.txt.${c.reset}`);
  console.log(`${c.gray}[i] Memulai automasi browser headless (Stealth Mode)...${c.reset}\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,800',
    ],
  });

  let successCount = 0;
  let failCount = 0;
  const overallStart = Date.now();

  for (let i = 0; i < total; i++) {
    const ok = await processAccount(browser, accounts[i], i, total);
    if (ok) successCount++;
    else failCount++;

    // Jeda alami antar akun (3-5 detik)
    if (i < total - 1) {
      const pause = Math.floor(Math.random() * 2000) + 3000;
      console.log(`  ${c.gray}Jeda alami ${pause / 1000}s sebelum akun berikutnya...${c.reset}`);
      await sleep(pause);
    }
  }

  await browser.close();

  const totalTime = ((Date.now() - overallStart) / 1000).toFixed(1);
  console.log(`\n${c.cyan}════════════════════════════════════════════════════════════════════${c.reset}`);
  console.log(`${c.bright}📊 RINGKASAN PEMANENAN TOKEN CHATGPT:${c.reset}`);
  console.log(`  • Total Akun      : ${total}`);
  console.log(`  • Berhasil        : ${c.green}${successCount}${c.reset}`);
  console.log(`  • Gagal           : ${c.red}${failCount}${c.reset}`);
  console.log(`  • Total Waktu     : ${totalTime}s`);
  console.log(`  • Hasil Tersimpan : ${c.yellow}${TOKENS_FILE}${c.reset} & ${c.yellow}${TOKENS_DIR}/${c.reset}`);
  console.log(`${c.cyan}════════════════════════════════════════════════════════════════════${c.reset}\n`);
}

main().catch((err) => {
  console.error(`\n${c.red}[FATAL ERROR] ${err.message}${c.reset}`);
  process.exit(1);
});
