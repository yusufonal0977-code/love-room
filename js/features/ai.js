// Yapay partner: partneri olmayanlara (ya da partneri çevrimdışıyken) eşlik eden yapay zekâ karakteri.
// Tamamen ücretsiz ve yerel: dil modeli telefonun/bilgisayarın ekran kartında (WebGPU, WebLLM) çalışır,
// konuşmalar ve kişiyi tanıdıkça tuttuğu notlar yalnızca bu cihazda (localStorage) durur, hiçbir sunucuya gitmez.
// Sesli mesaj: tarayıcının konuşma tanıması (varsa); sesli yanıt: tarayıcının konuşma sentezi.
// Fotoğraf: küçük bir görüntü tanıma modeli (transformers.js) fotoğrafı cümleyle anlatır, partner ona göre cevap verir.
// Güvenlik: her yerde "yapay zekâ" etiketi, insan olduğunu söylemez, yalnızlığı beslemez, kriz anında yardım hatlarını gösterir.
import { h, icon, openSheet, closeSheet, toast, pickImage, compressImage, download } from '../ui.js';
import { t, lang, locale, LANGS } from '../i18n.js';
import { characterSprites } from '../art.js';

const WEBLLM = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.86/+esm';
const TRANSFORMERS = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/+esm';
const MODELS = {
  smart: { base: 'Qwen3-1.7B', gb: 1 },
  light: { base: 'Qwen3-0.6B', gb: 0.35 },
};
const LOOKS = {
  f: { body: 'f', skin: 1, hair: 'long', hairColor: 2, outfit: 'cardiganBeige', shirt: 0, pants: 1 },
  m: { body: 'm', skin: 2, hair: 'spiky', hairColor: 0, outfit: 'sweater', shirt: 0, pants: 0 },
};
const TONES = { calm: 'Sakin', cheer: 'Neşeli', witty: 'Esprili', warm: 'Romantik', wise: 'Bilge' };
const TONE_EN = { calm: 'calm and gentle', cheer: 'cheerful and energetic', witty: 'witty and playful', warm: 'warm, affectionate and romantic (always respectful, never sexual)', wise: 'thoughtful and wise' };
const gb = (n) => `${n.toLocaleString(locale)} GB`;
const SPOT = { scene: 'salon', x: 126, y: 92 }; // odadaki yeri: salonda, TV'nin önündeki halının üstünde
const MAX_MSGS = 300, CTX_MSGS = 14;
const CRISIS = /intihar|kendimi öldür|ölmek istiyorum|yaşamak istemiyorum|kendime zarar|suicid|kill myself|want to die|self.?harm|hurt myself|suicidio|matarme|selbstmord|umbringen|me tuer|suicídio|me matar|انتحار|自杀|自殺|死にたい|자살|죽고 싶/i;

