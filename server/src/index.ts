import { createServer } from 'node:http';
import express from 'express';
import cors from 'cors';
import { CORS_ORIGIN, DEV_LOGIN, GOOGLE_CLIENT_ID, PORT, UPLOADS_DIR } from './env';
import { api } from './http';
import { attachRealtime } from './realtime';

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '100kb' }));
app.use('/api', api);
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d', immutable: true }));
app.get('/', (_req, res) => void res.type('text').send('love-room ok'));

const httpServer = createServer(app);
attachRealtime(httpServer);

// Geliştirmede (tsx watch) önceki süreç portu bırakmadan yeni süreç başlayabiliyor; kısa aralıklarla tekrar dene.
let retries = 0;
httpServer.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code !== 'EADDRINUSE' || retries >= 10) throw err;
  retries++;
  setTimeout(() => httpServer.listen(PORT), 500);
});

httpServer.listen(PORT, () => {
  console.log(`love-room server http://localhost:${PORT}`);
  console.log(`  Google girişi: ${GOOGLE_CLIENT_ID ? 'açık' : 'kapalı (server/.env içine GOOGLE_CLIENT_ID ekleyin)'}`);
  console.log(`  Geliştirme girişi: ${DEV_LOGIN ? 'açık' : 'kapalı'}`);
});
