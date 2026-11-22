// Koddaki küçük sözleşmeler: olay adları kuralın kabul ettiği biçimde mi, sitede emoji var mı.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const js = walk(join(ROOT, 'js')).filter((p) => p.endsWith('.js') && !/[\/]i18n[\/]/.test(p));

test('track() olay adları kuralla uyumlu (küçük harf, alt çizgi, 2-24)', () => {
  for (const f of js) for (const [, ev] of readFileSync(f, 'utf8').matchAll(/\btrack\('([^']+)'\)/g)) assert.match(ev, /^[a-z_]{2,24}$/, `${f}: ${ev}`);
});
test('arayüz kodunda emoji yok (sahibin kuralı)', () => {
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/u;
  for (const f of [...js, join(ROOT, 'index.html')]) {
    const lines = readFileSync(f, 'utf8').split('\n');
    lines.forEach((l, i) => { if (EMOJI.test(l) && !l.includes('emoji')) assert.fail(`${f}:${i + 1} emoji içeriyor`); });
  }
});
