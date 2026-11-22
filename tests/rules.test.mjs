// Veritabanı kuralları için güvenlik ağı: yayın öncesi yanlışlıkla açılan bir kapı testte yakalanır.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const raw = readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8');
const r = JSON.parse(raw).rules;

test('kurallarda şifre ya da yer tutucu yok', () => {
  assert.ok(!/__ADMIN_SIFRE__|password|sifre/i.test(raw));
});
test('kök düzeyde herkese açık okuma/yazma yok', () => {
  for (const [k, v] of Object.entries(r)) {
    assert.notEqual(v['.read'], true, `${k} herkese açık okunuyor`);
    assert.notEqual(v['.write'], true, `${k} herkese açık yazılıyor`);
  }
});
test('vitrin yalnızca girişli okunur, oda numarası okunamaz', () => {
  assert.match(r.showcase.$id['.read'], /auth != null/);
  assert.equal(r.showcaseRid.$id['.read'], undefined);
});
test('admin işareti istemciden eklenemez, yalnızca silinebilir', () => {
  assert.match(r.admins.$uid['.write'], /!newData\.exists\(\)/);
});
test('sayaçlar, görüşler yalnızca adminlerce okunur; bildirim jetonları kimse tarafından okunamaz', () => {
  assert.match(r.metrics['.read'], /admins/);
  assert.match(r.feedback['.read'], /admins/);
  assert.equal(r.push['.read'], undefined);
  assert.equal(r.push.$uid['.read'], undefined);
});
test('olay sayacı yalnızca birer artar', () => {
  assert.match(r.metrics.events.$day.$ev['.validate'], /data\.val\(\) \+ 1/);
});
