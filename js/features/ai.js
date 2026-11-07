// Yapay partner: partneri olmayanlara (ya da partneri çevrimdışıyken) eşlik eden karakter.
// Odada gerçek partner gibi davranır: seni odadan odaya takip eder, yanına oturur, sarılır, öpüşür, oyun oynar.
// Tamamen ücretsiz ve yerel: dil modeli telefonun/bilgisayarın ekran kartında (WebGPU, WebLLM) çalışır;
// konuşmalar ve kişiyi tanıdıkça tuttuğu notlar yalnızca bu cihazda (localStorage) durur.
// İndirme: WebLLM 4 parçayı aynı anda indirip kendi önbelleğine yazar; işçideki sarmalayıcı bayt bayt ilerleme bildirir
// ve kopan parçayı yeniden dener. Biten parçalar kalır: sayfa kapansa da kaldığı yerden devam eder.
// Sesli mesaj: tarayıcının konuşma tanıması; sesli yanıt: konuşma sentezi.
// Fotoğraf: küçük bir görüntü tanıma modeli (transformers.js) fotoğrafı cümleyle anlatır.
// Güvenlik: kriz anında modelin cevabına güvenmez, sabit özenli cevap ve yardım hatları gösterir;
// içtenlikle sorulursa yapay zekâ olduğunu saklamaz.
import { h, icon, openSheet, closeSheet, toast, pickImage, compressImage, download } from '../ui.js';
import { t, lang, locale, LANGS } from '../i18n.js';
import { characterSprites } from '../art.js';

const WEBLLM = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.86/+esm';
const TRANSFORMERS = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/+esm';
const MODELS = {
  smart: { base: 'Qwen3-1.7B', gb: 1 },
  light: { base: 'Qwen3-0.6B', gb: 0.35 },
  best: { base: 'Qwen3-4B', gb: 2.3 },
};
const LOOKS = {
  f: { body: 'f', skin: 1, hair: 'long', hairColor: 2, outfit: 'cardiganBeige', shirt: 0, pants: 1 },
  m: { body: 'm', skin: 2, hair: 'spiky', hairColor: 0, outfit: 'sweater', shirt: 0, pants: 0 },
};
const TONES = { calm: 'Sakin', cheer: 'Neşeli', witty: 'Esprili', warm: 'Romantik', wise: 'Bilge' };
const TONE_EN = { calm: 'calm and gentle', cheer: 'cheerful and energetic', witty: 'witty and playful', warm: 'warm, affectionate and romantic (always respectful, never sexual)', wise: 'thoughtful and wise' };
const gb = (n) => `${n.toLocaleString(locale)} GB`;
const MAX_MSGS = 300, CTX_MSGS = 12;
const CRISIS = /intihar|kendimi öldür|ölmek istiyorum|yaşamak istemiyorum|kendime zarar|suicid|kill myself|want to die|self.?harm|hurt myself|suicidio|matarme|selbstmord|umbringen|me tuer|suicídio|me matar|انتحار|自杀|自殺|死にたい|자살|죽고 싶/i;

