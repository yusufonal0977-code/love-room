# Love Room — tek konteyner: web derlemesi + Node sunucusu (API, Socket.IO, web dosyaları).
FROM node:24-slim

WORKDIR /app

# Önce bağımlılıklar (önbellek için ayrı katman)
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY server/package.json server/
COPY app/package.json app/
RUN npm ci --no-audit --no-fund

# Kaynak kod ve web derlemesi
COPY . .
RUN npm run build:web

ENV PORT=4000 \
    DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 4000

CMD ["npm", "run", "start"]
