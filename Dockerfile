FROM node:26.13.1-bookworm-slim

WORKDIR /app

# Сначала копируем только манифесты: слой с зависимостями переиспользуется,
# когда меняется код приложения.
COPY package.json package-lock.json ./
COPY contract/package.json ./contract/
COPY server/package.json ./server/
COPY web/package.json ./web/
RUN npm ci

# Исходники и продакшен-сборка фронтенда (результат — web/dist, который раздаёт сервер).
COPY contract/ ./contract/
COPY server/ ./server/
COPY web/ ./web/
RUN npm run build -w web

ENV PORT=3000
EXPOSE 3000

# Node 26 запускает TypeScript напрямую, отдельной компиляции сервера не нужно.
CMD ["node", "server/src/index.ts"]
