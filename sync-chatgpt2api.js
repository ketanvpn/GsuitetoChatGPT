#!/usr/bin/env node

/**
 * Sync harvested tokens to chat2api (ChatGPT to API bridge)
 * Reads all token files from tokens/ directory and uploads to chat2api
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

  // Collect all access tokens
  const accessTokens = [];
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(tokensDir, file), 'utf8'));
    if (data.accessToken) {
      accessTokens.push(data.accessToken);
      console.log(`  ✓ ${data.email || file}`);
    }
  }

  if (accessTokens.length === 0) {
    console.log('No access tokens found.');
    return;
  }

  // Upload all tokens at once
  const tokenText = accessTokens.join('\n');
  const postData = `text=${encodeURIComponent(tokenText)}`;
  
  try {
    const result = await httpPost(`${CHAT2API_URL}/tokens/upload`, postData);
    const body = JSON.parse(result.body);
    if (body.status === 'success') {
      console.log(`\n✅ Successfully uploaded ${body.tokens_count} tokens to chat2api!`);
    } else {
      console.log(`\n❌ Upload failed: ${JSON.stringify(body)}`);
    }
  } catch (err) {
    console.log(`\n❌ Error: ${err.message}`);
  }
}

main();
