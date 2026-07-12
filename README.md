# IDE Scanner Web

Public extension intelligence, scanning, reports, rules, metrics, and benchmark UI for the IDE Scanner Python engine.

## Run the complete product locally

Start the scanner service from the sibling `ide-scanner` repository:

```bash
PYTHONPATH=src .venv/bin/python -m ide_scanner.service --host 127.0.0.1 --port 8787
```

Start the website:

```bash
IDE_SCANNER_API_URL=http://127.0.0.1:8787 npm run dev
```

Open `http://127.0.0.1:8765`.

When `IDE_SCANNER_API_URL` is configured, Marketplace requests become durable Python scan jobs and reports use the canonical scanner bundle. Without it, the public Vercel-compatible path runs a deliberately narrower preliminary analyzer and labels the missing providers in coverage.

Optional shared authorization:

```bash
IDE_SCANNER_API_TOKEN=replace-with-a-random-token
```

Set the same token on the website and scanner service.

## Verification

```bash
npm run lint
npx tsc --noEmit
npm run build
```
