// Yapay partnerin dil modeli ayrı bir iş parçacığında çalışır; sayfa (oda, animasyonlar) takılmaz.
// Model telefonun/bilgisayarın ekran kartında (WebGPU) çalışır; konuşmalar hiçbir sunucuya gitmez.
import { WebWorkerMLCEngineHandler } from 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.86/+esm';

// WebLLM model parçalarını önbelleğe Cache.add ile indirir. Onu sarıyoruz:
// - inen her baytı sayfaya bildiririz (akıcı ilerleme çubuğu),
// - bağlantı koparsa parça birkaç kez yeniden denenir (indirme yarıda kalmaz).
// Kaydetme işi yine tarayıcının kendi yanıtıyla yapılır, WebLLM önbelleği her zamanki gibi okur.
const ch = new BroadcastChannel('lr-ai-dl');
Cache.prototype.add = async function add(req) {
  for (let attempt = 0; ; attempt++) {
    let part = 0;
    try {
      const r = await fetch(req);
      if (!r.ok) throw new Error(`http ${r.status}`);
      const rd = r.clone().body.getReader();
      const count = (async () => {
        for (;;) {
          const { value, done } = await rd.read();
          if (done) break;
          part += value.length; ch.postMessage({ d: value.length });
        }
      })();
      await Promise.all([this.put(req, r), count]);
      return;
    } catch (e) {
      ch.postMessage({ d: -part, retry: true });
      if (attempt >= 6) throw e;
      await new Promise((res) => setTimeout(res, Math.min(15000, 1500 * 2 ** attempt)));
    }
  }
};

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (m) => handler.onmessage(m);
