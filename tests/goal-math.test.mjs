// Haftalık hedef ve art arda gün hesapları (js/features/goal-math.js). Çalıştır: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekKey, streakOf, localDay } from '../js/features/goal-math.js';

const at = (s) => new Date(`${s}T12:00:00`).getTime();

test('ISO hafta: pazartesi başlar, yıl sınırı doğru', () => {
  assert.equal(weekKey(at('2026-11-22')), '2026-W47'); // pazar
  assert.equal(weekKey(at('2026-11-23')), '2026-W48'); // pazartesi
  assert.equal(weekKey(at('2026-01-01')), '2026-W01'); // perşembe
  assert.equal(weekKey(at('2027-01-01')), '2026-W53'); // cuma, önceki yılın son haftası
  assert.equal(weekKey(at('2024-12-30')), '2025-W01'); // pazartesi, sonraki yılın ilk haftası
});

test('yerel gün biçimi', () => {
  assert.equal(localDay(at('2026-03-05')), '2026-03-05');
});

test('art arda gün: ikisi de uğramış günler sayılır', () => {
  const days = { '2026-11-20': { a: true, b: true }, '2026-11-21': { a: true, b: true }, '2026-11-22': { a: true, b: true } };
  assert.equal(streakOf(days, 'a', 'b', '2026-11-22'), 3);
});

test('art arda gün: bugün partner henüz gelmediyse seri kırılmaz, dünden sayılır', () => {
  const days = { '2026-11-21': { a: true, b: true }, '2026-11-22': { a: true } };
  assert.equal(streakOf(days, 'a', 'b', '2026-11-22'), 1);
});

test('art arda gün: boşluk seriyi bitirir, partner yoksa 0', () => {
  const days = { '2026-11-19': { a: true, b: true }, '2026-11-21': { a: true, b: true }, '2026-11-22': { a: true, b: true } };
  assert.equal(streakOf(days, 'a', 'b', '2026-11-22'), 2);
  assert.equal(streakOf(days, 'a', null, '2026-11-22'), 0);
});
