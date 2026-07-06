FROM node:22-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY ide-scanner ./ide-scanner
COPY ide-scanner-web/package*.json ./ide-scanner-web/

WORKDIR /app/ide-scanner-web
RUN npm ci

COPY ide-scanner-web ./
RUN npm run build

ENV NODE_ENV=production
ENV IDE_SCANNER_ROOT=/app/ide-scanner
ENV IDE_SCANNER_PYTHON=python3

EXPOSE 8765

CMD ["npm", "run", "start:lan"]
