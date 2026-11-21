// Yayın öncesi güvenlik ağı (K30). release.ps1 her yayından önce çalıştırır; hata varsa yayını durdurur.
//   1. Yasal metinleri legal.html'e sabit yazar (tools/build_legal.mjs)
//   2. Her js modülünü sözdizimi için denetler (node --check)
//   3. Repoya girecek dosyalarda şifre/gizli anahtar kalıbı arar (Firebase'in herkese açık web anahtarı hariç)
//   4. Eksik çevirileri sayar (yalnızca uyarı)
// Kullanım: node tools/preflight.mjs
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = false;
const fail = (m) => { console.error('HATA: ' + m); failed = true; };

// 1
const legal = spawnSync(process.execPath, [join(ROOT, 'tools', 'build_legal.mjs')], { encoding: 'utf8' });
if (legal.status !== 0) fail('legal.html üretilemedi\n' + legal.stderr); else process.stdout.write(legal.stdout);

// 2
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const tmp = mkdtempSync(join(tmpdir(), 'lr-check-'));
let n = 0;
for (const f of walk(join(ROOT, 'js')).filter((p) => p.endsWith('.js'))) {
  const copy = join(tmp, (n++) + '.mjs');
  writeFileSync(copy, readFileSync(f));
  const r = spawnSync(process.execPath, ['--check', copy], { encoding: 'utf8' });
  if (r.status !== 0) fail(`sözdizimi: ${f.slice(ROOT.length + 1)}\n${r.stderr.split('\n').slice(0, 4).join('\n')}`);
}
rmSync(tmp, { recursive: true, force: true });
console.log(`sözdizimi: ${n} modül denetlendi`);

// 3
const TEXT = new Set(['.js', '.mjs', '.json', '.html', '.css', '.md', '.txt', '.py', '.ps1', '.java', '.xml', '.gradle', '.properties', '.tsv', '.yml', '.yaml', '.gs']);
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
const PATTERNS = [
  [/TURN_(USER|PASS)\s*=\s*['"][^'"]+['"]/, 'TURN kullanıcı adı/şifresi'],
  [/\bcredential\s*:\s*['"][A-Za-z0-9+/=_-]{8,}['"]/, 'WebRTC kimlik bilgisi'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'özel anahtar'],
  [/secretKey=[A-Za-z0-9_-]{12,}/, 'gizli API anahtarı'],
  [/\b(sk|rk)_(live|test)_[A-Za-z0-9]{12,}/, 'ödeme servisi gizli anahtarı'],
  [/(storePassword|keyPassword)\s*=\s*\S+/, 'keystore şifresi'],
  [/ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}/, 'GitHub erişim anahtarı'],
];
for (const f of files) {
  if (!TEXT.has(extname(f).toLowerCase()) || f.startsWith('tools/preflight.mjs')) continue;
  let s; try { s = readFileSync(join(ROOT, f), 'utf8'); } catch { continue; }
  for (const [re, what] of PATTERNS) if (re.test(s)) fail(`${f}: ${what} gibi görünen bir değer var. Repoya şifre girmemeli.`);
}
console.log(`sır taraması: ${files.length} dosya`);

// 4
const miss = spawnSync('python', [join(ROOT, 'tools', 'i18n', 'build.py'), '--missing'], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
const missing = (miss.stdout || '').split('\n').filter((l) => l.trim()).length;
if (miss.status === 0 && missing) console.warn(`uyarı: çevrilmemiş metin kalemi: ${missing} (python tools/i18n/build.py --missing)`);

if (failed) { console.error('Ön kontrol BAŞARISIZ, yayın durduruldu.'); process.exit(1); }
console.log('Ön kontrol tamam.');