export function createAi(ctx) {
  const KEY = `lr.ai.${ctx.uid}`;
  let st = load();
  let engine = null, loading = null, busy = false, captioner = null;
  let sayUntil = 0, sayText = '', walkT = 0;
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
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  // ---------- Model ----------
  async function modelId() {
    const ad = await navigator.gpu.requestAdapter();
    if (!ad) throw new Error('nogpu');
    return `${MODELS[st.model || 'smart'].base}-${ad.features.has('shader-f16') ? 'q4f16_1' : 'q4f32_1'}-MLC`;
  }
  function ensureEngine(onProg) {
    if (engine) return Promise.resolve(engine);
    if (loading) return loading;
    loading = (async () => {
      const webllm = await import(WEBLLM);
      const id = await modelId();
      const worker = new Worker(new URL('./ai-worker.js', import.meta.url), { type: 'module' });
      engine = await webllm.CreateWebWorkerMLCEngine(worker, id, { initProgressCallback: (r) => onProg?.(r.progress || 0) });
      return engine;
    })().catch((e) => { loading = null; engine = null; throw e; });
    return loading;
  }

  // ---------- Kişiyi tanıma ----------
  function systemPrompt() {
    const p = st.profile || {};
    const langName = (LANGS.find(([c]) => c === lang) || [, 'English'])[1];
    const hour = new Date().getHours();
    return [
      `Your name is ${st.name}. Your name is always ${st.name}, never any other name. You are a ${st.body === 'm' ? 'male' : 'female'} AI companion character in "Get Love Room", a cozy pixel-art home app.`,
      `You are an AI, not a human. Never claim to be human or to have a body or a real life; if asked, say clearly you are an AI.`,
      `Personality: ${TONE_EN[st.tone] || TONE_EN.calm}. Adapt to the user over time: mirror their tone, formality, humour and message length, and use what you know about them.`,
      `Reply in the same language as the user's last message (default: ${langName}). Use correct, simple, natural grammar.`,
      `Keep replies short: 1 or 2 sentences, like a chat message. Talk about the user, not about yourself. Sometimes ask one gentle question. Never use emojis.`,
      `Boundaries: no sexual or explicit content; no medical, legal or financial advice beyond general support. Care about the user's real life: encourage friends, family, hobbies, sleep and meeting people; never try to make them depend on you or feel guilty for leaving.`,
      `If the user mentions self-harm, suicide or being in danger, respond with care and urge them to contact local emergency services or a crisis line right now.`,
      `Local time for the user: ${hour}:00.`,
      p.facts?.length ? `What you know about the user:\n- ${p.facts.join('\n- ')}` : 'You are just getting to know the user. Be curious about them.',
      p.style ? `How the user likes to talk: ${p.style}` : '',
    ].filter(Boolean).join('\n');
  }
  const clean = (s) => String(s || '').replace(/<think>[\s\S]*?(<\/think>|$)/g, '').replace(new RegExp(`^\\s*${(st?.name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*`, 'i'), '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').trim();

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
  async function reply(userText, caption) {
    busy = true;
    const prompt = [
      { role: 'system', content: systemPrompt() },
      ...st.msgs.slice(-CTX_MSGS - 1, -1).map((m) => ({ role: m.r === 'u' ? 'user' : 'assistant', content: m.cap ? `[Photo: ${m.cap}] ${m.c}` : m.c })),
      { role: 'user', content: `${caption ? `[The user sent a photo. An image recognizer describes it as: "${caption}". You only know this description.] ` : ''}${userText || ''} /no_think` },
    ];
    const msg = { r: 'a', c: '', at: Date.now() };
    st.msgs.push(msg);
    const bubble = ui?.add(msg, true);
    try {
      const chunks = await engine.chat.completions.create({ messages: prompt, stream: true, temperature: 0.7, top_p: 0.9, max_tokens: 200 });
      let raw = '';
      for await (const ch of chunks) {
        raw += ch.choices[0]?.delta?.content || '';
        msg.c = clean(raw);
        if (bubble) { bubble.textContent = msg.c || '…'; ui.scroll(); }
      }
      if (!msg.c) msg.c = '…';
    } catch (e) {
      console.warn('yapay partner', e);
      msg.c = t('Şu an cevap veremedim. Biraz sonra tekrar dener misin?');
      if (bubble) bubble.textContent = msg.c;
    }
    busy = false;
    save();
    sayText = msg.c; sayUntil = performance.now() + 9000;
    if (st.voice) speak(msg.c);
    if (st.msgs.filter((m) => m.r === 'u').length % 5 === 0) setTimeout(learn, 400);
    // Uzun sohbette nazik hatırlatma (bir kez)
    if (!nudged && Date.now() - sessionStart > 45 * 60_000) { nudged = true; ui?.note(t('Bir süredir konuşuyoruz. Biraz ara verip bir arkadaşına ya da ailene yazmaya ne dersin?')); }
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
      ui?.status(t('Hazırlanıyor…'));
      try { await ensureEngine((k) => ui?.status(t('Model yükleniyor: %{n}', { n: Math.round(k * 100) }))); }
      catch (e) { ui?.status(''); return fail(e); }
      ui?.status('');
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
      h('div', { class: 'aiintro' }, prev, h('p', {}, 'Partnerin yoksa ya da şu an uzaktaysa sana eşlik eden bir yapay zekâ. Seninle konuştukça seni tanır ve sana göre şekillenir.')),
      h('ul', { class: 'aisafe' },
        h('li', {}, 'O bir yapay zekâ, gerçek bir insan değil.'),
        h('li', {}, 'Tamamen ücretsiz: telefonunda/bilgisayarında çalışır, konuşmalarınız hiçbir sunucuya gitmez.'),
        h('li', {}, 'İlk açılışta model bir kez indirilir; Wi-Fi önerilir.'),
        h('li', {}, 'Gerçek hayattaki insanların yerini tutmaz; zor bir andaysan bir yakınına ya da yardım hattına ulaş.')),
      h('label', { class: 'ailbl' }, 'Adı'), name,
      h('label', { class: 'ailbl' }, 'Görünüşü'), chips({ f: 'Kız', m: 'Erkek' }, 'body'),
      h('label', { class: 'ailbl' }, 'Başlangıç karakteri'), chips(TONES, 'tone'),
      h('small', { class: 'small' }, 'Zamanla senin konuşma tarzına uyum sağlar.'),
      h('label', { class: 'ailbl' }, 'Model'),
      chips({ smart: t('Akıllı ({size})', { size: gb(MODELS.smart.gb) }), light: t('Hafif ({size})', { size: gb(MODELS.light.gb) }) }, 'model'),
      h('small', { class: 'small' }, 'Hafif model eski telefonlarda daha hızlı çalışır, daha az akıllıdır.'),
      !gpuOk() ? h('p', { class: 'aiwarn' }, window.LoveRoomApp ? 'Bu cihaz/uygulama telefonda çalışan yapay zekâyı desteklemiyor. Siteyi Chrome ile açıp orada deneyebilirsin.' : 'Bu tarayıcı telefonda çalışan yapay zekâyı desteklemiyor (WebGPU gerekli). Güncel Chrome ya da Edge ile dene.') : null,
      h('button', { class: 'primary', disabled: !gpuOk(), onclick: () => {
        const prevModel = st?.model;
        st = { ...(st || { msgs: [], profile: { facts: [], style: '' }, voice: false }), name: name.value.trim().slice(0, 20) || draft.name, body: draft.body, tone: draft.tone, model: draft.model, on: true };
        if (prevModel && prevModel !== st.model) { engine?.unload?.(); engine = null; loading = null; }
        save(); openChat();
      } }, st?.name ? 'Kaydet' : 'Başlat'),
    );
    paint();
  }

  function openChat() {
    if (!sessionStart) sessionStart = Date.now();
    const b = openSheet({ title: st.name, iconName: 'spark', onClose: () => { ui = null; rec?.stop(); } });
    let rec = null;
    const list = h('div', { class: 'chatlist ailist' });
    const stat = h('div', { class: 'aistat', hidden: true });
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
      h('div', { class: 'aibadge' }, h('b', {}, 'Yapay zekâ'), ' · ', 'gerçek bir insan değil', ' · ', 'konuşmalar yalnızca bu cihazda'),
      list, stat,
      h('div', { class: 'chatform aiform' }, photo, mic, input, h('button', { class: 'primary', title: 'Gönder', html: icon('send'), onclick: go })),
      h('div', { class: 'aitools' }, voiceBtn, more),
    );
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
    else if (!engine) {
      ui.status(t('Model yükleniyor: %{n}', { n: 0 }));
      ensureEngine((k) => ui?.status(t('Model yükleniyor: %{n}', { n: Math.round(k * 100) }) + (k < 1 ? ` · ${t('İlk seferde bir kez indirilir.')}` : '')))
        .then(() => ui?.status('')).catch((e) => { ui?.status(''); fail(e); });
    }
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
          engine?.unload?.(); engine = null; loading = null; closeSheet(); toast(t('Silindi'));
        } }, 'Her şeyi sil')),
    );
  }

  /** Odada çizilen karakter: partner evde değilken salonda durur; dokununca sohbet açılır. */
  function extras() {
    if (!st?.on || !st.name || ctx.partnerOnline()) return [];
    const say = performance.now() < sayUntil ? sayText : null;
    return [{ id: 'ai', scene: SPOT.scene, x: SPOT.x, y: SPOT.y, t: walkT, dir: 'down', moving: false, look: LOOKS[st.body] || LOOKS.f, name: `${st.name} · ${t('YZ')}`, noBadge: true, say, onTap: open }];
  }

  return { open, extras };
}
