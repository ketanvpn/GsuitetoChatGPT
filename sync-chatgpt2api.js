#!/usr/bin/env node

/**
 * Sync harvested tokens to chat2api (ChatGPT to API bridge)
 * Reads all token files from tokens/ directory and uploads to chat2api
 *
 * Prioritas: refresh_token (auto-renew, awet berbulan-bulan) > access_token (10 hari)
 * chat2api mendeteksi tipe token otomatis:
 *   - Dimulai "eyJ" → access_token (langsung dipakai, expire 10 hari)
 *   - Panjang 45 karakter → refresh_token (auto-refresh ke access_token baru)
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const CHAT2API_URL = process.env.CHAT2API_URL || 'http://127.0.0.1:8085';
const CHAT2API_AUTH = process.env.CHAT2API_AUTH || 'sk-chatgpt2api-ketan';

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
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  const tokensDir = path.join(__dirname, 'tokens');
  if (!fs.existsSync(tokensDir)) {
    console.log('No tokens/ directory found.');
    return;
  }

  const files = fs.readdirSync(tokensDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('No token files found in tokens/');
    return;
  }

  console.log(`\n🔄 Syncing ${files.length} tokens to chat2api (${CHAT2API_URL})...\n`);

  // Collect tokens — prioritize refresh_token over access_token
  const tokens = [];
  let refreshCount = 0;
  let accessCount = 0;
  let skipCount = 0;

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(tokensDir, file), 'utf8'));
    const email = data.email || file;

    if (data.refreshToken) {
      tokens.push(data.refreshToken);
      refreshCount++;
      console.log(`  🔑 ${email} — refresh_token (auto-renew, awet berbulan-bulan)`);
    } else if (data.accessToken && data.accessToken.startsWith('eyJ')) {
      tokens.push(data.accessToken);
      accessCount++;
      console.log(`  ⏳ ${email} — access_token (berlaku 10 hari)`);
    } else {
      skipCount++;
      console.log(`  ⚠️  ${email} — skip (tidak ada token valid)`);
    }
  }

  if (tokens.length === 0) {
    console.log('\nTidak ada token yang bisa di-upload.');
    return;
  }

  console.log(`\n📊 Ringkasan: ${refreshCount} refresh + ${accessCount} access + ${skipCount} skip\n`);

  // Upload all tokens at once
  const tokenText = tokens.join('\n');
  const postData = `text=${encodeURIComponent(tokenText)}`;

  try {
    const result = await httpPost(`${CHAT2API_URL}/tokens/upload`, postData);
    const body = JSON.parse(result.body);
    if (body.status === 'success') {
      console.log(`✅ Berhasil upload ${body.tokens_count} token ke chat2api!`);
      if (refreshCount > 0) {
        console.log(`   💡 ${refreshCount} refresh token akan auto-renew access token setiap 5 hari.`);
      }
      if (accessCount > 0) {
        console.log(`   ⚠️  ${accessCount} access token akan expire dalam 10 hari — harvest ulang untuk refresh token.`);
      }
    } else {
      console.log(`\n❌ Upload gagal: ${JSON.stringify(body)}`);
    }
  } catch (err) {
    console.log(`\n❌ Error: ${err.message}`);
  }
}

main();
