FROM node:22-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-venv yara ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/ide-scanner-venv \
  && /opt/ide-scanner-venv/bin/pip install --no-cache-dir semgrep==1.164.0

WORKDIR /app

COPY ide-scanner ./ide-scanner
COPY ide-scanner-web/package*.json ./ide-scanner-web/

WORKDIR /app/ide-scanner-web
RUN npm ci

COPY ide-scanner-web ./
RUN npm run build

ENV NODE_ENV=production
ENV IDE_SCANNER_ROOT=/app/ide-scanner
ENV IDE_SCANNER_PYTHON=/opt/ide-scanner-venv/bin/python
ENV IDE_SCANNER_REQUIRE_PROVIDERS=semgrep,yara
ENV PATH="/opt/ide-scanner-venv/bin:${PATH}"

EXPOSE 8765

CMD ["npm", "run", "start:lan"]