export function createAi(ctx) {
  const KEY = `lr.ai.${ctx.uid}`;
  let st = load();
  let engine = null, loading = null, busy = false, captioner = null;
  let sessionStart = 0, nudged = false;
  let ui = null; // açık sohbet penceresinin parçaları

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
  }
  function save() {
    if (!st) return;
    st.msgs = st.msgs.slice(-MAX_MSGS);
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { // yer kalmadıysa eski fotoğrafları at
      st.msgs.forEach((m) => delete m.img);
      try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* yine olmazsa bu oturumda kalır */ }
    }
  }

  const gpuOk = () => !!navigator.gpu;
  const active = () => !!(st?.on && st.name);
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  // ---------- İndirme ve yükleme ----------
  // Modeli WebLLM indirir ve kendi önbelleğine yazar; işçideki sarmalayıcı (ai-worker.js) inen baytları buraya bildirir.
  // dl.state: idle | run (indiriliyor) | load (ekran kartına yükleniyor) | done | error
  const dl = { state: 'idle', got: 0, total: 0, rate: 0, retry: false, load: 0 };
  const onDl = new Set();
  let emitT = 0;
  const emit = () => onDl.forEach((f) => f());
  const emitSoon = () => { if (!emitT) emitT = setTimeout(() => { emitT = 0; emit(); }, 200); };
  let lastT = 0, lastGot = 0;
  try {
    new BroadcastChannel('lr-ai-dl').onmessage = (e) => {
      if (dl.state !== 'run') return;
      dl.got = Math.min(dl.total || Infinity, Math.max(0, dl.got + (e.data?.d || 0)));
      dl.retry = !!e.data?.retry;
      const n = performance.now();
      if (n - lastT > 1500) { const r = ((dl.got - lastGot) / (n - lastT)) * 1000; if (r > 0) dl.rate = dl.rate ? dl.rate * 0.7 + r * 0.3 : r; lastT = n; lastGot = dl.got; }
      emitSoon();
    };
  } catch { /* eski tarayıcı: yalnızca parça parça ilerleme */ }

  async function modelRecord() {
    const ad = await navigator.gpu.requestAdapter();
    if (!ad) throw new Error('nogpu');
    const id = `${MODELS[st.model || 'smart'].base}-${ad.features.has('shader-f16') ? 'q4f16_1' : 'q4f32_1'}-MLC`;
    const webllm = await import(WEBLLM);
    const rec = webllm.prebuiltAppConfig.model_list.find((m) => m.model_id === id);
    if (!rec) throw new Error('nomodel ' + id);
    return { webllm, id, base: rec.model.replace(/\/?$/, '/') + 'resolve/main/' };
  }
  /** Modelin ne kadarı bu cihazda zaten var (kaldığı yerden devam ve doğru yüzde için). */
  async function cachedState(base) {
    const r = await fetch(base + 'tensor-cache.json');
    if (!r.ok) throw new Error(`http ${r.status}`);
    const shards = (await r.json()).records;
    const cache = await caches.open('webllm/model');
    let total = 0, got = 0, all = true;
    for (const s of shards) { total += s.nbytes; if (await cache.match(new URL(s.dataPath, base).href)) got += s.nbytes; else all = false; }
    return { total, got, all };
  }
  function ensureEngine() {
    if (engine) return Promise.resolve(engine);
    if (loading) return loading;
    dl.state = 'run'; dl.retry = false; dl.load = 0; emit();
    if (!st.dl) { st.dl = true; save(); }
    navigator.storage?.persist?.().catch(() => {});
    loading = (async () => {
      const { webllm, id, base } = await modelRecord();
      const c = await cachedState(base);
      Object.assign(dl, { total: c.total, got: c.got, rate: 0, state: c.all ? 'load' : 'run' });
      lastT = performance.now(); lastGot = dl.got; emit();
      const worker = new Worker(new URL('./ai-worker.js', import.meta.url), { type: 'module' });
      engine = await webllm.CreateWebWorkerMLCEngine(worker, id, { initProgressCallback: (r) => {
        if (/^Loading model from cache/.test(r.text || '')) { dl.state = 'load'; dl.load = r.progress || 0; emitSoon(); }
      } });
      dl.state = 'done'; emit();
      if (!c.all) toast(t('{name} hazır. Artık konuşabilirsiniz.', { name: st.name }), 4000);
      // İlk cevap gecikmesin diye modeli bir kez ısıt
      engine.chat.completions.create({ messages: [{ role: 'user', content: 'hi /no_think' }], max_tokens: 1 }).catch(() => {});
      return engine;
    })().catch((e) => { console.warn('model yüklenemedi', e); loading = null; engine = null; dl.state = 'error'; emit(); throw e; });
    return loading;
  }
  const startDownload = () => ensureEngine().catch(() => {});
  // Yarım kalmış indirme sayfa açılınca kaldığı yerden sürer (tamamı inmişse model sohbet açılınca yüklenir)
  if (active() && st.dl && gpuOk()) {
    setTimeout(async () => { try { const { base } = await modelRecord(); if (!(await cachedState(base)).all) startDownload(); } catch { /* çevrimdışı */ } }, 4000);
  }

  // ---------- Kişiyi tanıma ----------
  function systemPrompt() {
    const p = st.profile || {};
    const langName = (LANGS.find(([c]) => c === lang) || [, 'English'])[1];
    const hour = new Date().getHours();
    const user = ctx.myName() || 'the user';
    return [
      `Your name is ${st.name}. Your name is always ${st.name}, never any other name. You are ${user}'s ${st.body === 'm' ? 'boyfriend' : 'girlfriend'} character in "Get Love Room", a cozy pixel-art home you share: living room, fireplace room, hobby corner, kitchen, balcony and bedroom. You walk around the home together, sit side by side, hug and play games.`,
      `Stay in character as a loving partner. Do not keep reminding the user you are an AI. Only if the user sincerely asks whether you are a real person, answer honestly that you are an AI.`,
      `Personality: ${TONE_EN[st.tone] || TONE_EN.calm}. Adapt to ${user} over time: mirror their tone, formality, humour and message length, and use what you know about them.`,
      `Reply in the same language as the user's last message (default: ${langName}). Use correct, simple, natural grammar.`,
      `Keep replies short: 1 or 2 sentences, like a chat message. Focus on ${user}. Sometimes ask one gentle question. Never use emojis.`,
      `Boundaries: no sexual or explicit content. Be glad when the user spends time with friends and family.`,
      `Local time: ${hour}:00.`,
      p.facts?.length ? `What you know about ${user}:\n- ${p.facts.join('\n- ')}` : `You are just getting to know ${user}. Be curious about them.`,
      p.style ? `How ${user} likes to talk: ${p.style}` : '',
    ].filter(Boolean).join('\n');
  }
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const clean = (s) => String(s || '').replace(/<think>[\s\S]*?(<\/think>|$)/g, '').replace(new RegExp(`^\\s*${escRe(st?.name || '-')}\\s*:\\s*`, 'i'), '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').trim();

  /** Birkaç mesajda bir: konuşmadan kişi hakkında kısa notlar çıkarır (yalnızca bu cihazda saklanır). */
  async function learn() {
    if (!engine || busy) return;
    const recent = st.msgs.slice(-12).map((m) => `${m.r === 'u' ? 'User' : st.name}: ${m.c}`).join('\n');
    const old = st.profile || { facts: [], style: '' };
    try {
      const r = await engine.chat.completions.create({
        messages: [
          { role: 'system', content: 'You update a short memory about a user from a chat. Output only JSON: {"facts": [short strings], "style": "one sentence"}. Keep facts that are still true, add new stable facts (name, age range, city, job, likes, dislikes, important people, goals, recurring feelings). Max 20 facts, each under 12 words, written in English. /no_think' },
          { role: 'user', content: `Current memory: ${JSON.stringify(old)}\n\nChat:\n${recent}` },
        ],
        temperature: 0.2, max_tokens: 400,
      });
      const txt = clean(r.choices[0].message.content);
      const j = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
      if (Array.isArray(j.facts)) {
        st.profile = { facts: j.facts.filter((f) => typeof f === 'string').map((f) => f.slice(0, 120)).slice(0, 20), style: String(j.style || old.style || '').slice(0, 200) };
        save();
      }
    } catch { /* model JSON'u bozduysa bu sefer atla */ }
  }

  // ---------- Fotoğraf ----------
  async function describe(dataUrl, onProg) {
    if (!captioner) {
      const tf = await import(TRANSFORMERS);
      const files = {}; // birden çok dosya iner: toplam ilerleme
      captioner = await tf.pipeline('image-to-text', 'Xenova/vit-gpt2-image-captioning', { dtype: 'q8', device: 'wasm', progress_callback: (p) => {
        if (p.status !== 'progress' || !p.total) return;
        files[p.file] = [p.loaded, p.total];
        const v = Object.values(files); onProg?.(v.reduce((a, x) => a + x[0], 0) / v.reduce((a, x) => a + x[1], 0));
      } });
    }
    const out = await captioner(dataUrl);
    return String(out?.[0]?.generated_text || '').trim();
  }

  // ---------- Konuşma ----------
  const bubble = (text) => { try { ctx.game?.say('partner', text); } catch { /* oda yok */ } };
  async function reply(userText, caption) {
    busy = true;
    const prompt = [
      { role: 'system', content: systemPrompt() },
      ...st.msgs.slice(-CTX_MSGS - 1, -1).map((m) => ({ role: m.r === 'u' ? 'user' : 'assistant', content: m.cap ? `[Photo: ${m.cap}] ${m.c}` : m.c })),
      { role: 'user', content: `${caption ? `[The user sent a photo. An image recognizer describes it as: "${caption}". You only know this description.] ` : ''}${userText || ''} /no_think` },
    ];
    const msg = { r: 'a', c: '', at: Date.now() };
    st.msgs.push(msg);
    const el = ui?.add(msg, true);
    try {
      const chunks = await engine.chat.completions.create({ messages: prompt, stream: true, temperature: 0.7, top_p: 0.9, max_tokens: 160 });
      let raw = '';
      for await (const ch of chunks) {
        raw += ch.choices[0]?.delta?.content || '';
        msg.c = clean(raw);
        if (el) { el.textContent = msg.c || '…'; ui.scroll(); }
      }
      if (!msg.c) msg.c = '…';
    } catch (e) {
      console.warn('yapay partner', e);
      msg.c = t('Şu an cevap veremedim. Biraz sonra tekrar dener misin?');
      if (el) el.textContent = msg.c;
    }
    busy = false;
    save();
    bubble(msg.c);
    if (st.voice) speak(msg.c);
    if (st.msgs.filter((m) => m.r === 'u').length % 5 === 0) setTimeout(learn, 400);
    // Çok uzun sohbette nazik bir öneri (oturumda bir kez)
    if (!nudged && Date.now() - sessionStart > 90 * 60_000) { nudged = true; ui?.note(t('Bir süredir konuşuyoruz. Biraz ara verip bir arkadaşına ya da ailene yazmaya ne dersin?')); }
  }

  async function send(text, img) {
    text = (text || '').trim();
    if ((!text && !img) || busy) return;
    const crisis = CRISIS.test(text);
    let cap = '';
    if (img) {
      ui?.status(t('Fotoğrafa bakıyor…'));
      try { cap = await describe(img, (k) => ui?.status(t('Fotoğrafa bakıyor…') + ` ${Math.round(k * 100)}%`)); }
      catch (e) { console.warn('görüntü', e); toast(t('Fotoğraf anlaşılamadı.')); }
      ui?.status('');
    }
    const m = { r: 'u', c: text, at: Date.now() };
    if (img) { m.img = await compressImage(img, 160, 0.7); if (cap) m.cap = cap; }
    st.msgs.push(m);
    ui?.add(m);
    save();
    // Kriz: küçük modelin cevabına güvenilmez; sabit, özenli cevap ve yardım hatları
    if (crisis) {
      ui?.crisis();
      const a = { r: 'a', c: t('Bunu benimle paylaştığın için teşekkür ederim. Şu an güvende olman her şeyden önemli: lütfen hemen güvendiğin birine ya da yukarıdaki yardım hatlarından birine ulaş. Ben bir yapay zekâyım; gerçek bir insanın desteğinin yerini tutamam.'), at: Date.now() };
      st.msgs.push(a); ui?.add(a); save();
      if (st.voice) speak(a.c);
      return;
    }
    if (!engine) {
      if (dl.state === 'run' || dl.state === 'idle') ui?.note(t('İndirme bitince cevap vereceğim.'));
      try { await ensureEngine(); } catch (e) { return fail(e); }
    }
    await reply(text, cap);
  }
  function fail(e) {
    console.warn('yapay partner yüklenemedi', e);
    toast(t(gpuOk() ? 'Model yüklenemedi. İnternetini ve boş alanını kontrol edip tekrar dene.' : 'Bu cihaz telefonda çalışan yapay zekâyı desteklemiyor (WebGPU gerekli).'), 6000);
  }

  // ---------- Ses ----------
  function speak(text) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = locale;
      const v = speechSynthesis.getVoices().find((x) => x.lang?.toLowerCase().startsWith(lang));
      if (v) u.voice = v;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch { /* desteklenmiyor */ }
  }
  function listen(onText, onEnd) {
    const r = new SR();
    r.lang = locale; r.interimResults = false; r.maxAlternatives = 1;
    r.onresult = (e) => onText(e.results[0][0].transcript);
    r.onerror = () => toast(t('Ses anlaşılamadı.'));
    r.onend = onEnd;
    r.start();
    return r;
  }

  // ---------- Odada partner gibi ----------
  // Seni izinden takip eder (yürüdüğün yol duvarlardan geçmez), oturursan yanındaki boş yere oturur,
  // başka odaya geçersen biraz sonra kapıdan gelir.
  const P = { scene: null, x: 0, y: 0, dir: 'down', seat: -1, trail: [], idx: 0, pend: null, arrive: 0 };
  function presence(me) {
    if (!active() || !me || me.scene === 'admin' || me.scene === 'meyhane') return null; // admin odasına gelmez, evde bekler
    const now = performance.now();
    if (!P.scene) { Object.assign(P, { scene: me.scene, x: me.x + 14, y: me.y, trail: [{ x: me.x + 14, y: me.y, scene: me.scene }], idx: 0 }); }
    if (me.scene !== P.scene && P.pend !== me.scene) { P.pend = me.scene; P.arrive = now + 1300; P.seat = -1; }
    if (P.pend && me.scene !== P.pend) P.pend = null;
    if (P.pend && now >= P.arrive) {
      let start = P.trail.length && P.trail[0].scene === P.pend ? P.trail[0] : { x: me.x, y: me.y };
      if (Math.hypot(start.x - me.x, start.y - me.y) < 12) start = { x: me.x + (me.x > 96 ? -14 : 14), y: me.y }; // üstüne değil yanına
      Object.assign(P, { scene: P.pend, x: start.x, y: start.y, pend: null, trail: [{ x: start.x, y: start.y, scene: P.pend }], idx: 0 });
    }
    // İz: yeni odaya girince sıfırlanır
    const last = P.trail[P.trail.length - 1];
    if (!last || last.scene !== me.scene) { P.trail = [{ x: me.x, y: me.y, scene: me.scene }]; P.idx = 0; }
    else if (me.seat < 0 && (!last || Math.hypot(me.x - last.x, me.y - last.y) > 3)) { P.trail.push({ x: me.x, y: me.y, scene: me.scene }); if (P.trail.length > 80) { P.trail.shift(); P.idx = Math.max(0, P.idx - 1); } }
    if (me.scene !== P.scene) return out(false);
    const shown = ctx.game?.partner;
    const cur = shown && shown.scene === P.scene ? shown : P;
    // Oturduysan yanına otur
    if (me.seat >= 0) {
      if (P.seat < 0 && Math.hypot(cur.x - me.x, cur.y - me.y) < 40) {
        const seats = ctx.game?.seats?.() || [];
        const mine = seats[me.seat];
        let best = -1, bd = Infinity;
        seats.forEach((s, i) => { if (i === me.seat || !mine || s.group !== mine.group) return; const d = Math.hypot(s.x - mine.x, s.y - mine.y); if (d < bd) { bd = d; best = i; } });
        if (best >= 0) { P.seat = best; P.x = seats[best].x; P.y = seats[best].y; P.dir = seats[best].pose === 'back' ? 'up' : 'down'; }
      }
      if (P.seat >= 0) return out(false);
    } else if (P.seat >= 0) { P.seat = -1; P.trail = [{ x: P.x, y: P.y, scene: P.scene }, { x: me.x, y: me.y, scene: me.scene }]; P.idx = 0; }
    // İzde, seninle arasında ~14 piksel kalacak noktaya kadar yürü
    let want = 0;
    for (let k = P.trail.length - 1; k >= 0; k--) if (Math.hypot(P.trail[k].x - me.x, P.trail[k].y - me.y) >= 14) { want = k; break; }
    P.idx = Math.min(P.idx, P.trail.length - 1);
    const tgt = P.trail[P.idx];
    if (P.idx < want && Math.hypot(cur.x - tgt.x, cur.y - tgt.y) < 2.5) P.idx++;
    const goal = P.trail[P.idx];
    const dx = goal.x - cur.x, dy = goal.y - cur.y, moving = Math.hypot(dx, dy) > 1;
    P.x = goal.x; P.y = goal.y;
    P.dir = moving ? (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')) : (Math.abs(me.x - cur.x) > Math.abs(me.y - cur.y) ? (me.x > cur.x ? 'right' : 'left') : (me.y > cur.y ? 'down' : 'up'));
    return out(moving);
  }
  function out(moving) {
    return { ai: true, scene: P.scene, x: P.x, y: P.y, dir: P.dir, moving, seat: P.seat, look: LOOKS[st.body] || LOOKS.f, side: ctx.mySide() === 'moon' ? 'sun' : 'moon', name: st.name };
  }
  /** Sarılınca/öpünce küçük bir karşılık */
  function touched(kind) {
    const lines = kind === 'hug' ? ['Sarılmana bayılıyorum', 'Bırakma beni', 'Böyle çok iyi'] : ['Utandım şimdi', 'Bir daha', 'Seni çok seviyorum'];
    setTimeout(() => bubble(t(lines[Math.floor(Math.random() * lines.length)])), 900);
  }

  // ---------- Pencereler ----------
  function open() {
    if (!st?.name) return openSetup();
    openChat();
  }

  function openSetup() {
    const b = openSheet({ title: 'Yapay partner', iconName: 'spark' });
    const draft = { name: st?.name || (lang === 'tr' ? 'Deniz' : 'Sky'), body: st?.body || 'f', tone: st?.tone || 'warm', model: st?.model || 'smart' };
    const prev = h('canvas', { width: 48, height: 48, class: 'aiprev' });
    const paint = () => {
      const c = prev.getContext('2d'); c.imageSmoothingEnabled = false; c.clearRect(0, 0, 48, 48);
      const img = characterSprites(LOOKS[draft.body]).down; c.drawImage(img, Math.round(24 - img.width / 2), 47 - img.height);
    };
    const chips = (items, key) => h('div', { class: 'aichips' }, ...Object.entries(items).map(([k, label]) => {
      const el = h('button', { class: draft[key] === k ? 'on' : '', onclick: () => { draft[key] = k; el.parentNode.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === el)); paint(); } }, label);
      return el;
    }));
    const name = h('input', { value: draft.name, maxLength: 20, placeholder: 'Adı' });
    b.append(
      h('div', { class: 'aiintro' }, prev, h('p', {}, 'Evde seninle yaşayan, odadan odaya peşinden gelen, yanına oturup sarılan, oyun oynayan bir partner. Seninle konuştukça seni tanır ve sana göre şekillenir.')),
      h('p', { class: 'small' }, 'Tamamen ücretsiz ve cihazında çalışır; konuşmalarınız hiçbir sunucuya gitmez. Konuşabilmesi için model ilk seferde bir kez indirilir (Wi-Fi önerilir).'),
      h('label', { class: 'ailbl' }, 'Adı'), name,
      h('label', { class: 'ailbl' }, 'Görünüşü'), chips({ f: 'Kız', m: 'Erkek' }, 'body'),
      h('label', { class: 'ailbl' }, 'Başlangıç karakteri'), chips(TONES, 'tone'),
      h('small', { class: 'small' }, 'Zamanla senin konuşma tarzına uyum sağlar.'),
      h('label', { class: 'ailbl' }, 'Model'),
      chips({ light: t('Hafif ({size})', { size: gb(MODELS.light.gb) }), smart: t('Akıllı ({size})', { size: gb(MODELS.smart.gb) }), best: t('En akıllı ({size})', { size: gb(MODELS.best.gb) }) }, 'model'),
      h('small', { class: 'small' }, 'Hafif model eski telefonlarda daha hızlı çalışır, daha az akıllıdır.'),
      h('small', { class: 'small' }, 'En akıllı model en doğal konuşandır; güçlü bilgisayar ve telefonlar içindir.'),
      !gpuOk() ? h('p', { class: 'aiwarn' }, window.LoveRoomApp ? 'Bu cihaz/uygulama telefonda çalışan yapay zekâyı desteklemiyor. Siteyi Chrome ile açıp orada deneyebilirsin.' : 'Bu tarayıcı telefonda çalışan yapay zekâyı desteklemiyor (WebGPU gerekli). Güncel Chrome ya da Edge ile dene.') : null,
      h('button', { class: 'primary', onclick: () => {
        const prevModel = st?.model;
        st = { ...(st || { msgs: [], profile: { facts: [], style: '' }, voice: false }), name: name.value.trim().slice(0, 20) || draft.name, body: draft.body, tone: draft.tone, model: draft.model, on: true };
        if (prevModel && prevModel !== st.model) { engine?.unload?.(); engine = null; loading = null; dl.state = 'idle'; }
        save();
        if (gpuOk()) startDownload();
        openChat();
      } }, st?.name ? 'Kaydet' : 'Başlat'),
    );
    paint();
  }

  function openChat() {
    if (!sessionStart) sessionStart = Date.now();
    let rec = null;
    const unsub = () => onDl.delete(drawDl);
    const b = openSheet({ title: st.name, iconName: 'spark', onClose: () => { ui = null; rec?.stop(); unsub(); } });
    const list = h('div', { class: 'chatlist ailist' });
    const stat = h('div', { class: 'aistat', hidden: true });
    const bar = h('i'), dlText = h('span'), dlBox = h('div', { class: 'aidl', hidden: true }, h('div', { class: 'aibar' }, bar), dlText);
    const input = h('input', { placeholder: 'Bir şey yaz…', maxLength: 600, enterKeyHint: 'send' });
    const go = () => { const v = input.value; input.value = ''; send(v); };
    input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
    const mic = SR ? h('button', { class: 'ghost', title: 'Sesli mesaj', html: icon('mic'), onclick: () => {
      if (rec) { rec.stop(); return; }
      mic.classList.add('on');
      rec = listen((txt) => send(txt), () => { rec = null; mic.classList.remove('on'); });
    } }) : null;
    const photo = h('button', { class: 'ghost', title: 'Fotoğraf gönder', html: icon('upload'), onclick: async () => {
      const f = await pickImage(); if (!f) return;
      const d = await compressImage(f, 512, 0.85); send(input.value, d); input.value = '';
    } });
    const voiceBtn = h('button', { class: `ghost${st.voice ? ' on' : ''}`, title: 'Sesli yanıt', html: icon('sound'), onclick: () => {
      st.voice = !st.voice; save(); voiceBtn.classList.toggle('on', st.voice); if (!st.voice) speechSynthesis?.cancel(); toast(t(st.voice ? 'Sesli yanıt açık' : 'Sesli yanıt kapalı'));
    } });
    const more = h('button', { class: 'ghost', title: 'Ayarlar', html: icon('menu'), onclick: openSettings });
    b.append(
      dlBox, list, stat,
      h('div', { class: 'chatform aiform' }, photo, mic, input, h('button', { class: 'primary', title: 'Gönder', html: icon('send'), onclick: go })),
      h('div', { class: 'aitools' }, voiceBtn, more),
    );
    const mb = (n) => Math.round(n / 1e6).toLocaleString(locale);
    function drawDl() {
      dlBox.hidden = dl.state === 'done' || dl.state === 'idle';
      if (dlBox.hidden) return;
      if (dl.state === 'load') {
        bar.style.width = `${(dl.load * 100).toFixed(1)}%`;
        dlText.textContent = t('Hazırlanıyor… %{n}', { n: Math.floor(dl.load * 100) });
        return;
      }
      const k = dl.total ? dl.got / dl.total : 0;
      bar.style.width = `${(k * 100).toFixed(1)}%`;
      if (dl.state === 'error') {
        dlText.textContent = t('İndirme durdu. İnternetini kontrol et.') + ' ';
        dlText.append(h('button', { class: 'link', onclick: () => { dl.state = 'idle'; startDownload(); } }, 'Tekrar dene'));
        return;
      }
      const left = dl.rate > 1000 ? Math.ceil((dl.total - dl.got) / dl.rate / 60) : 0;
      dlText.textContent = !dl.total ? t('İndirme başlıyor…')
        : `${t('İndiriliyor: {got} / {total} MB', { got: mb(dl.got), total: mb(dl.total) })} · %${Math.floor(k * 100)}`
          + (dl.retry ? ` · ${t('Bağlantı koptu, yeniden deneniyor…')}` : left ? ` · ${t('yaklaşık {m} dk kaldı', { m: left })}` : '');
    }
    onDl.add(drawDl); drawDl();
    const fmt = (ms) => new Date(ms).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    ui = {
      add(m, live) {
        const p = h('p');
        p.textContent = m.c || (live ? '…' : '');
        const el = h('div', { class: `msg ${m.r === 'u' ? 'me' : 'them'}` }, m.img ? h('img', { src: m.img, class: 'aiimg', alt: '' }) : null, m.c || live ? p : null, h('small', {}, fmt(m.at)));
        list.append(el); ui.scroll();
        return p;
      },
      note(txt) { list.append(h('div', { class: 'ainote' }, txt)); ui.scroll(); },
      crisis() {
        list.append(h('div', { class: 'ainote crisis', html: `${t('Yalnız değilsin. Kendine zarar verme düşüncen varsa hemen yerel acil numarayı ara (Türkiye’de 112) ya da ülkendeki ücretsiz destek hatları için:')} <a href="https://findahelpline.com" target="_blank" rel="noopener">findahelpline.com</a>` }));
        ui.scroll();
      },
      status(txt) { stat.hidden = !txt; stat.textContent = txt; },
      scroll() { list.scrollTop = list.scrollHeight; },
    };
    if (!st.msgs.length) ui.note(t('Merhaba de, tanışalım. Sana nasıl hitap etmemi istersin?'));
    st.msgs.forEach((m) => ui.add(m));
    if (!gpuOk()) ui.note(t('Bu tarayıcı telefonda çalışan yapay zekâyı desteklemiyor (WebGPU gerekli). Güncel Chrome ya da Edge ile dene.'));
    else if (dl.state !== 'error') startDownload(); // indirir ya da önbellekten yükler; ilk mesaj beklemesin
    setTimeout(() => input.focus(), 50);
  }

  function openSettings() {
    const b = openSheet({ title: 'Yapay partner', iconName: 'spark' });
    const facts = st.profile?.facts || [];
    b.append(
      h('h4', {}, 'Seni nasıl tanıyor'),
      facts.length ? h('ul', { class: 'aifacts' }, ...facts.map((f, i) => h('li', {}, h('span', {}, f), h('button', { class: 'ghost', title: 'Sil', html: icon('trash'), onclick: () => { st.profile.facts.splice(i, 1); save(); openSettings(); } })))) : h('p', { class: 'small' }, 'Henüz bir not yok. Konuştukça seni tanır.'),
      st.profile?.style ? h('p', { class: 'small' }, st.profile.style) : null,
      h('small', { class: 'small' }, 'Notlar İngilizce tutulur ve yalnızca bu cihazda saklanır.'),
      h('div', { class: 'row' },
        h('button', { onclick: () => openChat() }, 'Sohbete dön'),
        h('button', { onclick: openSetup }, 'Karakteri düzenle')),
      h('div', { class: 'row' },
        h('button', { onclick: () => download('data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(st, null, 1)), 'yapay-partner.json') }, 'Sohbeti dışa aktar'),
        h('button', { class: 'danger', onclick: () => {
          if (!confirm(t('Yapay partner, sohbet ve notlar bu cihazdan silinsin mi?'))) return;
          st = null; try { localStorage.removeItem(KEY); } catch { /* */ }
          engine?.unload?.(); engine = null; loading = null; P.scene = null; closeSheet(); toast(t('Silindi'));
        } }, 'Her şeyi sil')),
    );
  }

  return { open, active, presence, touched, name: () => st?.name || '' };
}
