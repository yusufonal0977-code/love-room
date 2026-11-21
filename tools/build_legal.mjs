// legal.html'in içine yasal metinlerin Türkçe halini sabit HTML olarak yazar (K7): JavaScript çalıştırmayan
// tarayıcılar, arama motoru botları ve mağaza incelemesi metni görebilsin. Sayfa açılınca JS seçili dilde yeniden çizer.
// Kullanım: node tools/build_legal.mjs   (release.ps1 her yayında çalıştırır)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// i18n.js açılışta tarayıcı dilini okur; burada Türkçeye sabitlenir
globalThis.localStorage = { getItem: () => 'tr', setItem() {} };
const { LEGAL } = await import(pathToFileURL(join(ROOT, 'js', 'legal.js')).href);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const nav = LEGAL.map((d) => `<a href="#${d.id}">${esc(d.title)}</a>`).join('');
const main = LEGAL.map((d) => `<section id="${d.id}"><h2>${esc(d.title)}</h2>${d.html}</section>`).join('\n');

const file = join(ROOT, 'legal.html');
let html = readFileSync(file, 'utf8');
const put = (tag, body) => {
  const re = new RegExp(`(<${tag} id="${tag}">)[\\s\\S]*?(</${tag}>)`);
  if (!re.test(html)) throw new Error(`legal.html içinde <${tag} id="${tag}"> bulunamadı`);
  html = html.replace(re, (_, a, b) => `${a}<!-- build_legal.mjs üretir, elle düzenlemeyin -->\n${body}\n${b}`);
};
put('nav', nav);
put('main', main);
writeFileSync(file, html);
console.log(`legal.html: ${LEGAL.length} bölüm yazıldı`);
