// Get Love Room fotoğraf deposu (K6-C): Cloudflare Worker + R2. Kurulum: tools/cloudflare/foto/BENI-OKU.md
//   POST   /up    (Authorization: Bearer <Firebase kimlik belgesi>, gövde: JPEG/PNG/WebP, en çok 2 MB) -> { url }
//   GET    /p/<uid>/<rastgele>.<uzantı>   herkese açık ama tahmin edilemez adres; 1 yıl önbellek
//   DELETE /mine  (Authorization) -> kişinin tüm fotoğrafları silinir (hesap silme)
// Kimlik Firebase'e sorulur (accounts:lookup); sahte istek yükleyemez ve silemez.
const WEB_KEY = 'AIzaSyCrFiwx-bcYCBKXWHYoK0EQvnmxr3teUdU'; // Firebase web anahtarı: herkese açık
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const ORIGINS = ['https://getloveroom.com', 'https://www.getloveroom.com', 'http://localhost:5181', 'http://localhost:5180'];

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') || '';
    const cors = { 'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : 'https://getloveroom.com', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, DELETE', Vary: 'Origin' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

    if (req.method === 'GET' && url.pathname.startsWith('/p/')) {
      const obj = await env.FOTO.get(url.pathname.slice(3));
      if (!obj) return new Response('yok', { status: 404 });
      // Oyun ve paylaşım kartları fotoğrafı canvas'a çizer: her kaynaktan okunabilsin (adres zaten tahmin edilemez)
      return new Response(obj.body, { headers: { 'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable', 'Access-Control-Allow-Origin': '*' } });
    }

    const uid = await whoIs(req.headers.get('Authorization'));
    if (!uid) return json({ error: 'kimlik' }, 401, cors);

    if (req.method === 'POST' && url.pathname === '/up') {
      const type = (req.headers.get('Content-Type') || '').split(';')[0];
      if (!TYPES[type]) return json({ error: 'tür' }, 415, cors);
      const body = await req.arrayBuffer();
      if (body.byteLength > 2 * 1024 * 1024) return json({ error: 'büyük' }, 413, cors);
      const id = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
      const key = `${uid}/${id}.${TYPES[type]}`;
      await env.FOTO.put(key, body, { httpMetadata: { contentType: type } });
      return json({ url: `${url.origin}/p/${key}` }, 200, cors);
    }

    if (req.method === 'DELETE' && url.pathname === '/mine') {
      let cursor, n = 0;
      do {
        const list = await env.FOTO.list({ prefix: `${uid}/`, cursor });
        if (list.objects.length) { await env.FOTO.delete(list.objects.map((o) => o.key)); n += list.objects.length; }
        cursor = list.truncated ? list.cursor : undefined;
      } while (cursor);
      return json({ deleted: n }, 200, cors);
    }
    return json({ error: 'yok' }, 404, cors);
  },
};

async function whoIs(auth) {
  const token = (auth || '').replace(/^Bearer /, '');
  if (!token) return null;
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${WEB_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }) });
  if (!r.ok) return null;
  return (await r.json()).users?.[0]?.localId || null;
}
const json = (o, status, headers) => new Response(JSON.stringify(o), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
