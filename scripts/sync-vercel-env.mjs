import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');

const envContent = fs.readFileSync(envPath, 'utf8');

// Parse .env lines preserving multiline values if any
const envMap = {};
let currentKey = null;
let currentValue = '';
let inQuotes = false;
let quoteChar = '';

for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!inQuotes && (trimmed.startsWith('#') || !trimmed)) continue;

  if (!inQuotes) {
    const eqIdx = line.indexOf('=');
    if (eqIdx > 0) {
      currentKey = line.slice(0, eqIdx).trim();
      let rawVal = line.slice(eqIdx + 1).trim();
      if ((rawVal.startsWith('"') || rawVal.startsWith("'"))) {
        quoteChar = rawVal[0];
        if (rawVal.endsWith(quoteChar) && rawVal.length > 1) {
          envMap[currentKey] = rawVal.slice(1, -1);
          currentKey = null;
        } else {
          inQuotes = true;
          currentValue = rawVal.slice(1);
        }
      } else {
        envMap[currentKey] = rawVal;
        currentKey = null;
      }
    }
  } else {
    if (line.endsWith(quoteChar)) {
      currentValue += '\n' + line.slice(0, -1);
      envMap[currentKey] = currentValue;
      inQuotes = false;
      currentKey = null;
    } else {
      currentValue += '\n' + line;
    }
  }
}

// Variables to skip or adjust
delete envMap['PORT'];
delete envMap['NODE_ENV'];

// Ensure NEXTAUTH_URL has production URL default if pointing to localhost
if (envMap['NEXTAUTH_URL']?.includes('localhost')) {
  envMap['NEXTAUTH_URL'] = 'https://fims-v2.vercel.app';
}

console.log(`Syncing ${Object.keys(envMap).length} environment variables to Vercel production...`);

for (const [key, value] of Object.entries(envMap)) {
  if (!value) continue;
  try {
    console.log(`Setting ${key}...`);
    // Pass via stdin to handle multi-line strings (like private keys) safely
    execSync(`vercel env add ${key} production --yes --force`, {
      input: value,
      stdio: ['pipe', 'pipe', 'inherit'],
      cwd: path.resolve(__dirname, '..')
    });
  } catch (err) {
    console.error(`Failed to set ${key}:`, err.message);
  }
}

console.log('All environment variables synced to Vercel successfully!');
