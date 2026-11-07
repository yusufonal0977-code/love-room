// Yapay partnerin dil modeli ayrı bir iş parçacığında çalışır; sayfa (oda, animasyonlar) takılmaz.
// Model telefonun/bilgisayarın ekran kartında (WebGPU) çalışır; konuşmalar hiçbir sunucuya gitmez.
import { WebWorkerMLCEngineHandler } from 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.86/+esm';

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (m) => handler.onmessage(m);
