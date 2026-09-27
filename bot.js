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
const http = require('http');
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

function syncToChatGPT2API(token, email, tokenType = 'access') {
  return new Promise((resolve) => {
    const chat2apiHost = process.env.CHAT2API_HOST || '127.0.0.1';
    const chat2apiPort = process.env.CHAT2API_PORT || 8085;
    const chat2apiAuth = process.env.CHAT2API_AUTH || 'sk-cha...etan';
    const postData = `text=${encodeURIComponent(token)}`;
    const req = http.request(
      {
        hostname: chat2apiHost,
        port: chat2apiPort,
        path: '/tokens/upload',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${chat2apiAuth}`,
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve(parsed.status === 'success');
          } catch (e) {
            resolve(false);
          }
        });
      }
    );
    req.on('error', () => resolve(false));
    req.write(postData);
    req.end();
  });
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

async function typeHumanLike(page, elementOrSelector, text) {
  let el = elementOrSelector;
  if (typeof elementOrSelector === 'string') {
    el = await page.$(elementOrSelector);
  }
  if (!el) return;

  await el.click({ clickCount: 3 });
  await page.keyboard.press('Backspace');
  await sleep(150);

  for (const char of text) {
    await page.keyboard.sendCharacter(char);
    const delay = Math.floor(Math.random() * 45) + 30;
    await sleep(delay);
  }
}

async function processAccount(account, index, total) {
  const { email, password, raw } = account;
  const startTime = Date.now();
  console.log(`\n${c.cyan}[${index + 1}/${total}] 🚀 Memproses: ${c.bright}${email}${c.reset}`);

  // Selalu luncurkan browser baru per akun agar sesi & cookie 100% bersih terisolasi
  // Gunakan headed mode (non-headless) via Xvfb untuk bypass Cloudflare detection
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,800',
      '--disable-features=IsolateOrigins,site-per-process',
      '--display=' + (process.env.DISPLAY || ':99'),
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36'
  );

  // Extra anti-detection: override webdriver flag
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    // Remove Puppeteer-specific properties
    delete navigator.__proto__.webdriver;
  });

  // --- Intercept OAuth responses to capture refresh_token ---
  let capturedRefreshToken = null;
  page.on('response', async (response) => {
    try {
      const url = response.url();
      // Auth0 token exchange endpoint — returns { access_token, refresh_token, ... }
      if (url.includes('auth0.openai.com/oauth/token') && response.status() === 200) {
        const data = await response.json();
        if (data.refresh_token) {
          capturedRefreshToken = data.refresh_token;
          console.log(`    ${c.magenta}🔑 [OAuth] Refresh token berhasil dicapture! (${data.refresh_token.length} chars)${c.reset}`);
        }
      }
    } catch (e) {
      // Silent — some responses can't be read
    }
  });

  try {
    // 1. Login ke Google Session Terlebih Dahulu (Two-step Rock Solid Auth)
    console.log(`  ${c.gray}→ Mengautentikasi sesi Google (accounts.google.com)...${c.reset}`);
    await page.goto('https://accounts.google.com/signin', {
      waitUntil: 'networkidle2',
      timeout: 35000,
    });
    await sleep(1000);

    // Isi Email Google
    console.log(`  ${c.gray}→ Memasukkan email Google...${c.reset}`);
    await page.waitForSelector('#identifierId', { visible: true, timeout: 20000 });
    await sleep(400);
    await typeHumanLike(page, '#identifierId', email);
    await sleep(400);

    const nextBtn = await page.$('#identifierNext button, #identifierNext');
    if (nextBtn) await nextBtn.click();
    else await page.keyboard.press('Enter');

    // Tunggu halaman pindah ke form password
    await sleep(3000);

    // Cek apakah Google menampilkan error / captcha / challenge
    const emailPageState = await page.evaluate(() => {
      const bodyText = (document.body.innerText || '').toLowerCase();
      if (bodyText.includes('couldn\'t find your google account') || bodyText.includes('akun google anda tidak ditemukan')) return 'email_invalid';
      if (bodyText.includes('try again') || bodyText.includes('coba lagi')) return 'try_again';
      if (bodyText.includes('verify it\'s you') || bodyText.includes('verifikasi')) return 'verify';
      if (document.querySelector('#captchaimg, iframe[src*="recaptcha"]')) return 'captcha';
      if (document.querySelector('#identifierId')) return 'still_on_email';
      return 'ok';
    });

    if (emailPageState !== 'ok') {
      console.log(`  ${c.yellow}⚠ Google login status: ${emailPageState}${c.reset}`);
      if (emailPageState === 'still_on_email') {
        // Email didn't advance — click next again
        const retryNext = await page.$('#identifierNext button, #identifierNext');
        if (retryNext) await retryNext.click();
        await sleep(3000);
      }
    }

    // Isi Password Google
    console.log(`  ${c.gray}→ Memasukkan password Google...${c.reset}`);
    await sleep(2500);

    const pwdSelectors = [
      'input[type="password"][name="Passwd"]',
      'input[type="password"]',
      '#password input',
      'input[name="Passwd"]',
    ];

    let pwdField = null;
    for (const sel of pwdSelectors) {
      try {
        pwdField = await page.waitForSelector(sel, { visible: true, timeout: 15000 });
        if (pwdField) break;
      } catch {}
    }

    if (!pwdField) {
      throw new Error('Kolom password Google tidak muncul atau akun meminta 2FA/verifikasi SMS');
    }

    await sleep(500);
    await typeHumanLike(page, pwdField, password);
    await sleep(400);

    const pwdNextBtn = await page.$('#passwordNext button, #passwordNext');
    if (pwdNextBtn) await pwdNextBtn.click();
    else await page.keyboard.press('Enter');

    console.log(`  ${c.gray}→ Menunggu konfirmasi login Google...${c.reset}`);
    await sleep(4000);

    // Handle syarat akun Google baru ("I understand" / "Saya mengerti") jika muncul
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const handled = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button, a'));
          const target = btns.find((b) => {
            const t = (b.innerText || '').toLowerCase();
            return (
              t.includes('i understand') ||
              t.includes('saya mengerti') ||
              t.includes('agree') ||
              t.includes('setuju')
            );
          });
          if (target) {
            target.click();
            return true;
          }
          return false;
        });
        if (handled) {
          console.log(`  ${c.gray}→ Menyetujui konfirmasi Google Workspace...${c.reset}`);
          await sleep(3000);
        }
      } catch {}
    }

    // 2. Sekarang Buka Portal Login ChatGPT
    console.log(`  ${c.gray}→ Mengakses portal ChatGPT (chatgpt.com/auth/login)...${c.reset}`);
    await page.goto('https://chatgpt.com/auth/login', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await sleep(3000);

    // 2a. Handle Cloudflare Turnstile Challenge (up to 30s with retry clicks)
    for (let cfAttempt = 1; cfAttempt <= 6; cfAttempt++) {
      let hasTurnstile = false;
      try {
        hasTurnstile = await page.evaluate(() => {
          return !!(
            document.querySelector('iframe[src*="challenges.cloudflare.com"]') ||
            document.querySelector('.cf-turnstile') ||
            document.querySelector('#cf-turnstile') ||
            (document.body.innerText || '').includes('Verify you are human')
          );
        });
      } catch {
        // Page navigated — Turnstile likely auto-resolved
        break;
      }

      if (!hasTurnstile) {
        if (cfAttempt > 1) console.log(`  ${c.green}✓ Cloudflare Turnstile berhasil dilewati!${c.reset}`);
        break;
      }

      if (cfAttempt === 1) {
        console.log(`  ${c.yellow}⚡ Cloudflare Turnstile terdeteksi — menunggu & mencoba klik...${c.reset}`);
      }

      // Try clicking the Turnstile checkbox
      try {
        const frames = page.frames();
        const turnstileFrame = frames.find(f => f.url().includes('challenges.cloudflare.com'));
        if (turnstileFrame) {
          const iframeEl = await page.$('iframe[src*="challenges.cloudflare.com"]');
          if (iframeEl) {
            const box = await iframeEl.boundingBox();
            if (box) {
              // Click the checkbox area (left side of the iframe)
              await page.mouse.click(box.x + 25, box.y + box.height / 2);
              console.log(`  ${c.gray}→ Turnstile checkbox diklik (attempt ${cfAttempt})...${c.reset}`);
            }
          }
        }
      } catch {}

      await sleep(5000);

      if (cfAttempt === 6) {
        console.log(`  ${c.yellow}⚠ Turnstile belum terpecahkan setelah 30s — melanjutkan...${c.reset}`);
        // Take debug screenshot
        try { await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `turnstile-blocked-${email.replace(/[@.]/g,'_')}.png`) }); } catch {}
      }
    }

    // After Turnstile, check if we need to wait for page reload
    await sleep(2000);
    try {
      const curUrl = page.url();
      if (!curUrl.includes('chatgpt.com') && !curUrl.includes('auth0.openai.com')) {
        await page.goto('https://chatgpt.com/auth/login', { waitUntil: 'domcontentloaded', timeout: 25000 });
        await sleep(2000);
      }
    } catch {}

    // Klik "Continue with Google"
    console.log(`  ${c.gray}→ Memilih metode 'Continue with Google'...${c.reset}`);
    let clickedGoogle = false;
    try {
      const [googleBtn] = await page.$$("xpath/.//button[contains(., 'Continue with Google')]");
      if (googleBtn) {
        await googleBtn.click();
        clickedGoogle = true;
      }
    } catch {}

    if (!clickedGoogle) {
      // Fallback selector
      clickedGoogle = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) =>
          (b.innerText || '').includes('Continue with Google')
        );
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
    }

    // 3. Tangani Layar Pemilihan Akun Google / Onboarding OpenAI
    console.log(`  ${c.gray}→ Menunggu otorisasi SSO & layar onboarding...${c.reset}`);
    const maxWaitTime = 60000;
    const waitStart = Date.now();

    while (Date.now() - waitStart < maxWaitTime) {
      await sleep(2000);
      let curUrl = '';
      try { curUrl = page.url(); } catch { continue; }

      // Kasus CF: Cloudflare Turnstile di auth0.openai.com atau chatgpt.com
      try {
        const isTurnstile = await page.evaluate(() => {
          return !!(
            document.querySelector('iframe[src*="challenges.cloudflare.com"]') ||
            (document.body.innerText || '').includes('Verify you are human')
          );
        });
        if (isTurnstile) {
          console.log(`  ${c.yellow}⚡ Cloudflare Turnstile muncul di SSO flow — mencoba klik...${c.reset}`);
          try {
            const iframeEl = await page.$('iframe[src*="challenges.cloudflare.com"]');
            if (iframeEl) {
              const box = await iframeEl.boundingBox();
              if (box) {
                await page.mouse.click(box.x + 25, box.y + box.height / 2);
              }
            }
          } catch {}
          await sleep(5000);
          continue;
        }
      } catch {
        // "Execution context destroyed" — page is navigating, which is good
        await sleep(2000);
        continue;
      }

      // Kasus A: Jika muncul layar Account Chooser Google
      if (curUrl.includes('accounts.google.com')) {
        try {
          const accSelector = `[data-identifier="${email}"], [data-email="${email}"]`;
          let accEl = await page.$(accSelector);
          if (accEl) {
            console.log(`  ${c.gray}→ Mengklik profil Google: ${email}...${c.reset}`);
            await accEl.click();
            await sleep(2000);
          } else {
            const clicked = await page.evaluate((targetEmail) => {
              const elements = Array.from(document.querySelectorAll('div, li, button, [role="link"]'));
              const target = elements.find((el) => (el.innerText || '').includes(targetEmail));
              if (target) {
                const clickable =
                  target.closest('[data-identifier], [data-email], [role="link"], li, button') || target;
                clickable.click();
                return true;
              }
              const firstAcc = document.querySelector('[data-identifier], [data-email], div[role="link"]');
              if (firstAcc) {
                firstAcc.click();
                return true;
              }
              return false;
            }, email);
            if (clicked) {
              console.log(`  ${c.gray}→ Mengklik profil akun di Google Chooser...${c.reset}`);
              await sleep(2000);
            }
          }

          const approveBtn = await page.$(
            '#submit_approve_access, button::-p-text(Lanjutkan), button::-p-text(Izinkan), button::-p-text(Continue), button::-p-text(Allow)'
          );
          if (approveBtn) {
            console.log(`  ${c.gray}→ Mengonfirmasi persetujuan akses Google OAuth...${c.reset}`);
            await approveBtn.click();
            await sleep(3000);
          }
        } catch (e) {}
      }

      // Kasus B: Deteksi form umur OpenAI ("How old are you?" / auth.openai.com/about-you)
      let isAboutYou = curUrl.includes('/about-you');
      if (!isAboutYou) { try { isAboutYou = !!(await page.$('input[placeholder="DD"], input[type="tel"], input#age')); } catch {} }
      if (isAboutYou) {
        console.log(`  ${c.yellow}→ Mendeteksi form usia OpenAI, mengisi tanggal lahir otomatis...${c.reset}`);
        try {
          const ageInput = await page.$('input[type="tel"], input[placeholder="Age"], input#age, input[name="age"]');
          if (ageInput) {
            const randomAge = String(Math.floor(Math.random() * 8) + 24);
            await typeHumanLike(page, ageInput, randomAge);
            await sleep(500);
          }

          // Klik Continue
          await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const cBtn = btns.find((b) => (b.innerText || '').trim().toLowerCase() === 'continue');
            if (cBtn) cBtn.click();
          });
        } catch {}
      }

      // Kasus C: Klik tombol modal "Continue" atau "You're all set"
      try {
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const btn = btns.find((b) => {
            const txt = (b.innerText || '').trim().toLowerCase();
            return (
              txt === 'continue' ||
              txt.includes("you're all set") ||
              txt === 'stay logged in' ||
              txt === 'tetap masuk' ||
              txt === 'lanjutkan'
            );
          });
          if (btn && btn.offsetParent !== null) btn.click();
        });
      } catch {}

      // Cek apakah sudah mendarat di dashboard utama ChatGPT
      if (curUrl.includes('chatgpt.com') && !curUrl.includes('/auth/')) {
        console.log(`  ${c.green}✓ Berhasil mendarat di dashboard ChatGPT!${c.reset}`);
        break;
      }
    }

    await sleep(3500);

    // 4. Ekstraksi Token Sesi & Kredensial
    console.log(`  ${c.gray}→ Mengekstrak token sesi & cookie otentikasi...${c.reset}`);
    const cookies = await page.cookies();

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

    // 5. Simpan Token
    const tokenRecord = `${email}|${accessToken}|${sessionTokenParts}|${expires}|${capturedRefreshToken || 'N/A'}\n`;
    fs.appendFileSync(TOKENS_FILE, tokenRecord, 'utf-8');

    const jsonPath = path.join(TOKENS_DIR, `${email.replace(/[@.]/g, '_')}.json`);
    const fullData = {
      email,
      name: userName,
      accessToken,
      refreshToken: capturedRefreshToken || null,
      sessionToken: sessionTokenParts,
      expires,
      harvestedAt: new Date().toISOString(),
      cookies,
      user: sessionData.user || {},
    };
    fs.writeFileSync(jsonPath, JSON.stringify(fullData, null, 2), 'utf-8');

    // 6. Bersihkan akun dari akun.txt (Idempotent)
    removeAccountFromList(raw);

    // 7. Auto-sync ke chat2api (ChatGPT to API bridge → 9Router)
    //    Prioritas: refresh_token (auto-renew, hidup berbulan-bulan) > access_token (10 hari)
    if (process.env.AUTO_SYNC !== 'false') {
      let synced = false;
      if (capturedRefreshToken) {
        synced = await syncToChatGPT2API(capturedRefreshToken, email, 'refresh');
        if (synced) {
          console.log(`    ${c.green}⚡ [chat2api] Refresh token di-upload → auto-renew aktif (hidup berbulan-bulan)!${c.reset}`);
        }
      }
      if (!synced && accessToken && accessToken.startsWith('eyJ')) {
        synced = await syncToChatGPT2API(accessToken, email, 'access');
        if (synced) {
          console.log(`    ${c.yellow}⚡ [chat2api] Access token di-upload (fallback, berlaku 10 hari saja).${c.reset}`);
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ${c.green}✓ SUKSES! [${elapsed}s] Token sesi berhasil disimpan.${c.reset}`);
    console.log(`    ${c.gray}User:${c.reset} ${userName} | ${c.gray}Expires:${c.reset} ${expires}`);
    return true;
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`  ${c.red}✗ GAGAL! [${elapsed}s] ${error.message}${c.reset}`);

    try {
      const sanitized = email.replace(/[@.]/g, '_');
      const ssPath = path.join(SCREENSHOTS_DIR, `error-${sanitized}-${Date.now()}.png`);
      await page.screenshot({ path: ssPath, fullPage: true });
      console.log(`    ${c.dim}Screenshot error disimpan: ${ssPath}${c.reset}`);
    } catch (e) {}

    return false;
  } finally {
    try {
      await page.close();
    } catch (e) {}
    try {
      await browser.close();
    } catch (e) {}
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
  console.log(`${c.gray}[i] Memulai automasi browser per akun (Stealth Mode)...${c.reset}\n`);

  let successCount = 0;
  let failCount = 0;
  const overallStart = Date.now();

  for (let i = 0; i < total; i++) {
    const ok = await processAccount(accounts[i], i, total);
    if (ok) successCount++;
    else failCount++;

    if (i < total - 1) {
      const pause = Math.floor(Math.random() * 2000) + 3000;
      console.log(`  ${c.gray}Jeda alami ${pause / 1000}s sebelum akun berikutnya...${c.reset}`);
      await sleep(pause);
    }
  }

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
